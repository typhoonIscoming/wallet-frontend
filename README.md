# WXT 以太坊钱包扩展

一个基于 WXT 框架开发的浏览器扩展钱包，实现了完整的 EIP-1193 标准，支持以太坊生态系统的基本功能。

## 📋 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [功能模块](#功能模块)
- [开发指南](#开发指南)

## ✨ 功能特性

### 核心钱包功能
- ✅ 创建/导入钱包（助记词、私钥）
- ✅ 钱包锁定/解锁
- ✅ 账户管理（创建、切换、重命名）
- ✅ 多账户支持

### 网络管理
- ✅ 多链支持（Ethereum、Polygon、Optimism、BSC、Sepolia 等）
- ✅ 自定义网络添加（EIP-3085 `wallet_addEthereumChain`）
- ✅ 网络切换（EIP-3085 `wallet_switchEthereumChain`）
- ✅ 网络信息显示

### 资产管理
- ✅ 原生代币余额查询和转账
- ✅ ERC-20 代币管理（添加、删除、余额查询、转账）
- ✅ ERC-721 NFT 管理（添加、删除、显示、转账）
- ✅ 代币添加请求（EIP-747 `wallet_watchAsset`）

### DApp 交互
- ✅ 账户授权（`eth_requestAccounts`）
- ✅ 消息签名（`eth_sign`、`personal_sign`）
- ✅ EIP-712 结构化数据签名（`eth_signTypedData`、`eth_signTypedData_v3`、`eth_signTypedData_v4`）
- ✅ 交易签名和发送（`eth_signTransaction`、`eth_sendTransaction`）
- ✅ 用户确认流程（所有敏感操作都需要用户确认）

### 用户体验
- ✅ 现代化 UI 设计（TailwindCSS）
- ✅ 响应式布局
- ✅ 二维码收款地址
- ✅ 交易历史记录
- ✅ 实时余额更新

## 🛠 技术栈

- **框架**: [WXT](https://wxt.dev/) - 现代浏览器扩展开发框架
- **UI 框架**: React 19 + TypeScript
- **样式**: TailwindCSS
- **状态管理**: Zustand
- **加密库**: 
  - `bip39` - 助记词生成和验证
  - `crypto-js` - AES 加密存储
- **区块链交互**: `ethers.js` v6
- **消息传递**: `@webext-core/messaging`

## 📁 项目结构

```
wxt-dev-wxt/
├── assets/                    # 静态资源
│   ├── logo.png              # 应用 Logo
│   └── react.svg
│
├── entrypoints/               # 扩展入口点
│   ├── background.ts         # Background Script 主入口
│   ├── content.ts            # Content Script（注入 Provider）
│   ├── messaging.ts          # 消息传递协议定义
│   │
│   ├── background/           # Background Script 模块
│   │   ├── auth.ts           # 授权请求处理
│   │   ├── popup.ts          # Popup 管理
│   │   ├── router.ts         # EIP-1193 RPC 路由
│   │   ├── sign-handler.ts   # 签名请求处理
│   │   ├── switch-chain-handler.ts  # 网络切换请求处理
│   │   ├── transaction-handler.ts   # 交易请求处理
│   │   ├── types.ts          # Background 类型定义
│   │   ├── utils.ts          # 工具函数
│   │   │
│   │   └── handlers/         # RPC 方法处理器
│   │       ├── accounts.ts   # 账户相关（eth_requestAccounts, eth_accounts）
│   │       ├── balance.ts     # 余额查询（eth_getBalance, eth_blockNumber）
│   │       ├── network.ts    # 网络管理（wallet_switchEthereumChain, wallet_addEthereumChain）
│   │       ├── sign.ts       # 签名方法（eth_sign, personal_sign, eth_signTypedData）
│   │       ├── transaction.ts # 交易方法（eth_sendTransaction, eth_signTransaction）
│   │       ├── token.ts       # 代币管理（wallet_watchAsset）
│   │       ├── add-chain-handler.ts  # 添加网络确认处理
│   │       └── watch-asset-handler.ts # 添加代币确认处理
│   │
│   └── popup/                 # Popup UI
│       ├── App.tsx            # Popup 主应用组件
│       ├── main.tsx           # Popup 入口
│       ├── index.html         # Popup HTML
│       ├── types.ts           # Popup 类型定义
│       │
│       ├── components/        # UI 组件
│       │   ├── MainPage.tsx           # 主页面
│       │   ├── CreateWalletPage.tsx   # 创建钱包
│       │   ├── ImportWalletPage.tsx   # 导入钱包
│       │   ├── UnlockPage.tsx         # 解锁页面
│       │   ├── AuthPage.tsx           # DApp 授权确认
│       │   ├── SignPage.tsx           # 签名确认
│       │   ├── SwitchChainPage.tsx    # 网络切换确认
│       │   ├── TransactionPage.tsx   # 交易确认
│       │   ├── AddChainPage.tsx       # 添加网络确认
│       │   ├── WatchAssetPage.tsx     # 添加代币确认
│       │   ├── SendPage.tsx           # 发送原生代币
│       │   ├── ReceivePage.tsx        # 接收（二维码）
│       │   ├── NetworksPage.tsx       # 网络管理
│       │   ├── AddNetworkPage.tsx    # 手动添加网络
│       │   ├── TokensPage.tsx         # 代币列表
│       │   ├── SendTokenPage.tsx      # 发送代币
│       │   ├── NFTsPage.tsx           # NFT 列表
│       │   ├── TransferNFTPage.tsx    # 转账 NFT
│       │   └── Header.tsx             # 通用头部组件
│       │
│       └── hooks/             # React Hooks
│           ├── usePopupRoute.ts       # Popup 路由管理
│           ├── useAuth.ts             # 授权请求管理
│           ├── useSign.ts             # 签名请求管理
│           ├── useSwitchChain.ts      # 网络切换请求管理
│           ├── useTransaction.ts       # 交易请求管理
│           ├── useAddChain.ts         # 添加网络请求管理
│           ├── useWatchAsset.ts       # 添加代币请求管理
│           ├── useBalance.ts           # 余额查询
│           ├── useTokenBalance.ts      # 代币余额查询
│           └── useNFTBalance.ts        # NFT 余额查询
│
├── lib/                       # 共享库
│   ├── wallet-store.ts       # Zustand 钱包状态管理
│   ├── provider.ts           # EIP-1193 Provider 实现
│   ├── inject-provider.ts    # Provider 注入脚本（TypeScript）
│   └── inject-provider.js    # Provider 注入脚本（编译后）
│
├── types/                     # TypeScript 类型定义
│   ├── wallet.ts             # 钱包相关类型（WalletState, Network, Token, NFT）
│   ├── eip1193.ts            # EIP-1193 标准类型定义
│   ├── bip39.d.ts            # bip39 类型声明
│   └── crypto-js.d.ts        # crypto-js 类型声明
│
├── public/                    # 公共资源
│   ├── icon/                 # 扩展图标
│   └── inject-provider.js    # 注入脚本（web-accessible）
│
├── test.html                  # 测试页面（用于测试 DApp 交互）
│
├── wxt.config.ts              # WXT 配置文件
├── tailwind.config.ts         # TailwindCSS 配置
├── tsconfig.json              # TypeScript 配置
└── package.json               # 项目依赖
```

## 🎯 功能模块

### 1. Background Script (`entrypoints/background.ts`)

**职责**: 处理所有 EIP-1193 RPC 请求，管理钱包状态，协调各个模块

**核心功能**:
- RPC 请求路由分发
- 钱包状态管理（加密存储）
- 用户确认流程管理
- Popup 路由控制
- 消息传递协调

**关键模块**:
- `router.ts`: EIP-1193 方法路由
- `handlers/`: 各 RPC 方法的具体实现
- `auth.ts`: DApp 授权流程
- `utils.ts`: 钱包状态获取、Provider 创建等工具函数

### 2. Content Script (`entrypoints/content.ts`)

**职责**: 将 EIP-1193 Provider 注入到页面上下文

**核心功能**:
- 注入 `inject-provider.js` 到页面
- 监听页面 RPC 请求并转发到 Background
- 处理网络切换事件通知

### 3. Provider 注入 (`lib/inject-provider.ts`)

**职责**: 在页面上下文中创建 `window.ethereum` 对象

**核心功能**:
- 实现 EIP-1193 Provider API
- 通过 `postMessage` 与 Content Script 通信
- 处理 Provider 事件（`accountsChanged`、`chainChanged`）

### 4. Popup UI (`entrypoints/popup/`)

**职责**: 用户界面，处理所有用户交互

**核心功能**:
- 钱包创建/导入/解锁
- 账户管理
- 网络管理
- 代币和 NFT 管理
- DApp 交互确认（授权、签名、交易等）

**组件分类**:
- **钱包管理**: `CreateWalletPage`, `ImportWalletPage`, `UnlockPage`
- **DApp 确认**: `AuthPage`, `SignPage`, `SwitchChainPage`, `TransactionPage`, `AddChainPage`, `WatchAssetPage`
- **资产管理**: `SendPage`, `ReceivePage`, `TokensPage`, `NFTsPage`, `SendTokenPage`, `TransferNFTPage`
- **设置**: `NetworksPage`, `AddNetworkPage`

### 5. 状态管理 (`lib/wallet-store.ts`)

**职责**: 使用 Zustand 管理全局钱包状态

**状态结构**:
```typescript
{
  isLocked: boolean              // 钱包是否锁定
  accounts: Account[]            // 账户列表
  currentAccount: Account       // 当前账户
  networks: Network[]           // 网络列表
  currentNetwork: Network       // 当前网络
  tokens: Token[]               // 代币列表
  nftCollections: NFTCollection[] // NFT 集合列表
  // ... 操作方法
}
```

**存储方式**: 使用 `chrome.storage.local` 加密存储私钥和助记词

### 6. 类型定义 (`types/`)

**核心类型文件**:
- `wallet.ts`: 钱包状态、网络、代币、NFT 等类型
- `eip1193.ts`: EIP-1193 标准类型（RPC 方法、错误代码等）

## 🚀 开发指南

### 安装依赖

```bash
npm install
# 或
bun install
```

### 开发模式

```bash
# Chrome/Edge
npm run dev

# Firefox
npm run dev:firefox
```

### 构建

```bash
# Chrome/Edge
npm run build

# Firefox
npm run build:firefox
```

### 打包

```bash
# Chrome/Edge
npm run zip

# Firefox
npm run zip:firefox
```

### 测试

1. 打开 `test.html` 文件（通过本地服务器）
2. 在浏览器中加载扩展
3. 创建或导入钱包
4. 在测试页面中测试各种 DApp 交互功能

## 📝 实现的标准

- **EIP-1193**: Ethereum Provider JavaScript API
- **EIP-1474**: JSON-RPC Methods
- **EIP-3085**: `wallet_addEthereumChain` 和 `wallet_switchEthereumChain`
- **EIP-747**: `wallet_watchAsset`
- **EIP-712**: 结构化数据签名

## 🔒 安全特性

- 私钥和助记词使用 AES 加密存储
- 所有敏感操作都需要用户确认
- 钱包自动锁定机制
- 密码强度验证

## 📄 许可证

MIT
