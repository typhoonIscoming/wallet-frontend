import { EthereumRpcMethod, ProviderErrorCode } from '@/types/eip1193';
import type { ProviderRpcError } from '@/types/eip1193';
import { ethers } from 'ethers';
import type { PendingSignRequest } from './types';
import { getUnlockedWallet } from './utils';

/**
 * 处理签名请求的批准
 */
export async function handleSignRequestApprove(
  requestId: string,
  pendingSignRequests: Map<string, PendingSignRequest>
): Promise<void> {
  const request = pendingSignRequests.get(requestId);
  if (!request) return;

  try {
    const wallet = await getUnlockedWallet();
    if (!wallet || wallet.address.toLowerCase() !== request.address.toLowerCase()) {
      const error: ProviderRpcError = {
        name: 'ProviderError',
        message: 'Wallet not available or address mismatch',
        code: ProviderErrorCode.UNAUTHORIZED,
      };
      request.reject(error);
      pendingSignRequests.delete(requestId);
      return;
    }

    let signature: string;
    if (request.method === EthereumRpcMethod.ETH_SIGN) {
      // eth_sign
      signature = await wallet.signMessage(ethers.getBytes(request.message || ''));
    } else if (request.method === EthereumRpcMethod.PERSONAL_SIGN) {
      // personal_sign
      signature = await wallet.signMessage(request.message || '');
    } else if (
      request.method === EthereumRpcMethod.ETH_SIGN_TYPED_DATA ||
      request.method === EthereumRpcMethod.ETH_SIGN_TYPED_DATA_V3 ||
      request.method === EthereumRpcMethod.ETH_SIGN_TYPED_DATA_V4
    ) {
      // EIP-712 签名
      if (!request.typedData) {
        const error: ProviderRpcError = {
          name: 'ProviderError',
          message: 'Missing typed data',
          code: ProviderErrorCode.UNSUPPORTED_METHOD,
        };
        request.reject(error);
        pendingSignRequests.delete(requestId);
        return;
      }

      const { domain, types, message: value, primaryType } = request.typedData;
      
      // 规范化 domain
      const normalizedDomain: any = { ...domain };
      if (normalizedDomain.verifyingContract) {
        if (!ethers.isAddress(normalizedDomain.verifyingContract)) {
          const error: ProviderRpcError = {
            name: 'ProviderError',
            message: `Invalid verifyingContract address: ${normalizedDomain.verifyingContract}`,
            code: ProviderErrorCode.UNSUPPORTED_METHOD,
          };
          request.reject(error);
          pendingSignRequests.delete(requestId);
          return;
        }
        normalizedDomain.verifyingContract = ethers.getAddress(normalizedDomain.verifyingContract).toLowerCase();
      }

      if (normalizedDomain.chainId !== undefined) {
        if (typeof normalizedDomain.chainId === 'string') {
          if (normalizedDomain.chainId.startsWith('0x')) {
            normalizedDomain.chainId = parseInt(normalizedDomain.chainId, 16);
          } else {
            normalizedDomain.chainId = parseInt(normalizedDomain.chainId, 10);
          }
        }
      }

      // 创建不包含 EIP712Domain 的 types 副本
      const typesWithoutDomain: any = { ...types };
      delete typesWithoutDomain.EIP712Domain;

      const privateKey = wallet.privateKey;
      const signerWallet = new ethers.Wallet(privateKey);
      signature = await signerWallet.signTypedData(normalizedDomain, typesWithoutDomain, value);
    } else {
      const error: ProviderRpcError = {
        name: 'ProviderError',
        message: `Unsupported sign method: ${request.method}`,
        code: ProviderErrorCode.UNSUPPORTED_METHOD,
      };
      request.reject(error);
      pendingSignRequests.delete(requestId);
      return;
    }

    request.resolve(signature);
    pendingSignRequests.delete(requestId);
  } catch (error: any) {
    const providerError: ProviderRpcError = {
      name: 'ProviderError',
      message: error.message || 'Failed to sign',
      code: ProviderErrorCode.UNSUPPORTED_METHOD,
    };
    request.reject(providerError);
    pendingSignRequests.delete(requestId);
  }
}
