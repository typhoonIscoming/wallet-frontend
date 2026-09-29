/**
 * 创建钱包页面组件
 */
import { useState } from 'react';
import type { PopupRoute } from '../types';
import { Header } from './Header';

interface CreateWalletPageProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onCreateWallet: () => void;
  onNavigate: (route: PopupRoute) => void;
  error: string | null;
  loading: boolean;
  showMnemonic: boolean;
  newMnemonic: string | null;
  onMnemonicConfirmed: () => void;
}

export function CreateWalletPage({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  onCreateWallet,
  onNavigate,
  error,
  loading,
  showMnemonic,
  newMnemonic,
  onMnemonicConfirmed,
}: CreateWalletPageProps) {
  const [copied, setCopied] = useState(false);

  const wordList = newMnemonic ? newMnemonic.trim().split(/\s+/) : [];

  const copyMnemonic = async () => {
    if (!newMnemonic) return;
    try {
      await navigator.clipboard.writeText(newMnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略错误
    }
  };

  return (
    <div className="min-h-full w-[360px] bg-black text-slate-100">
      <Header 
        title="创建钱包"
        showBack
        onBack={() => {
          onNavigate('main');
          onPasswordChange('');
          onConfirmPasswordChange('');
        }}
      />

      <div className="px-4 pt-6 pb-4">
        {showMnemonic && newMnemonic ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-900/40 bg-yellow-950/20 p-4">
              <div className="text-sm font-medium text-yellow-200 mb-2">
                ⚠️ 请妥善保管助记词
              </div>
              <div className="text-xs text-yellow-200/80">
                助记词一旦泄露，资产可能被盗。建议离线抄写，不要截图/云端同步。
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {wordList.map((w, i) => (
                <div
                  key={`${w}-${i}`}
                  className="rounded-lg border border-slate-800 bg-slate-950/50 px-2 py-2"
                >
                  <div className="text-[10px] text-slate-500">{i + 1}</div>
                  <div className="mt-1 truncate text-sm font-medium">{w}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
                onClick={copyMnemonic}
              >
                {copied ? '已复制' : '复制助记词'}
              </button>
              <button
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-light transition-colors shadow-lg shadow-accent/20"
                onClick={onMnemonicConfirmed}
              >
                已完成
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-300 mb-2">设置密码</div>
              <input
                type="password"
                placeholder="至少8位字符"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <div className="text-sm text-slate-300 mb-2">确认密码</div>
              <input
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onCreateWallet()}
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
              onClick={onCreateWallet}
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? '创建中...' : '创建钱包'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
