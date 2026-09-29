/**
 * 交易请求管理 Hook
 */
import { useCallback, useState } from 'react';
import { browser } from 'wxt/browser';
import type { TransactionRequest } from '../types';

export function useTransaction() {
	const [transactionRequest, setTransactionRequest] = useState<TransactionRequest | null>(null);
	const hasRuntime = !!browser?.runtime && typeof browser.runtime.sendMessage === 'function';

	// 获取交易请求
	const fetchTransactionRequest = useCallback(async () => {
		if (!hasRuntime) {
			setTransactionRequest(null);
			return;
		}
		try {
			const response = await browser.runtime.sendMessage({ type: 'TRANSACTION_REQUEST_GET' });
			if (response?.requests && response.requests.length > 0) {
				setTransactionRequest(response.requests[0]);
			}
		} catch (error) {
			console.error('获取交易请求失败:', error);
		}
	}, [hasRuntime]);

	// 处理交易确认
	const handleTransactionApprove = useCallback(async () => {
		if (!transactionRequest) return;
		if (!hasRuntime) {
			return false;
		}

		try {
			await browser.runtime.sendMessage({
				type: 'TRANSACTION_REQUEST_APPROVE',
				requestId: transactionRequest.requestId,
			});
			setTransactionRequest(null);
			return true;
		} catch (error) {
			console.error('交易确认失败:', error);
			throw error;
		}
	}, [transactionRequest, hasRuntime]);

	// 处理交易拒绝
	const handleTransactionReject = useCallback(async () => {
		if (!transactionRequest) return;
		if (!hasRuntime) {
			return false;
		}

		try {
			await browser.runtime.sendMessage({
				type: 'TRANSACTION_REQUEST_REJECT',
				requestId: transactionRequest.requestId,
			});
			setTransactionRequest(null);
			return true;
		} catch (error) {
			console.error('交易拒绝失败:', error);
			throw error;
		}
	}, [transactionRequest, hasRuntime]);

	return {
		transactionRequest,
		setTransactionRequest,
		fetchTransactionRequest,
		handleTransactionApprove,
		handleTransactionReject,
	};
}
