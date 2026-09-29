/**
 * EIP-1193 提供者实现
 */
import type {
	EIP1193Provider,
	RequestArguments,
	ProviderRpcError,
	ProviderConnectInfo,
	Listener,
} from '@/types/eip1193';
import { ProviderErrorCode } from '@/types/eip1193';

/**
 * 创建 EIP-1193 提供者
 */
export function createEIP1193Provider(): EIP1193Provider {
	const listeners = new Map<string, Set<Listener>>();
	let isConnected = false;
	let chainId = '0x1'; // 默认主网
	let accounts: string[] = [];

	/**
	 * 触发事件
	 */
	function emit(event: string, ...args: unknown[]): void {
		const eventListeners = listeners.get(event);
		if (eventListeners) {
			eventListeners.forEach((listener) => {
				try {
					listener(...args);
				} catch (error) {
					console.error(`Error in event listener for "${event}":`, error);
				}
			});
		}
	}

	/**
	 * 发送 RPC 请求到 background script
	 */
	async function sendRpcRequest<T = unknown>(
		method: string,
		params?: readonly unknown[] | object
	): Promise<T> {
		try {
			// 通过 postMessage 与 content script 通信
			// content script 会转发到 background
			return new Promise((resolve, reject) => {
				const messageId = `${Date.now()}-${Math.random()}`;

				// 监听响应
				const responseHandler = (event: MessageEvent) => {
					if (
						event.data?.source === 'wxt-eip1193-provider' &&
						event.data?.messageId === messageId
					) {
						window.removeEventListener('message', responseHandler);

						if (event.data.error) {
							const error: ProviderRpcError = {
								name: 'ProviderError',
								message: event.data.error.message || 'RPC Error',
								code: event.data.error.code || ProviderErrorCode.UNSUPPORTED_METHOD,
								data: event.data.error.data,
							};
							reject(error);
						} else {
							resolve(event.data.result);
						}
					}
				};

				window.addEventListener('message', responseHandler);

				// 发送请求到 content script
				window.postMessage(
					{
						source: 'wxt-eip1193-page',
						messageId,
						method,
						params,
					},
					'*'
				);

				// 超时处理
				setTimeout(() => {
					window.removeEventListener('message', responseHandler);
					const error: ProviderRpcError = {
						name: 'ProviderError',
						message: 'Request timeout',
						code: ProviderErrorCode.DISCONNECTED,
					};
					reject(error);
				}, 30000); // 30秒超时
			});
		} catch (error) {
			const rpcError: ProviderRpcError = {
				name: 'ProviderError',
				message: error instanceof Error ? error.message : 'Unknown error',
				code: ProviderErrorCode.DISCONNECTED,
			};
			throw rpcError;
		}
	}

	// 实现 on 方法
	const onMethod = (event: string, listener: Listener): void => {
		if (!listeners.has(event)) {
			listeners.set(event, new Set());
		}
		listeners.get(event)!.add(listener);
	};

	// 实现 removeListener 方法
	const removeListenerMethod = (event: string, listener: Listener): void => {
		const eventListeners = listeners.get(event);
		if (eventListeners) {
			eventListeners.delete(listener);
			if (eventListeners.size === 0) {
				listeners.delete(event);
			}
		}
	};

	const provider: EIP1193Provider = {
		/**
		 * 发送请求
		 */
		async request<T = unknown>(args: RequestArguments): Promise<T> {
			const { method, params } = args;

			// 处理特殊方法
			switch (method) {
				case 'eth_requestAccounts':
				case 'eth_accounts': {
					const result = await sendRpcRequest<string[]>(method, params);
					if (Array.isArray(result) && result.length > 0) {
						const oldAccounts = [...accounts];
						accounts = result;
						if (JSON.stringify(oldAccounts) !== JSON.stringify(accounts)) {
							emit('accountsChanged', accounts);
						}
						if (!isConnected) {
							isConnected = true;
							emit('connect', { chainId } as ProviderConnectInfo);
						}
					}
					return result as T;
				}

				case 'eth_chainId': {
					const result = await sendRpcRequest<string>(method, params);
					if (result && result !== chainId) {
						chainId = result;
						emit('chainChanged', chainId);
					}
					return result as T;
				}

				default:
					return sendRpcRequest<T>(method, params);
			}
		},

		/**
		 * 监听事件
		 */
		on: onMethod as EIP1193Provider['on'],

		/**
		 * 移除事件监听器
		 */
		removeListener: removeListenerMethod as EIP1193Provider['removeListener'],

		/**
		 * 移除所有事件监听器
		 */
		removeAllListeners(event?: string): void {
			if (event) {
				listeners.delete(event);
			} else {
				listeners.clear();
			}
		},
	};

	return provider;
}
