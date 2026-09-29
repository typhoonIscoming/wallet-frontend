/**
 * 切换网络请求管理 Hook
 */
import { useCallback, useState } from 'react';
import { browser } from 'wxt/browser';
import type { SwitchChainRequest } from '../types';

export function useSwitchChain() {
  const [switchChainRequest, setSwitchChainRequest] = useState<SwitchChainRequest | null>(null);

  // 获取切换网络请求
  const fetchSwitchChainRequest = useCallback(async () => {
    try {
      const response = await browser.runtime.sendMessage({ type: 'SWITCH_CHAIN_REQUEST_GET' });
      if (response?.requests && response.requests.length > 0) {
        setSwitchChainRequest(response.requests[0]);
      }
    } catch (error) {
      console.error('获取切换网络请求失败:', error);
    }
  }, []);

  // 处理切换网络确认
  const handleSwitchChainApprove = useCallback(async () => {
    if (!switchChainRequest) return;

    try {
      await browser.runtime.sendMessage({
        type: 'SWITCH_CHAIN_REQUEST_APPROVE',
        requestId: switchChainRequest.requestId,
      });
      setSwitchChainRequest(null);
      return true;
    } catch (error) {
      console.error('切换网络确认失败:', error);
      throw error;
    }
  }, [switchChainRequest]);

  // 处理切换网络拒绝
  const handleSwitchChainReject = useCallback(async () => {
    if (!switchChainRequest) return;

    try {
      await browser.runtime.sendMessage({
        type: 'SWITCH_CHAIN_REQUEST_REJECT',
        requestId: switchChainRequest.requestId,
      });
      setSwitchChainRequest(null);
      return true;
    } catch (error) {
      console.error('切换网络拒绝失败:', error);
      throw error;
    }
  }, [switchChainRequest]);

  return {
    switchChainRequest,
    setSwitchChainRequest,
    fetchSwitchChainRequest,
    handleSwitchChainApprove,
    handleSwitchChainReject,
  };
}
