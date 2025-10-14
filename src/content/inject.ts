/**
 * Content script that injects wallet APIs into web pages
 * Provides window.testnetWallet (EVM) and window.solanaTestnetWallet (Solana)
 */

// Inject ASAP to beat other wallets
function injectScript() {
  try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.onload = function() {
      script.remove();
    };
    
    // Inject at the very beginning
    const target = document.head || document.documentElement;
    if (target.firstChild) {
      target.insertBefore(script, target.firstChild);
    } else {
      target.appendChild(script);
    }
  } catch (error) {
    console.error('Failed to inject TestNet Wallet:', error);
  }
}

// Run immediately
injectScript();

// Listen for messages from the injected script
window.addEventListener('message', async (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;
  
  // Ignore our own response messages to prevent infinite loop
  if (event.data.type && event.data.type.startsWith('TESTNET_WALLET_') && !event.data.type.endsWith('_RESPONSE')) {
    console.log('📤 Content script received:', event.data.type);
    
    try {
      // Check if extension context is valid
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated. Please refresh the page.');
      }
      
      // Forward to background script
      const backgroundRequest = {
        type: event.data.type.replace('TESTNET_WALLET_', ''),
        data: event.data.data,
      };
      console.log('📤 Forwarding to background:', backgroundRequest);
      
      const response = await chrome.runtime.sendMessage(backgroundRequest);
      console.log('📥 Background response:', response);
      
      // Send response back to page
      window.postMessage({
        type: event.data.type + '_RESPONSE',
        id: event.data.id,
        response,
      }, '*');
      console.log('✅ Response sent to page');
    } catch (error: any) {
      console.error('❌ Error forwarding message:', error);
      
      // Provide helpful error message
      let errorMessage = error.message;
      if (error.message.includes('Extension context invalidated')) {
        errorMessage = 'Extension was updated. Please refresh this page to reconnect your wallet.';
      }
      
      window.postMessage({
        type: event.data.type + '_RESPONSE',
        id: event.data.id,
        response: { success: false, error: errorMessage },
      }, '*');
    }
  }
});

// Listen for network changes from background
chrome.runtime.onMessage.addListener((message) => {
  try {
    if (!chrome.runtime?.id) {
      console.warn('⚠️ Extension context invalidated, skipping network change notification');
      return;
    }
    
    if (message.type === 'NETWORK_CHANGED') {
      window.postMessage({
        type: 'TESTNET_WALLET_NETWORK_CHANGED',
        network: message.network,
      }, '*');
    }
  } catch (error) {
    console.error('❌ Error handling background message:', error);
  }
});

export {};
