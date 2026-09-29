/**
 * 注入 EIP-1193 提供者到页面的脚本
 * 这个脚本会在页面上下文中执行
 */
export function getInjectionScript(): string {
	return `
(function() {
  'use strict';
  
  // 避免重复注入
  if (window.ethereum && window.ethereum._isWxtProvider) {
    console.log('[WXT EIP-1193] Provider already injected');
    return;
  }

  console.log('[WXT EIP-1193] Injecting provider...');

  const listeners = new Map();
  let isConnected = false;
  let chainId = '0x1';
  let accounts = [];

  function emit(event, ...args) {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.error(\`Error in event listener for "\${event}":\`, error);
        }
      });
    }
  }

  async function sendRpcRequest(method, params) {
    return new Promise((resolve, reject) => {
      const messageId = \`\${Date.now()}-\${Math.random()}\`;
      
      const responseHandler = (event) => {
        if (
          event.data?.source === 'wxt-eip1193-content' &&
          event.data?.messageId === messageId
        ) {
          window.removeEventListener('message', responseHandler);
          
          if (event.data.error) {
            const error = new Error(event.data.error.message || 'RPC Error');
            error.code = event.data.error.code || 4200;
            error.data = event.data.error.data;
            reject(error);
          } else {
            resolve(event.data.result);
          }
        }
      };

      window.addEventListener('message', responseHandler);

      // 发送请求到 content script
      window.postMessage(
        {
          source: 'wxt-eip1193-page',
          messageId,
          method,
          params,
        },
        '*'
      );

      // 超时处理
      setTimeout(() => {
        window.removeEventListener('message', responseHandler);
        const error = new Error('Request timeout');
        error.code = 4900;
        reject(error);
      }, 30000);
    });
  }

  const provider = {
    _isWxtProvider: true,
    
    async request({ method, params }) {
      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts': {
          const result = await sendRpcRequest(method, params);
          if (Array.isArray(result) && result.length > 0) {
            const oldAccounts = JSON.stringify(accounts);
            accounts = result;
            if (oldAccounts !== JSON.stringify(accounts)) {
              emit('accountsChanged', accounts);
            }
            if (!isConnected) {
              isConnected = true;
              emit('connect', { chainId });
            }
          }
          return result;
        }

        case 'eth_chainId': {
          const result = await sendRpcRequest(method, params);
          if (result && result !== chainId) {
            chainId = result;
            emit('chainChanged', chainId);
          }
          return result;
        }

        default:
          return sendRpcRequest(method, params);
      }
    },

    on(event, listener) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event).add(listener);
    },

    removeListener(event, listener) {
      const eventListeners = listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(listener);
        if (eventListeners.size === 0) {
          listeners.delete(event);
        }
      }
    },

    removeAllListeners(event) {
      if (event) {
        listeners.delete(event);
      } else {
        listeners.clear();
      }
    },
  };

  // 注入到 window.ethereum
  try {
    Object.defineProperty(window, 'ethereum', {
      value: provider,
      writable: false,
      configurable: false,
    });
    console.log('[WXT EIP-1193] Provider injected successfully');
  } catch (error) {
    // 如果 defineProperty 失败，尝试直接赋值
    console.warn('[WXT EIP-1193] Failed to use defineProperty, using direct assignment:', error);
    window.ethereum = provider;
  }

  // 触发 ready 事件（某些应用会监听这个）
  try {
    window.dispatchEvent(new Event('ethereum#initialized'));
  } catch (e) {
    // 某些环境可能不支持 Event 构造函数
    const evt = document.createEvent('Event');
    evt.initEvent('ethereum#initialized', false, false);
    window.dispatchEvent(evt);
  }
})();
`;
}
