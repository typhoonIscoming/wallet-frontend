/**
 * 主页面组件
 */
import { useState, useEffect } from 'react';
import { useWalletStore } from '@/lib/wallet-store';
import { AES, enc } from 'crypto-js';
import { browser } from 'wxt/browser';
import type { PopupRoute } from '../types';
import { useBalance } from '../hooks/useBalance';
import { Header } from './Header';

interface MainPageProps {
  onNavigate: (route: PopupRoute) => void;
  onLock: () => void;
}

export function MainPage({ onNavigate, onLock }: MainPageProps) {
  const {
    isLocked,
    accounts,
    currentAccount,
    mnemonic,
    currentNetwork,
  } = useWalletStore();
  const { balance, balanceLoading } = useBalance();
  const [revealed, setRevealed] = useState(false);
  const [savedMnemonic, setSavedMnemonic] = useState<string | null>(null);

  // 获取已保存的助记词（解密）
  const getDecryptedMnemonic = async () => {
    if (!mnemonic) return null;
    try {
      const res = await browser.runtime.sendMessage({ type: 'WALLET_GET_PASSWORD' });
      const pwd = res?.password;
      if (!pwd) return null;
      const decrypted = AES.decrypt(mnemonic, pwd).toString(enc.Utf8);
      return decrypted || null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (revealed && mnemonic && !isLocked) {
      getDecryptedMnemonic().then(setSavedMnemonic);
    }
  }, [revealed, mnemonic, isLocked]);

  const wordList = savedMnemonic ? savedMnemonic.trim().split(/\s+/) : [];

  if (accounts.length === 0) {
    return (
      <div className="min-h-full w-[360px] bg-black text-slate-100">
        <Header title="钱包" />
        <div className="px-4 pt-6 pb-4">
          <div className="space-y-3">
            <button
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-black hover:bg-accent-light transition-colors shadow-lg shadow-accent/20"
              onClick={() => onNavigate('create')}
            >
              创建新钱包
            </button>
            <button
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 hover:border-accent/50 transition-colors"
              onClick={() => onNavigate('import')}
            >
              导入钱包
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-[360px] bg-black text-slate-100">
      <Header 
        title="钱包"
        rightAction={
          !isLocked && currentAccount ? (
            <button
              onClick={onLock}
              className="text-xs text-slate-400 hover:text-accent transition-colors"
            >
              锁定
            </button>
          ) : undefined
        }
      />

      {currentAccount && (
        <div className="px-4 pt-4 pb-4">
          {/* 余额显示 */}
          <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-primary-500/10 p-4 mb-3 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-slate-400">余额</div>
              <button
                onClick={() => onNavigate('networks')}
                className="text-xs text-accent hover:text-accent-light flex items-center gap-1 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
                {currentNetwork.name}
              </button>
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <div className="text-2xl font-bold text-slate-100">
                {balanceLoading ? '...' : balance}
              </div>
              <div className="text-sm text-slate-300">{currentNetwork.currencySymbol}</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              className="rounded-lg bg-accent px-4 py-3 text-sm font-medium text-black hover:bg-accent-light transition-colors shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
              onClick={() => onNavigate('send')}
              disabled={isLocked}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              发送
            </button>
            <button
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:border-accent/50 transition-colors flex items-center justify-center gap-2"
              onClick={() => onNavigate('receive')}
              disabled={isLocked}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7l-7 7-7-7" />
              </svg>
              收款
            </button>
          </div>

          {/* 代币和 NFT 入口 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:border-accent/50 transition-colors flex items-center justify-center gap-2"
              onClick={() => onNavigate('tokens')}
              disabled={isLocked}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              代币
            </button>
            <button
              className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:border-accent/50 transition-colors flex items-center justify-center gap-2"
              onClick={() => onNavigate('nfts')}
              disabled={isLocked}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              NFT
            </button>
          </div>

          {/* 账户信息 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 mb-3">
            <div className="text-xs text-slate-400 mb-1">当前账户</div>
            <div className="text-sm font-mono text-slate-100 break-all">
              {currentAccount.address}
            </div>
            <div className="text-xs text-slate-400 mt-2">{currentAccount.name}</div>
          </div>

          {/* 助记词 */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm text-slate-200">助记词</div>
              {mnemonic && (
                <button
                  className="text-xs text-accent hover:text-accent-light transition-colors"
                  onClick={() => setRevealed((v) => !v)}
                >
                  {revealed ? '隐藏' : '显示'}
                </button>
              )}
            </div>

            {mnemonic ? (
              <div>
                {revealed && savedMnemonic ? (
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
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
                    点击"显示"查看助记词
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-sm text-slate-400">
                未保存助记词
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
