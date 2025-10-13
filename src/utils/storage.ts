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

/**
 * Store wallet data in memory (session)
 */
export function storeInMemory(data: WalletData): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to store in memory:', error);
  }
}

/**
 * Get wallet data from memory (session)
 */
export function getFromMemory(): WalletData | null {
  try {
    const data = sessionStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get from memory:', error);
    return null;
  }
}

/**
 * Clear wallet data from memory
 */
export function clearMemory(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear memory:', error);
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
