/**
 * 签名请求管理 Hook
 */
import { useCallback, useState, useEffect } from 'react';
import { browser } from 'wxt/browser';
import type { SignRequest } from '../types';

export function useSign() {
	const [signRequest, setSignRequest] = useState<SignRequest | null>(null);
	const hasRuntime = !!browser?.runtime && typeof browser.runtime.sendMessage === 'function';

	// 获取签名请求
	const fetchSignRequest = useCallback(async () => {
		if (!hasRuntime) {
			setSignRequest(null);
			return;
		}
		try {
			const response = await browser.runtime.sendMessage({ type: 'SIGN_REQUEST_GET' });
			if (response?.requests && response.requests.length > 0) {
				setSignRequest(response.requests[0]);
			}
		} catch (error) {
			console.error('获取签名请求失败:', error);
		}
	}, [hasRuntime]);

	// 处理签名确认
	const handleSignApprove = useCallback(async () => {
		if (!signRequest) return;
		if (!hasRuntime) {
			return false;
		}

		try {
			await browser.runtime.sendMessage({
				type: 'SIGN_REQUEST_APPROVE',
				requestId: signRequest.requestId,
			});
			setSignRequest(null);
			return true;
		} catch (error) {
			console.error('签名确认失败:', error);
			throw error;
		}
	}, [signRequest, hasRuntime]);

	// 处理签名拒绝
	const handleSignReject = useCallback(async () => {
		if (!signRequest) return;
		if (!hasRuntime) {
			return false;
		}

		try {
			await browser.runtime.sendMessage({
				type: 'SIGN_REQUEST_REJECT',
				requestId: signRequest.requestId,
			});
			setSignRequest(null);
			return true;
		} catch (error) {
			console.error('签名拒绝失败:', error);
			throw error;
		}
	}, [signRequest, hasRuntime]);

	return {
		signRequest,
		setSignRequest,
		fetchSignRequest,
		handleSignApprove,
		handleSignReject,
	};
}
