/**
 * Background Script 主入口文件
 *
 * 【架构位置】
 * 这是浏览器扩展的 Background Script，是整个钱包扩展的核心协调者。
 * 它运行在独立的 Service Worker 上下文中，即使所有页面关闭也会保持运行。
 *
 * 【核心职责】
 * 1. 接收并路由所有来自 Content Script 的 EIP-1193 RPC 请求
 * 2. 管理所有待处理的用户确认请求（授权、签名、交易等）
 * 3. 协调 Popup UI 的显示和路由
 * 4. 处理钱包状态管理（通过 chrome.storage.local）
 * 5. 提供钱包操作的后端支持（助记词生成、密码管理等）
 *
 * 【消息流】
 * 页面 → Content Script → Background Script → Popup UI → Background Script → Content Script → 页面
 *
 * 【关键设计】
 * - 使用 Map 存储待处理的请求，以 requestId 为键
 * - 所有敏感操作都需要用户确认，通过 Popup UI 展示
 * - 使用 Promise 模式处理异步的用户确认流程
 */

import { EthereumRpcMethod, ProviderErrorCode } from '@/types/eip1193';
import type { ProviderRpcError } from '@/types/eip1193';
import { Buffer } from 'buffer';
import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import { browser } from 'wxt/browser';

// 在全局作用域提供 Buffer polyfill
// 原因：浏览器环境默认没有 Node.js 的 Buffer，但 bip39 等库需要它
if (typeof globalThis.Buffer === 'undefined') {
	globalThis.Buffer = Buffer;
}

// 导入类型和工具
import type {
	PendingAuthRequest,
	PendingSignRequest,
	PendingSwitchChainRequest,
	PendingTransactionRequest,
	PendingAddChainRequest,
	PendingWatchAssetRequest,
	RequestContext,
} from './background/types';
import {
	getWalletState,
	getWalletAccounts,
	getProvider,
	getUnlockedWallet,
} from './background/utils';
import { requestUserAuth } from './background/auth';
import { openPopup } from './background/popup';
import { handleEIP1193Request } from './background/router';
import { handleSignRequestApprove } from './background/sign-handler';
import { handleTransactionRequestApprove } from './background/transaction-handler';
import { handleSwitchChainRequestApprove } from './background/switch-chain-handler';
import {
	handleAddChainRequestApprove,
	handleAddChainRequestReject,
} from './background/handlers/add-chain-handler';
import {
	handleWatchAssetRequestApprove,
	handleWatchAssetRequestReject,
} from './background/handlers/watch-asset-handler';

export default defineBackground(() => {
	console.log('Hello background!', { id: browser.runtime.id });

	/**
	 * 【Popup 路由管理】
	 * 跟踪当前 Popup 应该显示哪个页面。
	 * 当 DApp 发起需要用户确认的操作时，Background 会设置路由并打开 Popup。
	 * Popup 通过 POPUP_GET_ROUTE 消息获取当前路由。
	 */
	let currentPopupRoute: string | null = null;

	/**
	 * 【请求管理 - 核心数据结构】
	 *
	 * 使用 Map 存储所有待处理的用户确认请求。
	 * 每个请求包含：
	 * - requestId: 唯一标识符
	 * - origin: 请求来源（DApp 域名）
	 * - resolve/reject: Promise 的解决/拒绝函数
	 * - timestamp: 创建时间（用于超时处理）
	 *
	 * 工作流程：
	 * 1. DApp 调用 RPC 方法（如 eth_requestAccounts）
	 * 2. Background 创建请求并存储到对应的 Map
	 * 3. 打开 Popup 并设置路由到确认页面
	 * 4. 用户批准/拒绝后，调用 resolve/reject
	 * 5. 从 Map 中删除请求
	 */
	const pendingAuthRequests = new Map<string, PendingAuthRequest>(); // 账户授权请求
	const pendingSignRequests = new Map<string, PendingSignRequest>(); // 签名请求
	const pendingSwitchChainRequests = new Map<string, PendingSwitchChainRequest>(); // 网络切换请求
	const pendingTransactionRequests = new Map<string, PendingTransactionRequest>(); // 交易请求
	const pendingAddChainRequests = new Map<string, PendingAddChainRequest>(); // 添加网络请求
	const pendingWatchAssetRequests = new Map<string, PendingWatchAssetRequest>(); // 添加代币请求

	/**
	 * 【请求上下文 (RequestContext)】
	 *
	 * 这是一个共享的上下文对象，传递给所有 RPC 方法处理器。
	 * 它提供了：
	 * - 钱包状态访问方法（getWalletState, getWalletAccounts）
	 * - Provider 和 Wallet 实例获取（getProvider, getUnlockedWallet）
	 * - 用户授权流程（requestUserAuth）
	 * - Popup 管理（openPopup, currentPopupRoute）
	 * - 所有待处理请求的 Map（用于创建新请求）
	 *
	 * 设计目的：避免在处理器之间传递大量参数，提供统一的接口。
	 */
	const requestContext: RequestContext = {
		getWalletState,
		getWalletAccounts,
		getProvider,
		getUnlockedWallet,
		requestUserAuth: (origin: string) =>
			requestUserAuth(origin, pendingAuthRequests, openPopup, (route) => {
				currentPopupRoute = route;
			}),
		openPopup,
		get currentPopupRoute() {
			return currentPopupRoute;
		},
		setCurrentPopupRoute: (route: string) => {
			currentPopupRoute = route;
		},
		pendingAuthRequests,
		pendingSignRequests,
		pendingSwitchChainRequests,
		pendingTransactionRequests,
		pendingAddChainRequests,
		pendingWatchAssetRequests,
	};

	/**
	 * 【消息监听器 - 核心消息路由】
	 *
	 * 这是 Background Script 的消息总入口，处理所有来自其他扩展组件（Content Script、Popup）的消息。
	 *
	 * 消息类型分类：
	 * 1. EIP1193_REQUEST: DApp 的 RPC 请求（通过 Content Script 转发）
	 * 2. POPUP_*: Popup 路由管理
	 * 3. AUTH_REQUEST_*: 账户授权确认
	 * 4. SIGN_REQUEST_*: 签名确认
	 * 5. SWITCH_CHAIN_REQUEST_*: 网络切换确认
	 * 6. TRANSACTION_REQUEST_*: 交易确认
	 * 7. ADD_CHAIN_REQUEST_*: 添加网络确认
	 * 8. WATCH_ASSET_REQUEST_*: 添加代币确认
	 * 9. MNEMONIC_*: 助记词管理（仅用于 Popup）
	 * 10. WALLET_*: 钱包密码管理（仅用于 Popup）
	 *
	 * 注意：返回 true 表示异步响应，保持消息通道开放。
	 */
	browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (!message?.type) return;

		// Popup 路由管理
		if (message.type === 'POPUP_GET_ROUTE') {
			sendResponse({ route: currentPopupRoute || 'main' });
			return true;
		}

		if (message.type === 'POPUP_SET_ROUTE') {
			const newRoute = message.route;
			if (newRoute && newRoute !== currentPopupRoute) {
				currentPopupRoute = newRoute;
				// 通知所有 popup 实例路由已更改
				browser.runtime
					.sendMessage({
						type: 'POPUP_ROUTE_CHANGED',
						route: newRoute,
					})
					.catch(() => {
						// 如果没有监听器，忽略错误
					});
			}
			sendResponse({ success: true });
			return true;
		}

		/**
		 * 【EIP-1193 RPC 请求处理】
		 *
		 * 这是所有 DApp 交互的入口点。
		 *
		 * 处理流程：
		 * 1. Content Script 接收到页面的 RPC 请求
		 * 2. Content Script 转发到 Background（EIP1193_REQUEST）
		 * 3. Background 路由到对应的处理器（router.ts）
		 * 4. 处理器可能需要用户确认（打开 Popup）
		 * 5. 返回结果给 Content Script
		 * 6. Content Script 通过 postMessage 返回给页面
		 *
		 * 错误处理：所有错误都会被包装为 ProviderRpcError，符合 EIP-1193 标准。
		 */
		if (message.type === 'EIP1193_REQUEST') {
			console.log('[Background] Received EIP1193_REQUEST:', message.method, message.params);
			requestContext.sender = sender as any; // 保存发送者信息，用于获取 origin
			handleEIP1193Request(message.method, message.params, requestContext)
				.then((result) => {
					console.log('[Background] EIP1193_REQUEST success:', message.method, result);
					sendResponse({ success: true, result });
				})
				.catch((error: ProviderRpcError) => {
					console.error('[Background] EIP1193_REQUEST error:', message.method, error);
					sendResponse({
						success: false,
						error: {
							message: error.message,
							code: error.code || ProviderErrorCode.UNSUPPORTED_METHOD,
							data: error.data,
						},
					});
				});
			return true; // 保持消息通道开放以支持异步响应
		}

		// 处理授权请求相关消息
		if (message.type === 'AUTH_REQUEST_GET') {
			// 获取待处理的授权请求
			const requests = Array.from(pendingAuthRequests.values()).map((req) => ({
				requestId: req.requestId,
				origin: req.origin,
				timestamp: req.timestamp,
			}));
			sendResponse({ requests });
			return true;
		}

		if (message.type === 'AUTH_REQUEST_APPROVE') {
			// 用户批准授权请求
			const { requestId, accounts } = message;
			const request = pendingAuthRequests.get(requestId);
			if (request) {
				request.resolve(accounts);
				pendingAuthRequests.delete(requestId);
			}
			sendResponse({ success: true });
			return true;
		}

		if (message.type === 'AUTH_REQUEST_REJECT') {
			// 用户拒绝授权请求
			const { requestId } = message;
			const request = pendingAuthRequests.get(requestId);
			if (request) {
				const error: ProviderRpcError = {
					name: 'ProviderError',
					message: 'User rejected the request.',
					code: ProviderErrorCode.USER_REJECTED_REQUEST,
				};
				request.reject(error);
				pendingAuthRequests.delete(requestId);
			}
			sendResponse({ success: true });
			return true;
		}

		// 处理签名请求相关消息
		if (message.type === 'SIGN_REQUEST_GET') {
			// 获取待处理的签名请求
			const requests = Array.from(pendingSignRequests.values()).map((req) => ({
				requestId: req.requestId,
				origin: req.origin,
				method: req.method,
				address: req.address,
				message: req.message,
				typedData: req.typedData,
				timestamp: req.timestamp,
			}));
			sendResponse({ requests });
			return true;
		}

		if (message.type === 'SIGN_REQUEST_APPROVE') {
			// 用户批准签名请求
			const { requestId } = message;
			handleSignRequestApprove(requestId, pendingSignRequests);
			sendResponse({ success: true });
			return true;
		}

		if (message.type === 'SIGN_REQUEST_REJECT') {
			// 用户拒绝签名请求
			const { requestId } = message;
			const request = pendingSignRequests.get(requestId);
			if (request) {
				const error: ProviderRpcError = {
					name: 'ProviderError',
					message: 'User rejected the request.',
					code: ProviderErrorCode.USER_REJECTED_REQUEST,
				};
				request.reject(error);
				pendingSignRequests.delete(requestId);
			}
			sendResponse({ success: true });
			return true;
		}

		// 处理切换网络请求相关消息
		if (message.type === 'SWITCH_CHAIN_REQUEST_GET') {
			// 获取待处理的切换网络请求
			const requests = Array.from(pendingSwitchChainRequests.values()).map((req) => ({
				requestId: req.requestId,
				origin: req.origin,
				chainId: req.chainId,
				targetNetwork: req.targetNetwork,
				timestamp: req.timestamp,
			}));
			sendResponse({ requests });
			return true;
		}

		if (message.type === 'SWITCH_CHAIN_REQUEST_APPROVE') {
			// 用户批准切换网络请求
			const { requestId } = message;
			handleSwitchChainRequestApprove(requestId, pendingSwitchChainRequests);
			sendResponse({ success: true });
			return true;
		}

		if (message.type === 'SWITCH_CHAIN_REQUEST_REJECT') {
			// 用户拒绝切换网络请求
			const { requestId } = message;
			const request = pendingSwitchChainRequests.get(requestId);
			if (request) {
				const error: ProviderRpcError = {
					name: 'ProviderError',
					message: 'User rejected the request.',
					code: ProviderErrorCode.USER_REJECTED_REQUEST,
				};
				request.reject(error);
				pendingSwitchChainRequests.delete(requestId);
			}
			sendResponse({ success: true });
			return true;
		}

		// 处理交易请求相关消息
		if (message.type === 'TRANSACTION_REQUEST_GET') {
			// 获取待处理的交易请求
			const requests = Array.from(pendingTransactionRequests.values()).map((req) => {
				const tx = req.transaction as any; // 使用 any 来访问可能存在的字段
				// 序列化交易数据，确保 BigNumber 等类型转换为字符串
				const serializedTx: any = {
					from: tx.from,
					to: tx.to,
					value: tx.value
						? typeof tx.value === 'bigint'
							? '0x' + tx.value.toString(16)
							: typeof tx.value === 'string'
								? tx.value
								: String(tx.value)
						: undefined,
					data: tx.data,
					gas: tx.gas
						? typeof tx.gas === 'bigint'
							? '0x' + tx.gas.toString(16)
							: typeof tx.gas === 'string'
								? tx.gas
								: String(tx.gas)
						: undefined,
					gasPrice: tx.gasPrice
						? typeof tx.gasPrice === 'bigint'
							? '0x' + tx.gasPrice.toString(16)
							: typeof tx.gasPrice === 'string'
								? tx.gasPrice
								: String(tx.gasPrice)
						: undefined,
					maxFeePerGas: tx.maxFeePerGas
						? typeof tx.maxFeePerGas === 'bigint'
							? '0x' + tx.maxFeePerGas.toString(16)
							: typeof tx.maxFeePerGas === 'string'
								? tx.maxFeePerGas
								: String(tx.maxFeePerGas)
						: undefined,
					maxPriorityFeePerGas: tx.maxPriorityFeePerGas
						? typeof tx.maxPriorityFeePerGas === 'bigint'
							? '0x' + tx.maxPriorityFeePerGas.toString(16)
							: typeof tx.maxPriorityFeePerGas === 'string'
								? tx.maxPriorityFeePerGas
								: String(tx.maxPriorityFeePerGas)
						: undefined,
					nonce:
						tx.nonce !== undefined && tx.nonce !== null
							? typeof tx.nonce === 'number'
								? tx.nonce.toString()
								: String(tx.nonce)
							: undefined,
					chainId:
						tx.chainId !== undefined && tx.chainId !== null
							? typeof tx.chainId === 'number'
								? '0x' + tx.chainId.toString(16)
								: typeof tx.chainId === 'string'
									? tx.chainId
									: String(tx.chainId)
							: undefined,
				};
				return {
					requestId: req.requestId,
					origin: req.origin,
					method: req.method,
					transaction: serializedTx,
					timestamp: req.timestamp,
				};
			});
			sendResponse({ requests });
			return true;
		}

		if (message.type === 'TRANSACTION_REQUEST_APPROVE') {
			// 用户批准交易请求
			const { requestId } = message;
			handleTransactionRequestApprove(requestId, pendingTransactionRequests);
			sendResponse({ success: true });
			return true;
		}

		if (message.type === 'TRANSACTION_REQUEST_REJECT') {
			// 用户拒绝交易请求
			const { requestId } = message;
			const request = pendingTransactionRequests.get(requestId);
			if (request) {
				const error: ProviderRpcError = {
					name: 'ProviderError',
					message: 'User rejected the request.',
					code: ProviderErrorCode.USER_REJECTED_REQUEST,
				};
				request.reject(error);
				pendingTransactionRequests.delete(requestId);
			}
			sendResponse({ success: true });
			return true;
		}

		// 添加网络请求
		if (message.type === 'ADD_CHAIN_REQUEST_GET') {
			// 获取待处理的添加网络请求
			const requests = Array.from(pendingAddChainRequests.values());
			sendResponse({ requests });
			return true;
		}

		if (message.type === 'ADD_CHAIN_REQUEST_APPROVE') {
			// 用户批准添加网络请求
			const { requestId } = message;
			(async () => {
				try {
					const request = pendingAddChainRequests.get(requestId);
					if (!request) {
						sendResponse({ success: false, error: 'Request not found' });
						return;
					}

					// 执行添加网络逻辑
					const chainParams = request.chainParams;
					const chainId = parseInt(chainParams.chainId, 16);

					const state = await getWalletState();
					if (!state) {
						throw new Error('Wallet not initialized');
					}

					// 创建新网络配置
					const newNetwork: import('@/types/wallet').Network = {
						id: `custom-${chainId}`,
						name: chainParams.chainName,
						rpcUrl: chainParams.rpcUrls[0],
						chainId: chainId,
						currencySymbol: chainParams.nativeCurrency.symbol,
						blockExplorerUrl: chainParams.blockExplorerUrls?.[0],
					};

					// 更新钱包状态
					const storage = browser.storage.local;
					const result = await storage.get('wallet-store');
					const walletStore = result['wallet-store'] as
						import('./background/types').WalletStoreData | undefined;

					if (walletStore?.state) {
						walletStore.state.networks = [...walletStore.state.networks, newNetwork];
						await storage.set({ 'wallet-store': walletStore });
						handleAddChainRequestApprove(requestId, pendingAddChainRequests);
						sendResponse({ success: true });
					} else {
						throw new Error('Failed to add network');
					}
				} catch (error: any) {
					console.error('[Background] Failed to approve add chain request:', error);
					const request = pendingAddChainRequests.get(requestId);
					if (request) {
						const providerError: ProviderRpcError = {
							name: 'ProviderError',
							message: error.message || 'Failed to add network',
							code: ProviderErrorCode.DISCONNECTED,
						};
						request.reject(providerError);
						pendingAddChainRequests.delete(requestId);
					}
					sendResponse({ success: false, error: error.message });
				}
			})();
			return true;
		}

		if (message.type === 'ADD_CHAIN_REQUEST_REJECT') {
			// 用户拒绝添加网络请求
			const { requestId } = message;
			handleAddChainRequestReject(requestId, pendingAddChainRequests);
			sendResponse({ success: true });
			return true;
		}

		// 添加代币请求
		if (message.type === 'WATCH_ASSET_REQUEST_GET') {
			// 获取待处理的添加代币请求
			const requests = Array.from(pendingWatchAssetRequests.values());
			sendResponse({ requests });
			return true;
		}

		if (message.type === 'WATCH_ASSET_REQUEST_APPROVE') {
			// 用户批准添加代币请求
			const { requestId } = message;
			(async () => {
				try {
					const request = pendingWatchAssetRequests.get(requestId);
					if (!request) {
						sendResponse({ success: false, error: 'Request not found' });
						return;
					}

					// 执行添加代币逻辑
					const { address, symbol, decimals, image } = request.assetParams.options;
					const normalizedAddress = ethers.getAddress(address);

					// 如果提供了 symbol 和 decimals，直接使用
					// 否则从链上获取
					let tokenSymbol = symbol;
					let tokenName = symbol || 'Unknown Token';
					let tokenDecimals = decimals ?? 18;

					try {
						const provider = await getProvider();
						if (provider) {
							const ERC20_ABI = [
								'function decimals() view returns (uint8)',
								'function symbol() view returns (string)',
								'function name() view returns (string)',
							];

							const tokenContract = new ethers.Contract(
								normalizedAddress,
								ERC20_ABI,
								provider
							);

							// 并行获取代币信息
							const [decimalsResult, symbolResult, nameResult] = await Promise.all([
								tokenContract.decimals().catch(() => tokenDecimals),
								tokenContract.symbol().catch(() => symbol || 'UNKNOWN'),
								tokenContract.name().catch(() => tokenName),
							]);

							tokenDecimals = Number(decimalsResult);
							tokenSymbol = symbolResult || symbol || 'UNKNOWN';
							tokenName = nameResult || tokenName;
						}
					} catch (error) {
						console.error('[Background] Failed to fetch token info from chain:', error);
						if (!tokenSymbol) {
							tokenSymbol = 'UNKNOWN';
						}
					}

					// 创建新代币
					const newToken: import('@/types/wallet').Token = {
						address: normalizedAddress,
						symbol: tokenSymbol || 'UNKNOWN',
						name: tokenName || 'Unknown Token',
						decimals: tokenDecimals,
						logoURI: image,
					};

					// 更新钱包状态
					const storage = browser.storage.local;
					const result = await storage.get('wallet-store');
					const walletStore = result['wallet-store'] as
						import('./background/types').WalletStoreData | undefined;

					if (walletStore?.state) {
						// 添加新代币到代币列表（如果已存在则更新）
						const existingIndex = walletStore.state.tokens.findIndex(
							(token) =>
								ethers.getAddress(token.address).toLowerCase() ===
								normalizedAddress.toLowerCase()
						);

						if (existingIndex >= 0) {
							// 更新现有代币
							walletStore.state.tokens[existingIndex] = {
								...walletStore.state.tokens[existingIndex],
								...newToken,
								// 保留现有余额
								balance: walletStore.state.tokens[existingIndex].balance,
							};
						} else {
							// 添加新代币
							walletStore.state.tokens = [...walletStore.state.tokens, newToken];
						}

						await storage.set({ 'wallet-store': walletStore });
						handleWatchAssetRequestApprove(requestId, pendingWatchAssetRequests);
						sendResponse({ success: true });
					} else {
						throw new Error('Failed to add token');
					}
				} catch (error: any) {
					console.error('[Background] Failed to approve watch asset request:', error);
					const request = pendingWatchAssetRequests.get(requestId);
					if (request) {
						const providerError: ProviderRpcError = {
							name: 'ProviderError',
							message: error.message || 'Failed to add token',
							code: ProviderErrorCode.DISCONNECTED,
						};
						request.reject(providerError);
						pendingWatchAssetRequests.delete(requestId);
					}
					sendResponse({ success: false, error: error.message });
				}
			})();
			return true;
		}

		if (message.type === 'WATCH_ASSET_REQUEST_REJECT') {
			// 用户拒绝添加代币请求
			const { requestId } = message;
			handleWatchAssetRequestReject(requestId, pendingWatchAssetRequests);
			sendResponse({ success: true });
			return true;
		}

		// 助记词管理
		if (message.type === 'MNEMONIC_GENERATE') {
			(async () => {
				try {
					const words: 12 | 24 = message.words === 24 ? 24 : 12;
					const strength = words === 24 ? 256 : 128;
					const mnemonic = bip39.generateMnemonic(strength);

					const persist = message.persist !== false; // 默认持久化
					if (persist) {
						await browser.storage.local.set({
							mnemonic,
							mnemonicWords: words,
							mnemonicCreatedAt: Date.now(),
						});
					}

					sendResponse({
						success: true,
						result: { mnemonic, words, persisted: persist },
					});
				} catch (e) {
					sendResponse({
						success: false,
						error: { message: e instanceof Error ? e.message : '生成助记词失败' },
					});
				}
			})();
			return true;
		}

		if (message.type === 'MNEMONIC_GET') {
			(async () => {
				try {
					const data = await browser.storage.local.get([
						'mnemonic',
						'mnemonicWords',
						'mnemonicCreatedAt',
					]);
					sendResponse({
						success: true,
						result: {
							mnemonic: (data as any).mnemonic ?? null,
							words: (data as any).mnemonicWords ?? null,
							createdAt: (data as any).mnemonicCreatedAt ?? null,
						},
					});
				} catch (e) {
					sendResponse({
						success: false,
						error: { message: e instanceof Error ? e.message : '读取助记词失败' },
					});
				}
			})();
			return true;
		}

		if (message.type === 'MNEMONIC_CLEAR') {
			(async () => {
				try {
					await browser.storage.local.remove([
						'mnemonic',
						'mnemonicWords',
						'mnemonicCreatedAt',
					]);
					sendResponse({ success: true, result: true });
				} catch (e) {
					sendResponse({
						success: false,
						error: { message: e instanceof Error ? e.message : '清除助记词失败' },
					});
				}
			})();
			return true;
		}

		// 钱包密码管理
		if (message.type === 'WALLET_SET_PASSWORD') {
			(async () => {
				try {
					const password = message.data?.password;
					if (!password) {
						console.error('[Background] WALLET_SET_PASSWORD: Password is empty');
						sendResponse({ error: '密码不能为空' });
						return;
					}
					console.log(
						'[Background] WALLET_SET_PASSWORD: Setting password, length:',
						password.length
					);
					await browser.storage.local.set({ walletPassword: password });
					// 验证密码是否已存储
					const verify = await browser.storage.local.get('walletPassword');
					if (verify.walletPassword === password) {
						console.log(
							'[Background] WALLET_SET_PASSWORD: Password stored successfully'
						);
						sendResponse({ success: true });
					} else {
						console.error(
							'[Background] WALLET_SET_PASSWORD: Password verification failed'
						);
						sendResponse({ error: '密码存储验证失败' });
					}
				} catch (e) {
					console.error('[Background] WALLET_SET_PASSWORD: Error:', e);
					sendResponse({
						error: e instanceof Error ? e.message : '设置密码失败',
					});
				}
			})();
			return true;
		}

		if (message.type === 'WALLET_GET_PASSWORD') {
			(async () => {
				try {
					const result = await browser.storage.local.get('walletPassword');
					const password = result.walletPassword || null;
					console.log(
						'[Background] WALLET_GET_PASSWORD: Password retrieved, hasPassword:',
						!!password,
						'length:',
						password ? (password as string).length : 0
					);
					sendResponse({ password });
				} catch (e) {
					console.error('[Background] WALLET_GET_PASSWORD: Error:', e);
					sendResponse({
						error: e instanceof Error ? e.message : '获取密码失败',
					});
				}
			})();
			return true;
		}

		if (message.type === 'WALLET_CLEAR_PASSWORD') {
			(async () => {
				try {
					await browser.storage.local.remove('walletPassword');
					sendResponse({ success: true });
				} catch (e) {
					sendResponse({
						error: e instanceof Error ? e.message : '清除密码失败',
					});
				}
			})();
			return true;
		}
	});
});
