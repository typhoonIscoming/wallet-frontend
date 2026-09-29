/**
 * Popup 路由管理 Hook
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { browser } from 'wxt/browser';
import type { PopupRoute } from '../types';

export function usePopupRoute() {
	const [step, setStep] = useState<PopupRoute>('main');
	const isAutoRoutingRef = useRef(false);

	// 从 background 获取路由
	useEffect(() => {
		const getRouteFromBackground = async () => {
			try {
				// 延迟获取路由，确保 background 已经设置好路由
				await new Promise((resolve) => setTimeout(resolve, 50));
				const response = await browser.runtime.sendMessage({ type: 'POPUP_GET_ROUTE' });
				if (response?.route) {
					const route = response.route as PopupRoute;
					console.log('[Popup] Got route from background:', route);
					setStep(route);
				}
			} catch (error) {
				console.error('获取路由失败:', error);
			}
		};
		getRouteFromBackground();
	}, []);

	// 监听 background 的路由变化
	useEffect(() => {
		const listener = async (message: any) => {
			if (message?.type === 'POPUP_ROUTE_CHANGED' && message.route) {
				const route = message.route as PopupRoute;
				console.log('[Popup] Route changed from background:', route);
				setStep(route);
			}
		};
		browser.runtime.onMessage.addListener(listener);
		return () => {
			browser.runtime.onMessage.removeListener(listener);
		};
	}, []);

	// 更新路由到 background
	const updateRoute = useCallback(async (newRoute: PopupRoute) => {
		setStep(newRoute);
		try {
			await browser.runtime.sendMessage({
				type: 'POPUP_SET_ROUTE',
				route: newRoute,
			});
		} catch (error) {
			console.error('更新路由失败:', error);
		}
	}, []);

	return {
		step,
		setStep,
		updateRoute,
		isAutoRoutingRef,
	};
}
