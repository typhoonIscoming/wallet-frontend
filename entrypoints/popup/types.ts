/**
 * Popup 相关类型定义
 */

export type PopupRoute =
	| 'main'
	| 'create'
	| 'import'
	| 'unlock'
	| 'auth'
	| 'sign'
	| 'switch-chain'
	| 'transaction'
	| 'add-chain'
	| 'watch-asset'
	| 'send'
	| 'receive'
	| 'networks'
	| 'add-network'
	| 'tokens'
	| 'nfts'
	| 'send-token'
	| 'transfer-nft';

export interface AuthRequest {
	requestId: string;
	origin: string;
	timestamp: number;
}

export interface SignRequest {
	requestId: string;
	origin: string;
	method: string; // 'eth_sign' | 'personal_sign' | 'eth_signTypedData' | 'eth_signTypedData_v3' | 'eth_signTypedData_v4'
	address: string;
	message?: string; // 用于 eth_sign 和 personal_sign
	typedData?: {
		domain: any;
		types: any;
		message: any;
		primaryType?: string;
	}; // 用于 EIP-712 签名
	timestamp: number;
}

export interface SwitchChainRequest {
	requestId: string;
	origin: string;
	chainId: string;
	targetNetwork: {
		id: string;
		name: string;
		chainId: number;
		currencySymbol: string;
	} | null;
	timestamp: number;
}

export interface TransactionRequest {
	requestId: string;
	origin: string;
	method: string; // 'eth_sendTransaction' | 'eth_signTransaction'
	transaction: {
		from?: string;
		to?: string;
		value?: string;
		data?: string;
		gas?: string;
		gasPrice?: string;
		maxFeePerGas?: string;
		maxPriorityFeePerGas?: string;
		nonce?: string;
		chainId?: string;
	};
	timestamp: number;
}

export interface AddChainRequest {
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
	timestamp: number;
}

export interface WatchAssetRequest {
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
	timestamp: number;
}
