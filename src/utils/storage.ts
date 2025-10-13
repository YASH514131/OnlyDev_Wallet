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

/**
 * Store wallet data in memory (session) with timeout
 */
export function storeInMemory(data: WalletData): void {
  try {
    const sessionData = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('Failed to store in memory:', error);
  }
}

/**
 * Get wallet data from memory (session) if not expired
 */
export function getFromMemory(): WalletData | null {
  try {
    const sessionItem = sessionStorage.getItem(SESSION_KEY);
    if (!sessionItem) return null;
    
    const { data, timestamp } = JSON.parse(sessionItem);
    const now = Date.now();
    
    // Check if session has expired (15 minutes)
    if (now - timestamp > SESSION_DURATION) {
      console.log('Session expired, clearing memory');
      clearMemory();
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get from memory:', error);
    return null;
  }
}

/**
 * Check if session is still valid
 */
export function isSessionValid(): boolean {
  try {
    const sessionItem = sessionStorage.getItem(SESSION_KEY);
    if (!sessionItem) return false;
    
    const { timestamp } = JSON.parse(sessionItem);
    const now = Date.now();
    
    return (now - timestamp) <= SESSION_DURATION;
  } catch (error) {
    return false;
  }
}

/**
 * Get remaining session time in seconds
 */
export function getRemainingSessionTime(): number {
  try {
    const sessionItem = sessionStorage.getItem(SESSION_KEY);
    if (!sessionItem) return 0;
    
    const { timestamp } = JSON.parse(sessionItem);
    const now = Date.now();
    const elapsed = now - timestamp;
    const remaining = SESSION_DURATION - elapsed;
    
    return remaining > 0 ? Math.floor(remaining / 1000) : 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Clear wallet data from memory
 */
export function clearMemory(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_TIMEOUT_KEY);
  } catch (error) {
    console.error('Failed to clear memory:', error);
  }
}

/**
 * Refresh session timeout (extend by another 15 minutes)
 */
export function refreshSession(): void {
  try {
    const sessionItem = sessionStorage.getItem(SESSION_KEY);
    if (!sessionItem) return;
    
    const { data } = JSON.parse(sessionItem);
    storeInMemory(data); // This will update the timestamp
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
