/**
 * Popup 主应用组件
 * 
 * 负责路由管理和状态管理，将各个页面组件组合在一起
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWalletStore } from '@/lib/wallet-store';
import { browser } from 'wxt/browser';
import { ethers } from 'ethers';
import type { PopupRoute } from './types';
import { usePopupRoute } from './hooks/usePopupRoute';
import { useAuth } from './hooks/useAuth';
import { useSign } from './hooks/useSign';
import { useSwitchChain } from './hooks/useSwitchChain';
import { useTransaction } from './hooks/useTransaction';
import { useAddChain } from './hooks/useAddChain';
import { useWatchAsset } from './hooks/useWatchAsset';

// 页面组件
import { MainPage } from './components/MainPage';
import { AuthPage } from './components/AuthPage';
import { UnlockPage } from './components/UnlockPage';
import { CreateWalletPage } from './components/CreateWalletPage';
import { ImportWalletPage } from './components/ImportWalletPage';
import { SendPage } from './components/SendPage';
import { ReceivePage } from './components/ReceivePage';
import { NetworksPage } from './components/NetworksPage';
import { AddNetworkPage } from './components/AddNetworkPage';
import { SignPage } from './components/SignPage';
import { SwitchChainPage } from './components/SwitchChainPage';
import { TransactionPage } from './components/TransactionPage';
import { AddChainPage } from './components/AddChainPage';
import { WatchAssetPage } from './components/WatchAssetPage';
import { TokensPage } from './components/TokensPage';
import { NFTsPage } from './components/NFTsPage';
import { SendTokenPage } from './components/SendTokenPage';
import { TransferNFTPage } from './components/TransferNFTPage';

function App() {
  const {
    isLocked,
    accounts,
    currentAccount,
    networks,
    currentNetwork,
    createWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    getProvider,
    switchNetwork,
    addNetwork,
  } = useWalletStore();

  const { step, updateRoute, isAutoRoutingRef } = usePopupRoute();
  const { authRequest, fetchAuthRequest, handleAuthApprove, handleAuthReject } = useAuth();
  const { signRequest, fetchSignRequest, handleSignApprove, handleSignReject } = useSign();
  const { switchChainRequest, fetchSwitchChainRequest, handleSwitchChainApprove, handleSwitchChainReject } = useSwitchChain();
  const { transactionRequest, fetchTransactionRequest, handleTransactionApprove, handleTransactionReject } = useTransaction();
  const { addChainRequest, fetchAddChainRequest, handleAddChainApprove, handleAddChainReject, loading: addChainLoading, error: addChainError } = useAddChain();
  const { watchAssetRequest, fetchWatchAssetRequest, handleWatchAssetApprove, handleWatchAssetReject, loading: watchAssetLoading, error: watchAssetError } = useWatchAsset();

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [newMnemonic, setNewMnemonic] = useState<string | null>(null);
  
  // 发送相关状态
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  // 添加网络相关状态
  const [addNetworkChainId, setAddNetworkChainId] = useState('');
  const [addNetworkName, setAddNetworkName] = useState('');
  const [addNetworkRpcUrl, setAddNetworkRpcUrl] = useState('');
  const [addNetworkCurrencySymbol, setAddNetworkCurrencySymbol] = useState('');
  const [addNetworkBlockExplorer, setAddNetworkBlockExplorer] = useState('');
  const [addNetworkLoading, setAddNetworkLoading] = useState(false);

  // 从 background 获取授权请求
  useEffect(() => {
    if (step === 'auth') {
      fetchAuthRequest();
    }
  }, [step, fetchAuthRequest]);

  // 从 background 获取签名请求
  useEffect(() => {
    if (step === 'sign') {
      fetchSignRequest();
    }
  }, [step, fetchSignRequest]);

  // 从 background 获取切换网络请求
  useEffect(() => {
    if (step === 'switch-chain') {
      fetchSwitchChainRequest();
    }
  }, [step, fetchSwitchChainRequest]);

  // 从 background 获取交易请求
  useEffect(() => {
    if (step === 'transaction') {
      fetchTransactionRequest();
    }
  }, [step, fetchTransactionRequest]);

  // 从 background 获取添加网络请求
  useEffect(() => {
    if (step === 'add-chain') {
      fetchAddChainRequest();
    }
  }, [step, fetchAddChainRequest]);

  // 从 background 获取添加代币请求
  useEffect(() => {
    if (step === 'watch-asset') {
      fetchWatchAssetRequest();
    }
  }, [step, fetchWatchAssetRequest]);

  // 根据钱包状态自动决定路由
  useEffect(() => {
    if (isAutoRoutingRef.current) return;
    if (step === 'create' || step === 'import' || step === 'send' || step === 'receive' || step === 'networks' || step === 'add-network' || step === 'auth' || step === 'sign' || step === 'switch-chain' || step === 'transaction' || step === 'add-chain' || step === 'watch-asset') return;

    if (accounts.length === 0) {
      if (step !== 'main') {
        isAutoRoutingRef.current = true;
        updateRoute('main').finally(() => {
          isAutoRoutingRef.current = false;
        });
      }
    } else if (isLocked) {
      if (step !== 'unlock') {
        isAutoRoutingRef.current = true;
        updateRoute('unlock').finally(() => {
          isAutoRoutingRef.current = false;
        });
      }
    } else if (!isLocked && accounts.length > 0 && step === 'unlock') {
      isAutoRoutingRef.current = true;
      updateRoute('main').finally(() => {
        isAutoRoutingRef.current = false;
      });
    }
  }, [accounts.length, isLocked, step, updateRoute, isAutoRoutingRef]);

  // 创建钱包
  const handleCreateWallet = async () => {
    if (!password || password.length < 8) {
      setError('密码至少需要8位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { mnemonic: generatedMnemonic } = await createWallet(password);
      setNewMnemonic(generatedMnemonic);
      setShowMnemonic(true);
      setPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建钱包失败');
    } finally {
      setLoading(false);
    }
  };

  // 确认助记词已保存
  const handleMnemonicConfirmed = async () => {
    setShowMnemonic(false);
    setNewMnemonic(null);
    await updateRoute('main');
  };

  // 导入钱包
  const handleImportWallet = async () => {
    if (!importMnemonic.trim()) {
      setError('请输入助记词');
      return;
    }
    if (!password || password.length < 8) {
      setError('密码至少需要8位');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await importWallet(importMnemonic.trim(), password);
      setImportMnemonic('');
      setPassword('');
      await updateRoute('main');
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入钱包失败');
    } finally {
      setLoading(false);
    }
  };

  // 解锁钱包
  const handleUnlock = async () => {
    if (!password) {
      setError('请输入密码');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const success = await unlockWallet(password);
      if (success) {
        setPassword('');
        await updateRoute('main');
      } else {
        setError('密码错误');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '解锁失败');
    } finally {
      setLoading(false);
    }
  };

  // 锁定钱包
  const handleLock = async () => {
    await lockWallet();
    await updateRoute('unlock');
  };

  // 发送交易
  const handleSend = async () => {
    if (!sendTo || !sendAmount || !currentAccount) {
      setError('请填写完整信息');
      return;
    }

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('请输入有效的金额');
      return;
    }

    // 验证地址格式
    if (!ethers.isAddress(sendTo)) {
      setError('无效的地址格式');
      return;
    }

    setSendLoading(true);
    setError(null);

    try {
      const provider = getProvider();
      if (!provider) {
        throw new Error('无法连接到网络');
      }

      // 获取当前余额
      const balanceWei = await provider.getBalance(currentAccount.address);
      const balanceEth = parseFloat(ethers.formatEther(balanceWei));
      
      if (amount > balanceEth) {
        setError('余额不足');
        setSendLoading(false);
        return;
      }

      // 通过 background 发送交易
      const valueWei = ethers.parseEther(sendAmount);
      const response = await browser.runtime.sendMessage({
        type: 'EIP1193_REQUEST',
        method: 'eth_sendTransaction',
        params: [{
          from: currentAccount.address,
          to: sendTo,
          value: '0x' + valueWei.toString(16),
        }],
      });

      if (response?.success && response.result) {
        setError(null);
        setSendTo('');
        setSendAmount('');
        await updateRoute('main');
      } else {
        throw new Error(response?.error?.message || '发送交易失败');
      }
    } catch (error: any) {
      setError(error.message || '发送交易失败');
    } finally {
      setSendLoading(false);
    }
  };

  // 切换网络（通过 RPC 方法）
  const handleSwitchNetwork = async (networkId: string) => {
    try {
      const network = networks.find(n => n.id === networkId);
      if (!network) {
        setError('网络不存在');
        return;
      }

      const chainIdHex = '0x' + network.chainId.toString(16);
      const response = await browser.runtime.sendMessage({
        type: 'EIP1193_REQUEST',
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });

      if (response?.success && response.result === null) {
        switchNetwork(networkId);
        await updateRoute('main');
        setError(null);
      } else if (response?.success === false) {
        throw new Error(response.error?.message || '切换网络失败');
      }
    } catch (error: any) {
      console.error('切换网络失败:', error);
      setError(error.message || '切换网络失败');
    }
  };

  // 添加网络（通过 RPC 方法）
  const handleAddNetwork = async () => {
    if (!addNetworkChainId || !addNetworkName || !addNetworkRpcUrl || !addNetworkCurrencySymbol) {
      setError('请填写所有必填字段');
      return;
    }

    let chainIdHex: string;
    if (addNetworkChainId.startsWith('0x')) {
      chainIdHex = addNetworkChainId;
    } else {
      const chainIdNum = parseInt(addNetworkChainId, 10);
      if (isNaN(chainIdNum)) {
        setError('Chain ID 格式无效');
        return;
      }
      chainIdHex = '0x' + chainIdNum.toString(16);
    }

    setAddNetworkLoading(true);
    setError(null);

    try {
      const chainParams: {
        chainId: string;
        chainName: string;
        nativeCurrency: {
          name: string;
          symbol: string;
          decimals: number;
        };
        rpcUrls: string[];
        blockExplorerUrls?: string[];
      } = {
        chainId: chainIdHex,
        chainName: addNetworkName,
        nativeCurrency: {
          name: addNetworkCurrencySymbol,
          symbol: addNetworkCurrencySymbol,
          decimals: 18,
        },
        rpcUrls: [addNetworkRpcUrl],
      };

      if (addNetworkBlockExplorer) {
        chainParams.blockExplorerUrls = [addNetworkBlockExplorer];
      }

      const response = await browser.runtime.sendMessage({
        type: 'EIP1193_REQUEST',
        method: 'wallet_addEthereumChain',
        params: [chainParams],
      });

      if (response?.success && response.result === null) {
        // 从 storage 重新获取网络列表并更新到 store
        const storage = browser.storage.local;
        const result = await storage.get('wallet-store') as { 'wallet-store'?: { state?: { networks?: any[] } } };
        const walletStore = result['wallet-store'];
        if (walletStore?.state?.networks) {
          const chainId = parseInt(chainIdHex, 16);
          const newNetwork = walletStore.state.networks.find((n: any) => n.chainId === chainId);
          if (newNetwork) {
            const exists = networks.find(n => n.chainId === chainId);
            if (!exists) {
              addNetwork(newNetwork);
            }
          }
        }
        await updateRoute('networks');
        setError(null);
        // 清空表单
        setAddNetworkChainId('');
        setAddNetworkName('');
        setAddNetworkRpcUrl('');
        setAddNetworkCurrencySymbol('');
        setAddNetworkBlockExplorer('');
      } else if (response?.success === false) {
        throw new Error(response.error?.message || '添加网络失败');
      }
    } catch (error: any) {
      console.error('添加网络失败:', error);
      setError(error.message || '添加网络失败');
    } finally {
      setAddNetworkLoading(false);
    }
  };

  // 处理授权确认
  const handleAuthApproveClick = async () => {
    try {
      await handleAuthApprove(currentAccount);
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '授权确认失败');
    }
  };

  // 处理授权拒绝
  const handleAuthRejectClick = async () => {
    try {
      await handleAuthReject();
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '授权拒绝失败');
    }
  };

  // 处理签名确认
  const handleSignApproveClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await handleSignApprove();
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '签名确认失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理签名拒绝
  const handleSignRejectClick = async () => {
    try {
      await handleSignReject();
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '签名拒绝失败');
    }
  };

  // 处理切换网络确认
  const handleSwitchChainApproveClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await handleSwitchChainApprove();
      // 切换成功后，更新本地网络状态
      if (switchChainRequest?.targetNetwork) {
        const targetNetwork = networks.find(n => n.id === switchChainRequest.targetNetwork!.id);
        if (targetNetwork) {
          switchNetwork(targetNetwork.id);
        }
      }
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '切换网络失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理切换网络拒绝
  const handleSwitchChainRejectClick = async () => {
    try {
      await handleSwitchChainReject();
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '切换网络拒绝失败');
    }
  };

  // 处理交易确认
  const handleTransactionApproveClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await handleTransactionApprove();
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '交易确认失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理交易拒绝
  const handleTransactionRejectClick = async () => {
    try {
      await handleTransactionReject();
      await updateRoute('main');
      setError(null);
    } catch (error: any) {
      setError(error.message || '交易拒绝失败');
    }
  };

  // 处理添加网络确认
  const handleAddChainApproveClick = async () => {
    try {
      await handleAddChainApprove();
      await updateRoute('main');
    } catch (error: any) {
      // 错误已经在 hook 中处理
    }
  };

  // 处理添加网络拒绝
  const handleAddChainRejectClick = async () => {
    try {
      await handleAddChainReject();
      await updateRoute('main');
    } catch (error: any) {
      // 错误已经在 hook 中处理
    }
  };

  // 处理添加代币确认
  const handleWatchAssetApproveClick = async () => {
    try {
      await handleWatchAssetApprove();
      await updateRoute('main');
    } catch (error: any) {
      // 错误已经在 hook 中处理
    }
  };

  // 处理添加代币拒绝
  const handleWatchAssetRejectClick = async () => {
    try {
      await handleWatchAssetReject();
      await updateRoute('main');
    } catch (error: any) {
      // 错误已经在 hook 中处理
    }
  };

  // 根据路由渲染对应页面
  switch (step) {
    case 'auth':
      return (
        <AuthPage
          authRequest={authRequest}
          onNavigate={updateRoute}
          onApprove={handleAuthApproveClick}
          onReject={handleAuthRejectClick}
          error={error}
          loading={loading}
        />
      );

    case 'sign':
      return (
        <SignPage
          signRequest={signRequest}
          onNavigate={updateRoute}
          onApprove={handleSignApproveClick}
          onReject={handleSignRejectClick}
          error={error}
          loading={loading}
        />
      );

    case 'switch-chain':
      return (
        <SwitchChainPage
          switchChainRequest={switchChainRequest}
          onNavigate={updateRoute}
          onApprove={handleSwitchChainApproveClick}
          onReject={handleSwitchChainRejectClick}
          error={error}
          loading={loading}
        />
      );

    case 'transaction':
      return (
        <TransactionPage
          transactionRequest={transactionRequest}
          onNavigate={updateRoute}
          onApprove={handleTransactionApproveClick}
          onReject={handleTransactionRejectClick}
          error={error}
          loading={loading}
        />
      );

    case 'add-chain':
      return (
        <AddChainPage
          addChainRequest={addChainRequest}
          onNavigate={updateRoute}
          onApprove={handleAddChainApproveClick}
          onReject={handleAddChainRejectClick}
          error={addChainError}
          loading={addChainLoading}
        />
      );

    case 'watch-asset':
      return (
        <WatchAssetPage
          watchAssetRequest={watchAssetRequest}
          onNavigate={updateRoute}
          onApprove={handleWatchAssetApproveClick}
          onReject={handleWatchAssetRejectClick}
          error={watchAssetError}
          loading={watchAssetLoading}
        />
      );

    case 'unlock':
      return (
        <UnlockPage
          password={password}
          onPasswordChange={setPassword}
          onUnlock={handleUnlock}
          onNavigate={updateRoute}
          error={error}
          loading={loading}
        />
      );

    case 'create':
      return (
        <CreateWalletPage
          password={password}
          confirmPassword={confirmPassword}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onCreateWallet={handleCreateWallet}
          onNavigate={updateRoute}
          error={error}
          loading={loading}
          showMnemonic={showMnemonic}
          newMnemonic={newMnemonic}
          onMnemonicConfirmed={handleMnemonicConfirmed}
        />
      );

    case 'import':
      return (
        <ImportWalletPage
          importMnemonic={importMnemonic}
          password={password}
          onImportMnemonicChange={setImportMnemonic}
          onPasswordChange={setPassword}
          onImportWallet={handleImportWallet}
          onNavigate={updateRoute}
          error={error}
          loading={loading}
        />
      );

    case 'send':
      return (
        <SendPage
          sendTo={sendTo}
          sendAmount={sendAmount}
          onSendToChange={setSendTo}
          onSendAmountChange={setSendAmount}
          onSend={handleSend}
          onNavigate={updateRoute}
          error={error}
          loading={sendLoading}
        />
      );

    case 'receive':
      return (
        <ReceivePage
          onNavigate={updateRoute}
          error={error}
        />
      );

    case 'networks':
      return (
        <NetworksPage
          onSwitchNetwork={handleSwitchNetwork}
          onNavigate={updateRoute}
        />
      );

    case 'add-network':
      return (
        <AddNetworkPage
          chainId={addNetworkChainId}
          name={addNetworkName}
          rpcUrl={addNetworkRpcUrl}
          currencySymbol={addNetworkCurrencySymbol}
          blockExplorer={addNetworkBlockExplorer}
          onChainIdChange={setAddNetworkChainId}
          onNameChange={setAddNetworkName}
          onRpcUrlChange={setAddNetworkRpcUrl}
          onCurrencySymbolChange={setAddNetworkCurrencySymbol}
          onBlockExplorerChange={setAddNetworkBlockExplorer}
          onAddNetwork={handleAddNetwork}
          onNavigate={updateRoute}
          error={error}
          loading={addNetworkLoading}
        />
      );

    case 'tokens':
      return (
        <TokensPage
          onNavigate={updateRoute}
        />
      );

    case 'nfts':
      return (
        <NFTsPage
          onNavigate={updateRoute}
        />
      );

    case 'send-token':
      return (
        <SendTokenPage
          onNavigate={updateRoute}
        />
      );

    case 'transfer-nft':
      return (
        <TransferNFTPage
          onNavigate={updateRoute}
        />
      );

    default:
      return (
        <MainPage
          onNavigate={updateRoute}
          onLock={handleLock}
        />
      );
  }
}

export default App;
