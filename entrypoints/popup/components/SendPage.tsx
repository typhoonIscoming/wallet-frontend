/**
 * 发送页面组件
 */
import { useWalletStore } from '@/lib/wallet-store';
import { useBalance } from '../hooks/useBalance';
import type { PopupRoute } from '../types';
import { Header } from './Header';

interface SendPageProps {
	sendTo: string;
	sendAmount: string;
	onSendToChange: (to: string) => void;
	onSendAmountChange: (amount: string) => void;
	onSend: () => void;
	onNavigate: (route: PopupRoute) => void;
	error: string | null;
	loading: boolean;
}

export function SendPage({
	sendTo,
	sendAmount,
	onSendToChange,
	onSendAmountChange,
	onSend,
	onNavigate,
	error,
	loading,
}: SendPageProps) {
	const { currentNetwork, isLocked } = useWalletStore();
	const { balance, balanceLoading } = useBalance();

	return (
		<div className="min-h-full w-[360px] bg-black text-slate-100">
			<Header
				title="发送"
				showBack
				onBack={() => {
					onNavigate('main');
					onSendToChange('');
					onSendAmountChange('');
				}}
			/>
			<div className="px-4 pt-4 pb-4">
				{/* 当前网络显示 */}
				<div className="mb-4">
					<button
						onClick={() => onNavigate('networks')}
						className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left hover:bg-slate-900/80 transition-colors"
					>
						<div className="flex items-center justify-between">
							<div>
								<div className="text-xs text-slate-400 mb-0.5">当前网络</div>
								<div className="text-sm text-slate-200">{currentNetwork.name}</div>
							</div>
							<svg
								className="w-4 h-4 text-slate-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 9l4-4 4 4m0 6l-4 4-4-4"
								/>
							</svg>
						</div>
					</button>
				</div>

				<div className="space-y-4">
					{/* 余额显示 */}
					<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
						<div className="text-xs text-slate-400 mb-1">可用余额</div>
						<div className="flex items-baseline gap-2">
							<div className="text-xl font-bold text-slate-100">
								{balanceLoading ? '...' : balance}
							</div>
							<div className="text-sm text-slate-300">
								{currentNetwork.currencySymbol}
							</div>
						</div>
					</div>

					{/* 接收地址 */}
					<div>
						<div className="text-sm text-slate-300 mb-2">接收地址</div>
						<input
							type="text"
							placeholder="0x..."
							value={sendTo}
							onChange={(e) => onSendToChange(e.target.value)}
							className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none font-mono transition-colors"
							disabled={loading}
						/>
					</div>

					{/* 金额 */}
					<div>
						<div className="text-sm text-slate-300 mb-2">
							金额 ({currentNetwork.currencySymbol})
						</div>
						<div className="relative">
							<input
								type="number"
								step="any"
								placeholder="0.0"
								value={sendAmount}
								onChange={(e) => onSendAmountChange(e.target.value)}
								className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none transition-colors"
								disabled={loading}
							/>
							<button
								className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-accent hover:text-accent-light transition-colors"
								onClick={() => onSendAmountChange(balance)}
								disabled={loading}
							>
								最大
							</button>
						</div>
					</div>

					{error && (
						<div className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
							{error}
						</div>
					)}

					<button
						className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-black hover:bg-accent-light transition-colors shadow-lg shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
						onClick={onSend}
						disabled={loading || !sendTo || !sendAmount || isLocked}
					>
						{loading ? '发送中...' : '发送'}
					</button>
				</div>
			</div>
		</div>
	);
}
