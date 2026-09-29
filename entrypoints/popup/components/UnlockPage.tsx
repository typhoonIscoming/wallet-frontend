/**
 * 解锁页面组件
 */
import type { PopupRoute } from '../types';
import { Header } from './Header';

interface UnlockPageProps {
	password: string;
	onPasswordChange: (password: string) => void;
	onUnlock: () => void;
	onNavigate: (route: PopupRoute) => void;
	error: string | null;
	loading: boolean;
}

export function UnlockPage({
	password,
	onPasswordChange,
	onUnlock,
	error,
	loading,
}: UnlockPageProps) {
	return (
		<div className="min-h-full w-[360px] bg-black text-slate-100">
			<Header title="解锁钱包" />
			<div className="px-4 pt-6 pb-4">
				<div className="text-sm text-slate-400 mb-6">请输入密码以解锁钱包</div>

				<div className="space-y-4">
					<div>
						<input
							type="password"
							placeholder="请输入密码"
							value={password}
							onChange={(e) => onPasswordChange(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && onUnlock()}
							className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none transition-colors"
							disabled={loading}
							autoFocus
						/>
					</div>

					{error && (
						<div className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
							{error}
						</div>
					)}

					<button
						className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-light transition-colors shadow-lg shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
						onClick={onUnlock}
						disabled={loading || !password}
					>
						{loading ? '解锁中...' : '解锁'}
					</button>
				</div>
			</div>
		</div>
	);
}
