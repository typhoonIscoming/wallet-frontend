/**
 * Background Script 工具函数
 *
 * 【职责】
 * 提供钱包状态访问、Provider 创建、钱包解锁等通用功能。
 * 这些函数被 RequestContext 使用，供所有 RPC 处理器调用。
 *
 * 【设计原则】
 * - 单一职责：每个函数只做一件事
 * - 错误处理：所有函数都有完善的错误处理和日志
 * - 类型安全：使用 TypeScript 严格类型
 */

import type { WalletState, WalletStoreData } from './types';
import { browser } from 'wxt/browser';
import { ethers } from 'ethers';
import { AES, enc } from 'crypto-js';

/**
 * 从 storage 获取钱包状态
 *
 * 【存储结构】
 * chrome.storage.local['wallet-store'] = {
 *   state: WalletState,
 *   version?: number
 * }
 *
 * 【WalletState 包含】
 * - isLocked: 是否锁定
 * - accounts: 账户列表
 * - currentAccount: 当前账户
 * - networks: 网络列表
 * - currentNetwork: 当前网络
 * - tokens: 代币列表
 * - nftCollections: NFT 集合列表
 * - mnemonic: 加密的助记词
 *
 * @returns Promise<WalletState | null> - 钱包状态，如果不存在或出错则返回 null
 */
export async function getWalletState(): Promise<WalletState | null> {
	try {
		const storage = browser.storage.local;
		const result = await storage.get('wallet-store');
		const walletStore = result['wallet-store'] as WalletStoreData | undefined;
		return walletStore?.state || null;
	} catch (error) {
		console.error('[Background] Failed to get wallet state:', error);
		return null;
	}
}

/**
 * 从 storage 获取钱包账户地址
 *
 * 【用途】
 * 主要用于 eth_accounts 和 eth_requestAccounts 方法。
 *
 * 【返回条件】
 * - 钱包未初始化：返回 []
 * - 钱包已锁定：返回 []
 * - 没有当前账户：返回 []
 * - 正常情况：返回 [currentAccount.address]
 *
 * 【设计说明】
 * 只返回当前账户，符合大多数钱包的行为。
 * 如果需要多账户支持，可以扩展为返回所有账户。
 *
 * @returns Promise<string[]> - 账户地址数组
 */
export async function getWalletAccounts(): Promise<string[]> {
	try {
		const state = await getWalletState();
		if (!state || state.isLocked || !state.currentAccount) {
			return [];
		}
		return [state.currentAccount.address];
	} catch (error) {
		console.error('[Background] Failed to get wallet accounts:', error);
		return [];
	}
}

/**
 * 获取当前网络的 Provider
 *
 * 【用途】
 * Provider 用于与区块链网络交互：
 * - 查询余额（getBalance）
 * - 获取区块信息（getBlock）
 * - 发送交易（sendTransaction）
 * - 调用合约方法
 *
 * 【Provider 类型】
 * ethers.JsonRpcProvider - 通过 JSON-RPC 与节点通信
 *
 * 【RPC URL】
 * 从 currentNetwork.rpcUrl 获取，支持：
 * - 公共 RPC（如 Infura、Alchemy）
 * - 本地节点（如 http://localhost:8545）
 * - 自定义 RPC
 *
 * @returns Promise<ethers.JsonRpcProvider | null> - Provider 实例，如果网络未设置则返回 null
 */
export async function getProvider(): Promise<ethers.JsonRpcProvider | null> {
	try {
		const state = await getWalletState();
		if (!state || !state.currentNetwork) {
			return null;
		}
		return new ethers.JsonRpcProvider(state.currentNetwork.rpcUrl);
	} catch (error) {
		console.error('[Background] Failed to create provider:', error);
		return null;
	}
}

/**
 * 获取已解锁的钱包实例
 *
 * 【用途】
 * Wallet 实例用于签名操作：
 * - 签名消息（signMessage）
 * - 签名交易（signTransaction）
 * - EIP-712 签名（signTypedData）
 *
 * 【安全流程】
 * 1. 检查钱包状态（是否锁定、是否有账户）
 * 2. 从 storage 获取密码
 * 3. 验证密码（通过尝试解密助记词）
 * 4. 解密私钥（使用 AES 解密）
 * 5. 验证私钥格式
 * 6. 创建 Wallet 实例（需要 Provider）
 *
 * 【私钥存储格式】
 * - 加密存储：使用 AES 加密，Base64 编码
 * - 未加密：66 字符（0x + 64 个十六进制字符）
 *
 * 【解密策略】
 * - 优先尝试 UTF-8 解码
 * - 如果失败，尝试 Hex 解码
 * - 验证解密后的格式（必须是有效的私钥）
 *
 * 【错误处理】
 * - 密码错误：返回 null，记录详细日志
 * - 数据损坏：返回 null，记录详细日志
 * - 格式错误：返回 null，记录详细日志
 *
 * @returns Promise<ethers.Wallet | null> - Wallet 实例，如果解锁失败则返回 null
 */
export async function getUnlockedWallet(): Promise<ethers.Wallet | null> {
	try {
		const state = await getWalletState();
		if (!state) {
			console.error('[Background] getUnlockedWallet: No wallet state');
			return null;
		}

		if (state.isLocked) {
			console.error('[Background] getUnlockedWallet: Wallet is locked');
			return null;
		}

		if (!state.currentAccount) {
			console.error('[Background] getUnlockedWallet: No current account');
			return null;
		}

		// 获取密码
		const passwordResult = await browser.storage.local.get('walletPassword');
		const password = passwordResult.walletPassword;
		if (!password) {
			console.error('[Background] getUnlockedWallet: No password in storage');
			return null;
		}

		// 验证密码是否正确（通过尝试解密助记词来验证）
		let passwordValid = false;
		if (state.mnemonic) {
			try {
				const testDecrypt = AES.decrypt(state.mnemonic, password as string);
				const testResult = testDecrypt.toString(enc.Utf8);
				// 如果解密成功且结果看起来像助记词（至少有几个单词）
				if (testResult && testResult.trim().split(/\s+/).length >= 12) {
					passwordValid = true;
				}
			} catch (e) {
				console.warn('[Background] Password validation failed:', e);
			}
		}

		if (!passwordValid && state.mnemonic) {
			console.error(
				'[Background] getUnlockedWallet: Password validation failed - password may be incorrect'
			);
			// 即使密码验证失败，也尝试解密私钥（可能助记词和私钥使用不同的密码）
		}

		// 解密私钥
		try {
			const storedPrivateKey = state.currentAccount.privateKey;
			let privateKey: string | null = null;

			// 检查私钥是否已经是未加密格式（66个字符：0x + 64个十六进制字符）
			// 加密后的私钥应该是Base64编码，长度会远大于66
			if (
				storedPrivateKey.length === 66 &&
				storedPrivateKey.startsWith('0x') &&
				/^0x[a-fA-F0-9]{64}$/.test(storedPrivateKey)
			) {
				// 私钥看起来是未加密的，直接使用
				console.warn('[Background] Private key appears to be unencrypted, using directly');
				privateKey = storedPrivateKey;
			} else {
				// 私钥是加密的，需要解密
				console.log(
					'[Background] Private key appears to be encrypted, attempting decryption...'
				);
				const decryptedBytes = AES.decrypt(storedPrivateKey, password as string);

				// 尝试多种编码方式
				// 首先尝试 UTF-8（最常见的情况）
				try {
					const utf8Result = decryptedBytes.toString(enc.Utf8).trim();
					// 验证是否是有效的私钥格式
					if (
						utf8Result &&
						(utf8Result.startsWith('0x') ||
							/^[0-9a-fA-F]{64}$/.test(utf8Result.replace(/^0x/, '')))
					) {
						privateKey = utf8Result;
						console.log('[Background] Successfully decrypted private key using UTF-8');
					} else {
						console.warn(
							'[Background] UTF-8 result does not match private key format:',
							{
								length: utf8Result.length,
								preview: utf8Result.substring(0, 20) + '...',
							}
						);
					}
				} catch (utf8Error: any) {
					// UTF-8 解码失败，继续尝试其他方式
					console.warn(
						'[Background] UTF-8 decode failed, trying Hex:',
						utf8Error.message
					);
				}

				// 如果 UTF-8 失败，尝试 Hex 编码
				if (!privateKey) {
					try {
						const hexString = decryptedBytes.toString(enc.Hex);
						// 验证是否是有效的十六进制字符串
						if (hexString && /^[0-9a-fA-F]{64}$/.test(hexString)) {
							privateKey = '0x' + hexString;
							console.log(
								'[Background] Successfully decrypted private key using Hex'
							);
						} else {
							console.warn(
								'[Background] Hex result does not match private key format:',
								{
									length: hexString.length,
									preview: hexString.substring(0, 20) + '...',
								}
							);
						}
					} catch (hexError: any) {
						console.warn('[Background] Hex decode failed:', hexError.message);
					}
				}

				// 如果都失败了，说明密码可能错误或数据损坏
				if (!privateKey) {
					console.error(
						'[Background] getUnlockedWallet: Failed to decrypt private key - invalid password or corrupted data',
						{
							accountAddress: state.currentAccount.address,
							hasPassword: !!password,
							passwordLength: (password as string).length,
							encryptedPrivateKeyLength: storedPrivateKey.length,
							encryptedPrivateKeyPreview: storedPrivateKey.substring(0, 50) + '...',
							passwordValid: passwordValid,
							isBase64Like: /^[A-Za-z0-9+/=]+$/.test(storedPrivateKey), // Base64 通常只包含这些字符
						}
					);
					return null;
				}
			}

			// 清理私钥格式：确保有 0x 前缀
			if (!privateKey.startsWith('0x')) {
				privateKey = '0x' + privateKey;
			}

			// 移除可能的空白字符
			privateKey = privateKey.trim();

			// 验证私钥格式（应该是 66 个字符：0x + 64 个十六进制字符）
			if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
				console.error('[Background] getUnlockedWallet: Invalid private key format:', {
					length: privateKey.length,
					startsWith0x: privateKey.startsWith('0x'),
					preview:
						privateKey.substring(0, 10) +
						'...' +
						privateKey.substring(privateKey.length - 10),
				});
				return null;
			}

			// 获取 provider
			const provider = await getProvider();
			if (!provider) {
				console.error('[Background] getUnlockedWallet: No provider available');
				return null;
			}

			// 验证私钥是否有效
			try {
				const wallet = new ethers.Wallet(privateKey, provider);
				console.log(
					'[Background] getUnlockedWallet: Successfully created wallet for',
					wallet.address
				);
				return wallet;
			} catch (walletError) {
				console.error(
					'[Background] getUnlockedWallet: Failed to create wallet from private key:',
					walletError
				);
				return null;
			}
		} catch (decryptError: any) {
			console.error('[Background] getUnlockedWallet: Decryption error:', {
				error: decryptError.message,
				errorName: decryptError.name,
				accountAddress: state.currentAccount.address,
				hasPassword: !!password,
				passwordLength: password ? (password as string).length : 0,
			});
			return null;
		}
	} catch (error) {
		console.error('[Background] Failed to get unlocked wallet:', error);
		return null;
	}
}
