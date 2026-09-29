import { ethers } from 'ethers';
import { useWalletStore } from '@/lib/wallet-store';
import type { PopupRoute, TransactionRequest } from '../types';
import { Header } from './Header';

interface TransactionPageProps {
	transactionRequest: TransactionRequest | null;
	onNavigate: (route: PopupRoute) => void;
	error: string | null;
	loading: boolean;
	onApprove: () => Promise<void>;
	onReject: () => Promise<void>;
}

export function TransactionPage({
	transactionRequest,
	onNavigate,
	error,
	loading,
	onApprove,
	onReject,
}: TransactionPageProps) {
	const { currentAccount, currentNetwork } = useWalletStore();

	if (!transactionRequest) {
		return (
			<div className="min-h-full w-[360px] bg-black text-slate-100">
				<Header title="交易确认" />
				<div className="px-4 pt-6 pb-4">
					<div className="text-sm text-slate-400 mb-4">等待交易请求...</div>
				</div>
			</div>
		);
	}

	const isSendTransaction = transactionRequest.method === 'eth_sendTransaction';
	const tx = transactionRequest.transaction;

	// 格式化金额
	const formatValue = (value?: string) => {
		if (!value) return '0';
		try {
			const valueBigInt = BigInt(value);
			const valueEth = ethers.formatEther(valueBigInt);
			return parseFloat(valueEth).toFixed(6);
		} catch {
			return value;
		}
	};

	// 格式化 Gas
	const formatGas = (gas?: string) => {
		if (!gas) return '-';
		try {
			if (gas.startsWith('0x')) {
				return BigInt(gas).toString();
			}
			return gas;
		} catch {
			return gas;
		}
	};

	// 格式化地址（显示前6后4）
	const formatAddress = (address?: string) => {
		if (!address) return '-';
		if (address.length <= 10) return address;
		return `${address.slice(0, 6)}...${address.slice(-4)}`;
	};

	return (
		<div className="min-h-full w-[360px] bg-black text-slate-100">
			<Header title={isSendTransaction ? '发送交易' : '签名交易'} />
			<div className="px-4 pt-4 pb-4">
				<div className="text-sm text-slate-400 mb-4">
					以下网站想要{isSendTransaction ? '发送' : '签名'}一条交易
				</div>

				<div className="space-y-4">
					<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
						<div className="text-xs text-slate-400 mb-1">网站</div>
						<div className="text-sm font-medium text-slate-100 break-all">
							{transactionRequest.origin}
						</div>
					</div>

					{currentAccount && (
						<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
							<div className="text-xs text-slate-400 mb-1">发送账户</div>
							<div className="text-sm font-mono text-slate-100 break-all">
								{tx.from || currentAccount.address}
							</div>
							<div className="text-xs text-slate-400 mt-1">{currentAccount.name}</div>
						</div>
					)}

					{tx.to && (
						<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
							<div className="text-xs text-slate-400 mb-1">接收地址</div>
							<div className="text-sm font-mono text-slate-100 break-all">
								{tx.to}
							</div>
						</div>
					)}

					{tx.value && (
						<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
							<div className="text-xs text-slate-400 mb-1">金额</div>
							<div className="text-lg font-semibold text-slate-100">
								{formatValue(tx.value)} {currentNetwork.currencySymbol}
							</div>
						</div>
					)}

					<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
						<div className="text-xs text-slate-400 mb-2">交易详情</div>

						{tx.gas && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-400">Gas Limit:</span>
								<span className="text-slate-100 font-mono">
									{formatGas(tx.gas)}
								</span>
							</div>
						)}

						{tx.gasPrice && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-400">Gas Price:</span>
								<span className="text-slate-100 font-mono">
									{formatGas(tx.gasPrice)} Wei
								</span>
							</div>
						)}

						{tx.maxFeePerGas && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-400">Max Fee Per Gas:</span>
								<span className="text-slate-100 font-mono">
									{formatGas(tx.maxFeePerGas)} Wei
								</span>
							</div>
						)}

						{tx.maxPriorityFeePerGas && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-400">Max Priority Fee:</span>
								<span className="text-slate-100 font-mono">
									{formatGas(tx.maxPriorityFeePerGas)} Wei
								</span>
							</div>
						)}

						{tx.nonce !== undefined && (
							<div className="flex justify-between text-sm">
								<span className="text-slate-400">Nonce:</span>
								<span className="text-slate-100 font-mono">{tx.nonce}</span>
							</div>
						)}

						{tx.data && tx.data !== '0x' && (
							<div className="pt-2 border-t border-slate-800">
								<div className="text-xs text-slate-400 mb-1">Data:</div>
								<div className="text-xs font-mono text-slate-300 break-all max-h-20 overflow-y-auto">
									{tx.data}
								</div>
							</div>
						)}
					</div>

					{isSendTransaction && (
						<div className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 p-3">
							<div className="text-xs text-yellow-200">
								⚠️ 此交易将被发送到区块链。请仔细检查交易详情，确认无误后再批准。
							</div>
						</div>
					)}

					{!isSendTransaction && (
						<div className="rounded-lg border border-blue-900/40 bg-blue-950/20 p-3">
							<div className="text-xs text-blue-200">
								ℹ️ 此交易将被签名但不会发送。签名后的交易可以稍后手动发送。
							</div>
						</div>
					)}

					{error && (
						<div className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
							{error}
						</div>
					)}

					<div className="flex gap-3">
						<button
							className="flex-1 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
							onClick={onReject}
							disabled={loading}
						>
							拒绝
						</button>
						<button
							className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-light transition-colors shadow-lg shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
							onClick={onApprove}
							disabled={loading || !currentAccount}
						>
							{isSendTransaction ? '发送' : '签名'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
