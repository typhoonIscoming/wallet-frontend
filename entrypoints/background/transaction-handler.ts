import { EthereumRpcMethod, ProviderErrorCode } from '@/types/eip1193';
import type { ProviderRpcError } from '@/types/eip1193';
import { ethers } from 'ethers';
import type { PendingTransactionRequest } from './types';
import { getUnlockedWallet } from './utils';

/**
 * 处理交易请求的批准
 */
export async function handleTransactionRequestApprove(
  requestId: string,
  pendingTransactionRequests: Map<string, PendingTransactionRequest>
): Promise<void> {
  const request = pendingTransactionRequests.get(requestId);
  if (!request) return;

  try {
    const wallet = await getUnlockedWallet();
    if (!wallet) {
      const error: ProviderRpcError = {
        name: 'ProviderError',
        message: 'Wallet not available or locked',
        code: ProviderErrorCode.UNAUTHORIZED,
      };
      request.reject(error);
      pendingTransactionRequests.delete(requestId);
      return;
    }

    let result: string;
    if (request.method === EthereumRpcMethod.ETH_SEND_TRANSACTION) {
      // 发送交易
      const tx = await wallet.sendTransaction(request.transaction);
      result = tx.hash;
    } else if (request.method === EthereumRpcMethod.ETH_SIGN_TRANSACTION) {
      // 签名交易
      result = await wallet.signTransaction(request.transaction);
    } else {
      const error: ProviderRpcError = {
        name: 'ProviderError',
        message: `Unsupported transaction method: ${request.method}`,
        code: ProviderErrorCode.UNSUPPORTED_METHOD,
      };
      request.reject(error);
      pendingTransactionRequests.delete(requestId);
      return;
    }

    request.resolve(result);
    pendingTransactionRequests.delete(requestId);
  } catch (error: any) {
    const providerError: ProviderRpcError = {
      name: 'ProviderError',
      message: error.message || 'Failed to process transaction',
      code: ProviderErrorCode.UNSUPPORTED_METHOD,
    };
    request.reject(providerError);
    pendingTransactionRequests.delete(requestId);
  }
}
