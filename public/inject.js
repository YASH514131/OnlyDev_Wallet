/**
 * Injected script that provides wallet APIs to web pages
 * window.testnetWallet - EVM wallet (similar to window.ethereum)
 * window.solanaTestnetWallet - Solana wallet
 */

(function() {
  'use strict';
  
  const HANDSHAKE_EVENT = 'TESTNET_WALLET_HANDSHAKE';
  let handshakeAcknowledged = false;
  const HANDSHAKE_TOKEN = (() => {
    try {
      const buffer = new Uint32Array(4);
      window.crypto.getRandomValues(buffer);
      return Array.from(buffer).map(n => n.toString(16).padStart(8, '0')).join('-');
    } catch (error) {
      console.warn('⚠️ Failed to generate cryptographic token, falling back to Date.now()', error);
      return `fallback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  })();
  
  const HEX_REGEX = /^0x[0-9a-fA-F]*$/;
  const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
  const HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
  const QUANTITY_REGEX = /^0x[0-9a-fA-F]{1,64}$/;
  const BLOCK_TAGS = new Set(['latest', 'earliest', 'pending', 'safe', 'finalized']);
  
  const isHexString = (value, evenLength = true) => {
    if (typeof value !== 'string' || !HEX_REGEX.test(value)) {
      return false;
    }
    return evenLength ? (value.length % 2 === 0) : true;
  };
  
  const isAddress = (value) => typeof value === 'string' && ADDRESS_REGEX.test(value);
  const isHash = (value) => typeof value === 'string' && HASH_REGEX.test(value);
  const isQuantity = (value) => typeof value === 'string' && QUANTITY_REGEX.test(value);
  const isData = (value) => isHexString(value, false);
  const isBlockTag = (value) => typeof value === 'string' && (BLOCK_TAGS.has(value) || isQuantity(value));
  
  const RPC_VALIDATORS = {
    eth_getBalance: (params) => Array.isArray(params) && params.length >= 1 && params.length <= 2 && isAddress(params[0]) && (params.length === 1 || isBlockTag(params[1])),
    eth_getTransactionCount: (params) => Array.isArray(params) && params.length === 2 && isAddress(params[0]) && isBlockTag(params[1]),
    eth_getCode: (params) => Array.isArray(params) && params.length >= 1 && params.length <= 2 && isAddress(params[0]) && (params.length === 1 || isBlockTag(params[1])),
    eth_call: (params) => Array.isArray(params) && params.length >= 1 && params.length <= 2 && typeof params[0] === 'object' && params[0] !== null && (!params[0].to || isAddress(params[0].to)) && (!params[0].data || isData(params[0].data)) && (params.length === 1 || isBlockTag(params[1])),
    eth_estimateGas: (params) => Array.isArray(params) && params.length >= 1 && params.length <= 2 && typeof params[0] === 'object' && params[0] !== null,
  eth_getTransactionReceipt: (params) => Array.isArray(params) && params.length === 1 && isHash(params[0]),
  eth_getTransactionByHash: (params) => Array.isArray(params) && params.length === 1 && isHash(params[0]),
  eth_getBlockByHash: (params) => Array.isArray(params) && params.length === 2 && isHash(params[0]) && typeof params[1] === 'boolean',
    eth_getBlockByNumber: (params) => Array.isArray(params) && params.length === 2 && isBlockTag(params[0]) && typeof params[1] === 'boolean',
  eth_getTransactionByBlockHashAndIndex: (params) => Array.isArray(params) && params.length === 2 && isHash(params[0]) && isQuantity(params[1]),
    eth_getTransactionByBlockNumberAndIndex: (params) => Array.isArray(params) && params.length === 2 && isBlockTag(params[0]) && isQuantity(params[1]),
  eth_getBlockTransactionCountByHash: (params) => Array.isArray(params) && params.length === 1 && isHash(params[0]),
    eth_getBlockTransactionCountByNumber: (params) => Array.isArray(params) && params.length === 1 && isBlockTag(params[0]),
  eth_getUncleCountByBlockHash: (params) => Array.isArray(params) && params.length === 1 && isHash(params[0]),
    eth_getUncleCountByBlockNumber: (params) => Array.isArray(params) && params.length === 1 && isBlockTag(params[0]),
    eth_gasPrice: (params) => Array.isArray(params) && params.length === 0,
    eth_maxPriorityFeePerGas: (params) => Array.isArray(params) && params.length === 0,
  eth_feeHistory: (params) => Array.isArray(params) && params.length === 3 && isQuantity(params[0]) && isBlockTag(params[1]) && Array.isArray(params[2]),
    eth_getLogs: (params) => Array.isArray(params) && params.length === 1 && typeof params[0] === 'object' && params[0] !== null,
    eth_blockNumber: (params) => Array.isArray(params) && params.length === 0,
    net_version: (params) => Array.isArray(params) && params.length === 0,
    web3_clientVersion: (params) => Array.isArray(params) && params.length === 0,
  };
  
  const validateRpcParams = (method, params) => {
    const validator = RPC_VALIDATORS[method];
    if (!validator) {
      return;
    }
    const safeParams = Array.isArray(params) ? params : [];
    if (!validator(safeParams)) {
      throw new Error(`Invalid parameters for ${method}`);
    }
  };
  
  // Establish handshake with the content script so only trusted messages are processed
  try {
    window.postMessage({
      type: HANDSHAKE_EVENT,
      token: HANDSHAKE_TOKEN,
    }, '*');
  } catch (handshakeError) {
    console.error('❌ Failed to send handshake message:', handshakeError);
  }
  
  // Immediately block Phantom from taking over ethereum
  if (window.ethereum && window.ethereum.isPhantom) {
    console.log('🧩 Phantom detected, overriding with TestNet Wallet');
    window.phantomEthereum = window.ethereum;
    delete window.ethereum;
  }
  
  let requestId = 0;
  const pendingRequests = new Map();
  
  // Helper to send message to content script
  function sendMessage(type, data) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      pendingRequests.set(id, { resolve, reject });
      if (!handshakeAcknowledged) {
        console.debug('⌛ Handshake not yet acknowledged; proceeding cautiously');
      }
      
      window.postMessage({
        type: `TESTNET_WALLET_${type}`,
        id,
        data,
        token: HANDSHAKE_TOKEN,
      }, '*');
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
  
  // Listen for responses
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }
    
    if (message.type === HANDSHAKE_EVENT) {
      if (message.acknowledged) {
        handshakeAcknowledged = true;
        console.log('🤝 Handshake acknowledged by content script');
      }
      return;
    }
    
    if (message.token !== HANDSHAKE_TOKEN) {
      // Ignore messages without the trusted token
      return;
    }

    if (message.type && message.type.endsWith('_RESPONSE')) {
        const { id, response } = message;
      const pending = pendingRequests.get(id);
      
      if (pending) {
        pendingRequests.delete(id);
        if (response.success) {
          pending.resolve(response);
        } else {
          pending.reject(new Error(response.error || 'Unknown error'));
        }
      }
    }
    
    // Handle network changes
      if (message.type === 'TESTNET_WALLET_NETWORK_CHANGED') {
      testnetWallet.emit('chainChanged', event.data.network);
    }
  });
  
  // Helper function to forward RPC calls to public Sepolia endpoint
  async function forwardToRPC(method, params) {
    // Try multiple RPC endpoints for better reliability
    validateRpcParams(method, params);
    const RPC_URLS = [
      'https://sepolia.gateway.tenderly.co',
      'https://ethereum-sepolia.publicnode.com',
      'https://rpc.sepolia.org',
      'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura key
    ];

    const fetchWithTimeout = async (url, body, timeoutMs = 8000) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
    };
    
    const requestBody = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    });
    
    for (const RPC_URL of RPC_URLS) {
      try {
        const response = await fetchWithTimeout(RPC_URL, requestBody);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          // Log the error but try next endpoint
          console.warn('⚠️ RPC error from', RPC_URL, ':', data.error.message);
          throw new Error(data.error.message);
        }
        
        console.log('🟢 RPC response for', method, ':', data.result);
        return data.result;
      } catch (error) {
        const message = error?.message || error?.name || 'Unknown error';
        const isAbort = error?.name === 'AbortError';
        console.warn(`⚠️ RPC endpoint failed: ${RPC_URL} (${isAbort ? 'timeout' : message})`);
        // Try next endpoint
        continue;
      }
    }
    
    // All endpoints failed
    console.error('🔴 All RPC endpoints failed for method:', method);
    throw new Error('Failed to connect to Sepolia network. Please check your internet connection.');
  }
  
  // EVM Wallet API (similar to window.ethereum)
  const testnetWallet = {
    isTestnetWallet: true,
    isMetaMask: true, // Pretend to be MetaMask so Remix detects us
    isPhantom: false, // Explicitly not Phantom
    isBraveWallet: false,
    isCoinbaseWallet: false,
    isRabby: false,
    _metamask: {
      isUnlocked: () => Promise.resolve(true),
    },
    
    // Request user accounts
    async request(args) {
      const { method, params = [] } = args;
      
      console.log('🔵 Wallet request:', method, params);
      
      switch (method) {
        case 'eth_requestAccounts':
          try {
            const response = await sendMessage('REQUEST_ACCOUNTS');
            console.log('🔵 REQUEST_ACCOUNTS response:', response);
            if (response.success && response.accounts) {
              return response.accounts;
            } else {
              throw new Error(response.error || 'Failed to get accounts');
            }
          } catch (error) {
            console.error('🔴 eth_requestAccounts error:', error);
            throw error;
          }
          
        case 'eth_accounts':
          try {
            const accountsResponse = await sendMessage('GET_ACCOUNTS');
            console.log('🔵 GET_ACCOUNTS response:', accountsResponse);
            return accountsResponse.accounts || [];
          } catch (error) {
            console.error('🔴 eth_accounts error:', error);
            return [];
          }
          
        case 'eth_chainId':
          const stateResponse = await sendMessage('GET_WALLET_STATE');
          return stateResponse.data?.selectedNetwork || '0xaa36a7'; // Sepolia chainId
          
        case 'net_version':
          return '11155111'; // Sepolia network ID (decimal)
          
        case 'eth_getBalance':
        case 'eth_blockNumber':
        case 'eth_getBlockByNumber':
        case 'eth_getBlockByHash':
        case 'eth_getTransactionCount':
        case 'eth_getTransactionReceipt':
        case 'eth_getTransactionByHash':
        case 'eth_getTransactionByBlockHashAndIndex':
        case 'eth_getTransactionByBlockNumberAndIndex':
        case 'eth_getBlockTransactionCountByHash':
        case 'eth_getBlockTransactionCountByNumber':
        case 'eth_getUncleCountByBlockHash':
        case 'eth_getUncleCountByBlockNumber':
        case 'eth_call':
        case 'eth_estimateGas':
        case 'eth_gasPrice':
        case 'eth_maxPriorityFeePerGas':
        case 'eth_feeHistory':
        case 'eth_syncing':
        case 'eth_getCode':
        case 'eth_getLogs':
        case 'web3_clientVersion':
          // Forward these to Sepolia RPC
          return await forwardToRPC(method, params);
          
        case 'eth_sendTransaction':
          try {
            const response = await sendMessage('SEND_TRANSACTION', params[0]);
            console.log('🔵 SEND_TRANSACTION response:', response);
            if (response.success && response.hash) {
              return response.hash;
            } else {
              throw new Error(response.error || 'Transaction failed');
            }
          } catch (error) {
            console.error('🔴 eth_sendTransaction error:', error);
            throw error;
          }
          
        case 'eth_sign':
        case 'personal_sign':
          return await sendMessage('SIGN_TRANSACTION', { data: params[0] });
          
        case 'wallet_switchEthereumChain':
          await sendMessage('SWITCH_NETWORK', { network: params[0].chainId });
          return null;
          
        default:
          console.warn('🟡 Unsupported method:', method);
          throw new Error(`Method ${method} not supported`);
      }
    },
    
    // Event emitter
    _events: {},
    
    on(event, callback) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(callback);
    },
    
    removeListener(event, callback) {
      if (this._events[event]) {
        this._events[event] = this._events[event].filter(cb => cb !== callback);
      }
    },
    
    emit(event, ...args) {
      if (this._events[event]) {
        this._events[event].forEach(callback => {
          try {
            callback(...args);
          } catch (error) {
            console.error('Event callback error:', error);
          }
        });
      }
    },
  };
  
  // Solana Wallet API
  const solanaTestnetWallet = {
    isTestnetWallet: true,
    isPhantom: false, // Explicitly not Phantom
    
    async connect() {
      const response = await sendMessage('REQUEST_ACCOUNTS');
      return { publicKey: response.accounts?.[0] || '' };
    },
    
    async disconnect() {
      // No-op for testnet wallet
    },
    
    async signTransaction(transaction) {
      const response = await sendMessage('SIGN_TRANSACTION', { transaction });
      return response.signedTransaction;
    },
    
    async signAllTransactions(transactions) {
      const response = await sendMessage('SIGN_TRANSACTION', { transactions });
      return response.signedTransactions;
    },
    
    async signAndSendTransaction(transaction) {
      const response = await sendMessage('SEND_TRANSACTION', { transaction });
      return { signature: response.signature };
    },
    
    async signMessage(message) {
      const response = await sendMessage('SIGN_TRANSACTION', { 
        message: Array.from(message) 
      });
      return { signature: new Uint8Array(response.signature) };
    },
    
    // Event emitter
    _events: {},
    
    on(event, callback) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(callback);
    },
    
    removeListener(event, callback) {
      if (this._events[event]) {
        this._events[event] = this._events[event].filter(cb => cb !== callback);
      }
    },
  };
  
  // Inject into window
  Object.defineProperty(window, 'testnetWallet', {
    value: testnetWallet,
    writable: false,
    configurable: false,
  });
  
  Object.defineProperty(window, 'solanaTestnetWallet', {
    value: solanaTestnetWallet,
    writable: false,
    configurable: false,
  });
  
  // Force inject as window.ethereum for Remix compatibility
  // Store existing ethereum provider if present
  const existingProvider = window.ethereum;
  
  // Override window.ethereum completely
  try {
    delete window.ethereum;
  } catch (e) {
    // If can't delete, try to override
  }
  
  Object.defineProperty(window, 'ethereum', {
    value: testnetWallet,
    writable: true,
    configurable: true,
  });
  
  // Also hide Phantom's specific properties
  if (window.phantom) {
    window.phantomBackup = window.phantom;
    delete window.phantom;
  }
  
  // Store backup reference
  if (existingProvider) {
    window.phantomEthereum = existingProvider;
    console.log('⚠️ Phantom wallet moved to window.phantomEthereum');
  }
  
  console.log('🧩 TestNet Wallet injected as window.ethereum (Remix compatible)');
  console.log('Provider flags:', {
    isTestnetWallet: window.ethereum.isTestnetWallet,
    isPhantom: window.ethereum.isPhantom,
    isMetaMask: window.ethereum.isMetaMask
  });
  console.log('🔍 Test the wallet: Type "window.ethereum.request({ method: \'eth_requestAccounts\' })" in console');
  
  // Announce to the page that the wallet is ready
  window.dispatchEvent(new Event('testnetWallet#initialized'));
  window.dispatchEvent(new Event('ethereum#initialized'));
  
  // EIP-6963: Announce provider (new standard for Remix)
  const announceProvider = () => {
    const info = {
      uuid: crypto.randomUUID ? crypto.randomUUID() : 'testnet-wallet-' + Date.now(),
      name: 'TestNet Developer Wallet',
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%234F46E5"/><text x="50" y="70" font-size="60" text-anchor="middle" fill="white">T</text></svg>',
      rdns: 'io.github.testnet-wallet',
    };

    window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider', {
        detail: Object.freeze({ info, provider: testnetWallet }),
      })
    );
  };

  // Announce immediately
  announceProvider();

  // Listen for request to announce provider
  window.addEventListener('eip6963:requestProvider', (event) => {
    announceProvider();
  });
  
  console.log('🧩 TestNet Wallet APIs injected');
  console.log('📢 EIP-6963 provider announced');
})();
