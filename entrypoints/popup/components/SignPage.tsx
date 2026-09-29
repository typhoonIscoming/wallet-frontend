import { useWalletStore } from '@/lib/wallet-store';
import type { PopupRoute, SignRequest } from '../types';
import { useSign } from '../hooks/useSign';
import { Header } from './Header';

interface SignPageProps {
	signRequest: SignRequest | null;
	onNavigate: (route: PopupRoute) => void;
	error: string | null;
	loading: boolean;
	onApprove: () => Promise<void>;
	onReject: () => Promise<void>;
}

export function SignPage({
	signRequest,
	onNavigate,
	error,
	loading,
	onApprove,
	onReject,
}: SignPageProps) {
	const { currentAccount } = useWalletStore();

	if (!signRequest) {
		return (
			<div className="min-h-full w-[360px] bg-black text-slate-100">
				<Header title="签名请求" />
				<div className="px-4 pt-6 pb-4">
					<div className="text-sm text-slate-400 mb-4">等待签名请求...</div>
				</div>
			</div>
		);
	}

	const isTypedData = signRequest.method.includes('signTypedData');
	const methodName =
		signRequest.method === 'eth_sign'
			? 'eth_sign (已弃用)'
			: signRequest.method === 'personal_sign'
				? 'personal_sign'
				: signRequest.method === 'eth_signTypedData'
					? 'EIP-712 v1'
					: signRequest.method === 'eth_signTypedData_v3'
						? 'EIP-712 v3'
						: signRequest.method === 'eth_signTypedData_v4'
							? 'EIP-712 v4'
							: signRequest.method;

	return (
		<div className="min-h-full w-[360px] bg-black text-slate-100">
			<Header title="签名请求" />
			<div className="px-4 pt-4 pb-4">
				<div className="text-sm text-slate-400 mb-4">以下网站想要您签名一条消息</div>

				<div className="space-y-4">
					<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
						<div className="text-xs text-slate-400 mb-1">网站</div>
						<div className="text-sm font-medium text-slate-100 break-all">
							{signRequest.origin}
						</div>
					</div>

					<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
						<div className="text-xs text-slate-400 mb-1">签名方法</div>
						<div className="text-sm font-medium text-slate-100">{methodName}</div>
					</div>

					{currentAccount && (
						<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
							<div className="text-xs text-slate-400 mb-1">账户</div>
							<div className="text-sm font-mono text-slate-100 break-all">
								{currentAccount.address}
							</div>
							<div className="text-xs text-slate-400 mt-1">{currentAccount.name}</div>
						</div>
					)}

					{isTypedData && signRequest.typedData ? (
						<div className="space-y-3">
							<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
								<div className="text-xs text-slate-400 mb-2">Domain</div>
								<div className="text-xs font-mono text-slate-300 break-all whitespace-pre-wrap">
									{JSON.stringify(signRequest.typedData.domain, null, 2)}
								</div>
							</div>

							{signRequest.typedData.primaryType && (
								<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
									<div className="text-xs text-slate-400 mb-1">Primary Type</div>
									<div className="text-sm font-medium text-slate-100">
										{signRequest.typedData.primaryType}
									</div>
								</div>
							)}

							<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
								<div className="text-xs text-slate-400 mb-2">Message</div>
								<div className="text-xs font-mono text-slate-300 break-all whitespace-pre-wrap max-h-40 overflow-y-auto">
									{JSON.stringify(signRequest.typedData.message, null, 2)}
								</div>
							</div>
						</div>
					) : signRequest.message ? (
						<div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
							<div className="text-xs text-slate-400 mb-2">消息内容</div>
							<div className="text-sm font-mono text-slate-300 break-all whitespace-pre-wrap max-h-40 overflow-y-auto">
								{signRequest.message}
							</div>
						</div>
					) : null}

					<div className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 p-3">
						<div className="text-xs text-yellow-200">
							⚠️ 请仔细检查签名内容。签名后，该网站将能够证明您拥有此账户的私钥。
						</div>
					</div>

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
							签名
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
