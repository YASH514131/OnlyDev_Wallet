/**
 * Content script that injects wallet APIs into web pages
 * Provides window.testnetWallet (EVM) and window.solanaTestnetWallet (Solana)
 */

// Inject the wallet API script into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
  // Remove script tag after injection
  script.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the injected script
window.addEventListener('message', async (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;
  
  if (event.data.type && event.data.type.startsWith('TESTNET_WALLET_')) {
    console.log('Content script received:', event.data);
    
    try {
      // Forward to background script
      const response = await chrome.runtime.sendMessage({
        type: event.data.type.replace('TESTNET_WALLET_', ''),
        data: event.data.data,
      });
      
      // Send response back to page
      window.postMessage({
        type: event.data.type + '_RESPONSE',
        id: event.data.id,
        response,
      }, '*');
    } catch (error: any) {
      window.postMessage({
        type: event.data.type + '_RESPONSE',
        id: event.data.id,
        response: { success: false, error: error.message },
      }, '*');
    }
  }
});

// Listen for network changes from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NETWORK_CHANGED') {
    window.postMessage({
      type: 'TESTNET_WALLET_NETWORK_CHANGED',
      network: message.network,
    }, '*');
  }
});

export {};
