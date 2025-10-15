/**
 * Injected script that provides wallet APIs to web pages
 * window.testnetWallet - EVM wallet (similar to window.ethereum)
 * window.solanaTestnetWallet - Solana wallet
 */

(function() {
  'use strict';
  
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
      
      window.postMessage({
        type: `TESTNET_WALLET_${type}`,
        id,
        data,
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
    
    if (event.data.type && event.data.type.endsWith('_RESPONSE')) {
      const { id, response } = event.data;
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
    if (event.data.type === 'TESTNET_WALLET_NETWORK_CHANGED') {
      testnetWallet.emit('chainChanged', event.data.network);
    }
  });
  
  // Helper function to forward RPC calls to public Sepolia endpoint
  async function forwardToRPC(method, params) {
    // Try multiple RPC endpoints for better reliability
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
