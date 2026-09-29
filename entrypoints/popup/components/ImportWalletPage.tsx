/**
 * 导入钱包页面组件
 */
import type { PopupRoute } from '../types';
import { Header } from './Header';

interface ImportWalletPageProps {
  importMnemonic: string;
  password: string;
  onImportMnemonicChange: (mnemonic: string) => void;
  onPasswordChange: (password: string) => void;
  onImportWallet: () => void;
  onNavigate: (route: PopupRoute) => void;
  error: string | null;
  loading: boolean;
}

export function ImportWalletPage({
  importMnemonic,
  password,
  onImportMnemonicChange,
  onPasswordChange,
  onImportWallet,
  onNavigate,
  error,
  loading,
}: ImportWalletPageProps) {
  return (
    <div className="min-h-full w-[360px] bg-black text-slate-100">
      <Header 
        title="导入钱包"
        showBack
        onBack={() => {
          onNavigate('main');
          onImportMnemonicChange('');
          onPasswordChange('');
        }}
      />

      <div className="px-4 pt-6 pb-4">
        <div className="space-y-4">
          <div>
            <div className="text-sm text-slate-300 mb-2">助记词</div>
            <textarea
              placeholder="请输入12或24个助记词，用空格分隔"
              value={importMnemonic}
              onChange={(e) => onImportMnemonicChange(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none resize-none transition-colors"
              disabled={loading}
            />
          </div>

          <div>
            <div className="text-sm text-slate-300 mb-2">设置密码</div>
            <input
              type="password"
              placeholder="至少8位字符"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onImportWallet()}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none transition-colors"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-light transition-colors shadow-lg shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onImportWallet}
            disabled={loading || !importMnemonic || !password}
          >
            {loading ? '导入中...' : '导入钱包'}
          </button>
        </div>
      </div>
    </div>
  );
}
