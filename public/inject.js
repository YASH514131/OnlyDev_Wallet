/**
 * Injected script that provides wallet APIs to web pages
 * window.testnetWallet - EVM wallet (similar to window.ethereum)
 * window.solanaTestnetWallet - Solana wallet
 */

(function() {
  'use strict';
  
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
  
  // EVM Wallet API (similar to window.ethereum)
  const testnetWallet = {
    isTestnetWallet: true,
    isMetaMask: false, // Explicitly not MetaMask
    
    // Request user accounts
    async request(args) {
      const { method, params = [] } = args;
      
      switch (method) {
        case 'eth_requestAccounts':
          const response = await sendMessage('REQUEST_ACCOUNTS');
          return response.accounts || [];
          
        case 'eth_accounts':
          const accountsResponse = await sendMessage('GET_ACCOUNTS');
          return accountsResponse.accounts || [];
          
        case 'eth_chainId':
          const stateResponse = await sendMessage('GET_WALLET_STATE');
          return stateResponse.data?.selectedNetwork || 'sepolia';
          
        case 'eth_sendTransaction':
          return await sendMessage('SEND_TRANSACTION', params[0]);
          
        case 'eth_sign':
        case 'personal_sign':
          return await sendMessage('SIGN_TRANSACTION', { data: params[0] });
          
        case 'wallet_switchEthereumChain':
          await sendMessage('SWITCH_NETWORK', { network: params[0].chainId });
          return null;
          
        default:
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
  
  // Announce to the page that the wallet is ready
  window.dispatchEvent(new Event('testnetWallet#initialized'));
  
  console.log('🧩 TestNet Wallet APIs injected');
})();
