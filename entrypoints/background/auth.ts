/**
 * 账户授权请求处理
 *
 * 【用途】
 * 处理 eth_requestAccounts RPC 方法，这是 DApp 连接钱包的第一步。
 *
 * 【EIP-1193 规范】
 * - 首次调用：必须弹出确认界面，用户批准后返回账户
 * - 后续调用：如果已授权，直接返回账户（不弹窗）
 * - 用户拒绝：抛出 USER_REJECTED_REQUEST 错误（4001）
 *
 * 【工作流程】
 * 1. 创建授权请求，存储到 pendingAuthRequests Map
 * 2. 打开 Popup 并设置路由到 'auth' 页面
 * 3. 等待用户批准/拒绝（通过 Promise）
 * 4. 用户操作后，Background 收到 AUTH_REQUEST_APPROVE/REJECT 消息
 * 5. 调用 resolve/reject，完成 Promise
 * 6. 从 Map 中删除请求
 *
 * 【超时处理】
 * 30 秒超时，防止请求永久挂起。
 *
 * 【设计模式】
 * 使用 Promise + Map 模式管理异步用户确认流程。
 * 这是所有需要用户确认的 RPC 方法的通用模式。
 */
import { ProviderErrorCode } from '@/types/eip1193';
import type { ProviderRpcError } from '@/types/eip1193';
import { browser } from 'wxt/browser';
import type { PendingAuthRequest } from './types';

/**
 * 请求用户授权
 *
 * @param origin - DApp 的域名（用于显示在确认界面）
 * @param pendingAuthRequests - 待处理授权请求的 Map
 * @param openPopup - 打开 Popup 的函数
 * @param setCurrentPopupRoute - 设置 Popup 路由的函数
 * @returns Promise<string[]> - 用户批准的账户地址数组
 */
export async function requestUserAuth(
	origin: string,
	pendingAuthRequests: Map<string, PendingAuthRequest>,
	openPopup: () => Promise<void>,
	setCurrentPopupRoute: (route: string) => void
): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const requestId = `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// 存储待处理的请求
		pendingAuthRequests.set(requestId, {
			requestId,
			origin,
			resolve,
			reject,
			timestamp: Date.now(),
		});

		// 打开 popup 并切换到授权页面
		openPopup()
			.then(() => {
				// 设置路由到授权页面
				setCurrentPopupRoute('auth');
				browser.runtime
					.sendMessage({
						type: 'POPUP_ROUTE_CHANGED',
						route: 'auth',
					})
					.catch(() => {});
			})
			.catch((error) => {
				console.error('[Background] Failed to open popup:', error);
				// 即使打开失败，也尝试发送消息（popup 可能已经打开）
				setCurrentPopupRoute('auth');
				browser.runtime
					.sendMessage({
						type: 'POPUP_ROUTE_CHANGED',
						route: 'auth',
					})
					.catch(() => {});
			});

		// 超时处理（30秒）
		setTimeout(() => {
			if (pendingAuthRequests.has(requestId)) {
				pendingAuthRequests.delete(requestId);
				const error: ProviderRpcError = {
					name: 'ProviderError',
					message: 'Request timeout',
					code: ProviderErrorCode.DISCONNECTED,
				};
				reject(error);
			}
		}, 30000);
	});
}
