import { encrypt, decrypt } from './crypto';

export interface WalletData {
  evmPrivateKey?: string;
  evmMnemonic?: string;
  solanaSecretKey?: string;
  selectedNetwork?: string;
  encryptionEnabled?: boolean;
}

const STORAGE_KEY = 'testnet_wallet_data';
const SESSION_KEY = 'testnet_wallet_session';
const SESSION_TIMEOUT_KEY = 'testnet_wallet_session_timeout';
const SESSION_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface SessionData {
  data: WalletData;
  timestamp: number;
}

/**
 * Store wallet data in memory (session) with timeout using chrome.storage
 */
export async function storeInMemory(data: WalletData): Promise<void> {
  try {
    const sessionData: SessionData = {
      data,
      timestamp: Date.now(),
    };
    await chrome.storage.local.set({ [SESSION_KEY]: sessionData });
    console.log('Session stored with timestamp:', sessionData.timestamp);
  } catch (error) {
    console.error('Failed to store in memory:', error);
  }
}

/**
 * Get wallet data from memory (session) if not expired
 */
export async function getFromMemory(): Promise<WalletData | null> {
  try {
    const result = await chrome.storage.local.get(SESSION_KEY);
    const sessionData = result[SESSION_KEY] as SessionData | undefined;
    
    if (!sessionData) {
      console.log('No session data found');
      return null;
    }
    
    const now = Date.now();
    const elapsed = now - sessionData.timestamp;
    
    // Check if session has expired (15 minutes)
    if (elapsed > SESSION_DURATION) {
      console.log('Session expired, clearing memory. Elapsed:', elapsed, 'ms');
      await clearMemory();
      return null;
    }
    
    console.log('Session valid. Time remaining:', Math.floor((SESSION_DURATION - elapsed) / 1000), 'seconds');
    return sessionData.data;
  } catch (error) {
    console.error('Failed to get from memory:', error);
    return null;
  }
}

/**
 * Check if session is still valid
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(SESSION_KEY);
    const sessionData = result[SESSION_KEY] as SessionData | undefined;
    
    if (!sessionData) return false;
    
    const now = Date.now();
    const elapsed = now - sessionData.timestamp;
    
    return elapsed <= SESSION_DURATION;
  } catch (error) {
    return false;
  }
}

/**
 * Get remaining session time in seconds
 */
export async function getRemainingSessionTime(): Promise<number> {
  try {
    const result = await chrome.storage.local.get(SESSION_KEY);
    const sessionData = result[SESSION_KEY] as SessionData | undefined;
    
    if (!sessionData) return 0;
    
    const now = Date.now();
    const elapsed = now - sessionData.timestamp;
    const remaining = SESSION_DURATION - elapsed;
    
    return remaining > 0 ? Math.floor(remaining / 1000) : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clear wallet data from memory
 */
export async function clearMemory(): Promise<void> {
  try {
    await chrome.storage.local.remove([SESSION_KEY, SESSION_TIMEOUT_KEY]);
    console.log('Session cleared');
  } catch (error) {
    console.error('Failed to clear memory:', error);
  }
}

/**
 * Refresh session timeout (extend by another 15 minutes)
 */
export async function refreshSession(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(SESSION_KEY);
    const sessionData = result[SESSION_KEY] as SessionData | undefined;
    
    if (!sessionData) return;
    
    await storeInMemory(sessionData.data); // This will update the timestamp
    console.log('Session refreshed');
  } catch (error) {
    console.error('Failed to refresh session:', error);
  }
}

/**
 * Store encrypted wallet data persistently
 */
export async function storeEncrypted(data: WalletData, password: string): Promise<void> {
  try {
    const jsonData = JSON.stringify(data);
    const encrypted = await encrypt(jsonData, password);
    
    await chrome.storage.local.set({
      [STORAGE_KEY]: encrypted,
      encrypted: true,
    });
  } catch (error) {
    throw new Error('Failed to store encrypted data');
  }
}

/**
 * Get encrypted wallet data
 */
export async function getEncrypted(password: string): Promise<WalletData | null> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEY, 'encrypted']);
    
    if (!result[STORAGE_KEY] || !result.encrypted) {
      return null;
    }
    
    const decrypted = await decrypt(result[STORAGE_KEY], password);
    return JSON.parse(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt data - incorrect password');
  }
}

/**
 * Check if encrypted data exists
 */
export async function hasEncryptedData(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(['encrypted']);
    return result.encrypted === true;
  } catch (error) {
    return false;
  }
}

/**
 * Clear all stored data
 */
export async function clearAllData(): Promise<void> {
  try {
    await chrome.storage.local.clear();
    clearMemory();
  } catch (error) {
    console.error('Failed to clear data:', error);
  }
}

/**
 * Store settings
 */
export async function storeSettings(settings: Record<string, any>): Promise<void> {
  try {
    await chrome.storage.local.set({ settings });
  } catch (error) {
    console.error('Failed to store settings:', error);
  }
}

/**
 * Get settings
 */
export async function getSettings(): Promise<Record<string, any>> {
  try {
    const result = await chrome.storage.local.get(['settings']);
    return result.settings || {};
  } catch (error) {
    console.error('Failed to get settings:', error);
    return {};
  }
}
