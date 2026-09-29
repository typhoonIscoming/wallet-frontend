/**
 * 消息传递协议定义
 * 
 * 【作用】
 * 使用类型安全的消息传递系统，定义所有扩展内部组件之间的消息协议。
 * 
 * 【设计模式】
 * 使用 TypeScript 接口定义消息类型，确保：
 * 1. 类型安全：编译时检查消息格式
 * 2. 代码提示：IDE 自动补全消息类型
 * 3. 文档化：接口即文档，清晰展示所有消息类型
 * 
 * 【消息分类】
 * 1. EIP1193_REQUEST: DApp RPC 请求（Content → Background）
 * 2. POPUP_*: Popup 路由管理（Popup ↔ Background）
 * 3. AUTH_REQUEST_*: 账户授权确认（Popup ↔ Background）
 * 4. SIGN_REQUEST_*: 签名确认（Popup ↔ Background）
 * 5. SWITCH_CHAIN_REQUEST_*: 网络切换确认（Popup ↔ Background）
 * 6. TRANSACTION_REQUEST_*: 交易确认（Popup ↔ Background）
 * 7. ADD_CHAIN_REQUEST_*: 添加网络确认（Popup ↔ Background）
 * 8. WATCH_ASSET_REQUEST_*: 添加代币确认（Popup ↔ Background）
 * 
 * 【使用方式】
 * - Background: browser.runtime.onMessage.addListener
 * - Popup/Content: browser.runtime.sendMessage
 * - 或使用 @webext-core/messaging 提供的类型安全 API
 */
import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { defineExtensionMessaging } from '@webext-core/messaging';

/**
 * 消息协议映射
 * 
 * 格式：消息类型名: { 请求类型: 响应类型 }
 * - void 表示不需要请求数据
 * - 对象表示请求数据格式
 */
interface ProtocolMap {
  getStringLength(s: string): number;
  // EIP-1193 RPC 请求
  EIP1193_REQUEST: {
    method: string;
    params?: readonly unknown[] | object;
  };
  // Popup 路由管理
  POPUP_GET_ROUTE: void;
  POPUP_SET_ROUTE: { route: string };
  POPUP_ROUTE_CHANGED: { route: string };
  // 授权请求
  AUTH_REQUEST_GET: void;
  AUTH_REQUEST_APPROVE: { requestId: string; accounts: string[] };
  AUTH_REQUEST_REJECT: { requestId: string };
  // 签名请求
  SIGN_REQUEST_GET: void;
  SIGN_REQUEST_APPROVE: { requestId: string };
  SIGN_REQUEST_REJECT: { requestId: string };
  // 切换网络请求
  SWITCH_CHAIN_REQUEST_GET: void;
  SWITCH_CHAIN_REQUEST_APPROVE: { requestId: string };
  SWITCH_CHAIN_REQUEST_REJECT: { requestId: string };
  // 交易请求
  TRANSACTION_REQUEST_GET: void;
  TRANSACTION_REQUEST_APPROVE: { requestId: string };
  TRANSACTION_REQUEST_REJECT: { requestId: string };
  // 添加网络请求
  ADD_CHAIN_REQUEST_GET: void;
  ADD_CHAIN_REQUEST_APPROVE: { requestId: string };
  ADD_CHAIN_REQUEST_REJECT: { requestId: string };
  // 添加代币请求
  WATCH_ASSET_REQUEST_GET: void;
  WATCH_ASSET_REQUEST_APPROVE: { requestId: string };
  WATCH_ASSET_REQUEST_REJECT: { requestId: string };
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();

export default defineUnlistedScript(() => {
  // 初始化消息传递
});
