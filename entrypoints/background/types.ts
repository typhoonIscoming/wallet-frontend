import type { ProviderRpcError } from '@/types/eip1193';
import type { WalletState, Network } from '@/types/wallet';
import type { ethers } from 'ethers';

// 钱包存储结构类型
export interface WalletStoreData {
	state: WalletState;
	version?: number;
}

// 授权请求管理
export interface PendingAuthRequest {
	requestId: string;
	origin: string;
	resolve: (accounts: string[]) => void;
	reject: (error: ProviderRpcError) => void;
	timestamp: number;
}

// 签名请求管理
export interface PendingSignRequest {
	requestId: string;
	origin: string;
	method: string;
	address: string;
	message?: string;
	typedData?: {
		domain: any;
		types: any;
		message: any;
		primaryType?: string;
	};
	resolve: (signature: string) => void;
	reject: (error: ProviderRpcError) => void;
	timestamp: number;
}

// 切换网络请求管理
export interface PendingSwitchChainRequest {
	requestId: string;
	origin: string;
	chainId: string;
	targetNetwork: Network | null;
	resolve: (value: null) => void;
	reject: (error: ProviderRpcError) => void;
	timestamp: number;
}

// 交易请求管理
export interface PendingTransactionRequest {
	requestId: string;
	origin: string;
	method: string; // 'eth_sendTransaction' | 'eth_signTransaction'
	transaction: ethers.TransactionRequest;
	resolve: (result: string) => void; // 对于 sendTransaction 返回 txHash，对于 signTransaction 返回签名后的交易
	reject: (error: ProviderRpcError) => void;
	timestamp: number;
}

// 添加网络请求管理
export interface PendingAddChainRequest {
	requestId: string;
	origin: string;
	chainParams: {
		chainId: string;
		chainName: string;
		nativeCurrency: {
			name: string;
			symbol: string;
			decimals: number;
		};
		rpcUrls: string[];
		blockExplorerUrls?: string[];
	};
	resolve: (value: null) => void;
	reject: (error: ProviderRpcError) => void;
	timestamp: number;
}

// 添加代币请求管理
export interface PendingWatchAssetRequest {
	requestId: string;
	origin: string;
	assetParams: {
		type: string;
		options: {
			address: string;
			symbol?: string;
			decimals?: number;
			image?: string;
		};
	};
	resolve: (value: boolean) => void;
	reject: (error: ProviderRpcError) => void;
	timestamp: number;
}

// 请求处理器上下文
export interface RequestContext {
	sender?: { url?: string; tab?: { url?: string } };
	getWalletState: () => Promise<WalletState | null>;
	getWalletAccounts: () => Promise<string[]>;
	getProvider: () => Promise<ethers.JsonRpcProvider | null>;
	getUnlockedWallet: () => Promise<ethers.Wallet | null>;
	requestUserAuth: (origin: string) => Promise<string[]>;
	openPopup: () => Promise<void>;
	currentPopupRoute: string | null;
	setCurrentPopupRoute: (route: string) => void;
	pendingAuthRequests: Map<string, PendingAuthRequest>;
	pendingSignRequests: Map<string, PendingSignRequest>;
	pendingSwitchChainRequests: Map<string, PendingSwitchChainRequest>;
	pendingTransactionRequests: Map<string, PendingTransactionRequest>;
	pendingAddChainRequests: Map<string, PendingAddChainRequest>;
	pendingWatchAssetRequests: Map<string, PendingWatchAssetRequest>;
}
