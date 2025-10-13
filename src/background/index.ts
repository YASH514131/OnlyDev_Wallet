/**
 * Background service worker for TestNet Wallet extension
 * Handles communication between content scripts and popup
 */

// Keep service worker alive
let keepAliveInterval: NodeJS.Timeout | undefined;

function keepAlive() {
  keepAliveInterval = setInterval(() => {
    console.log('Keeping service worker alive...');
  }, 20000);
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('TestNet Wallet installed');
  keepAlive();
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.type) {
    case 'GET_WALLET_STATE':
      handleGetWalletState(sendResponse);
      return true; // Keep channel open for async response
      
    case 'SIGN_TRANSACTION':
      handleSignTransaction(request.data, sendResponse);
      return true;
      
    case 'SEND_TRANSACTION':
      handleSendTransaction(request.data, sendResponse);
      return true;
      
    case 'GET_ACCOUNTS':
      handleGetAccounts(sendResponse);
      return true;
      
    case 'REQUEST_ACCOUNTS':
      handleRequestAccounts(sendResponse);
      return true;
      
    case 'SWITCH_NETWORK':
      handleSwitchNetwork(request.data, sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
  
  return false;
});

// Handle getting wallet state
async function handleGetWalletState(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.local.get(['walletState', 'selectedNetwork']);
    sendResponse({
      success: true,
      data: {
        walletState: result.walletState || null,
        selectedNetwork: result.selectedNetwork || 'sepolia',
      },
    });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle transaction signing
async function handleSignTransaction(data: any, sendResponse: (response: any) => void) {
  try {
    // This would open the popup for user approval
    // For now, we'll just acknowledge the request
    console.log('Sign transaction request:', data);
    
    // Create notification for user approval
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Transaction Signature Request',
      message: `Sign transaction to ${data.to}`,
      priority: 2,
    });
    
    sendResponse({ success: true, message: 'Transaction signing requested' });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle sending transaction
async function handleSendTransaction(data: any, sendResponse: (response: any) => void) {
  try {
    console.log('Send transaction request:', data);
    
    // Create notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Transaction Request',
      message: `Send ${data.value} to ${data.to}`,
      priority: 2,
    });
    
    sendResponse({ success: true, message: 'Transaction requested' });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle get accounts
async function handleGetAccounts(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.local.get(['walletState']);
    const walletState = result.walletState;
    
    if (!walletState || !walletState.evmAddress) {
      sendResponse({ success: true, accounts: [] });
      return;
    }
    
    sendResponse({
      success: true,
      accounts: [walletState.evmAddress],
    });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle request accounts (requires user approval)
async function handleRequestAccounts(sendResponse: (response: any) => void) {
  try {
    const result = await chrome.storage.local.get(['walletState', 'connectedSites']);
    const walletState = result.walletState;
    
    if (!walletState || !walletState.evmAddress) {
      sendResponse({ success: false, error: 'No wallet found' });
      return;
    }
    
    // In a real implementation, this would prompt the user for approval
    sendResponse({
      success: true,
      accounts: [walletState.evmAddress],
    });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

// Handle network switch
async function handleSwitchNetwork(data: any, sendResponse: (response: any) => void) {
  try {
    await chrome.storage.local.set({ selectedNetwork: data.network });
    
    // Notify all tabs about network change
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'NETWORK_CHANGED',
          network: data.network,
        }).catch(() => {
          // Ignore errors for tabs that don't have content script
        });
      }
    });
    
    sendResponse({ success: true });
  } catch (error: any) {
    sendResponse({ success: false, error: error.message });
  }
}

// Clean up on unload
self.addEventListener('beforeunload', () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});

export {};
