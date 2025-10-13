import { ethers } from 'ethers';
import * as bip39 from 'bip39';
import { isMainnetBlocked } from './network';

export interface EvmWallet {
  address: string;
  privateKey: string;
  mnemonic?: string;
}

/**
 * Create a new random EVM wallet with BIP-39 mnemonic
 */
export function createEvmWallet(): EvmWallet {
  const wallet = ethers.Wallet.createRandom();
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic?.phrase,
  };
}

/**
 * Import EVM wallet from private key
 */
export function importFromPrivateKey(privateKey: string): EvmWallet {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
    };
  } catch (error) {
    throw new Error('Invalid private key');
  }
}

/**
 * Import EVM wallet from mnemonic phrase
 */
export function importFromMnemonic(mnemonic: string, index = 0): EvmWallet {
  try {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }
    const path = `m/44'/60'/0'/0/${index}`;
    const wallet = ethers.Wallet.fromMnemonic(mnemonic, path);
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic,
    };
  } catch (error) {
    throw new Error('Invalid mnemonic phrase');
  }
}

/**
 * Get EVM balance
 */
export async function getBalance(address: string, rpcUrl: string): Promise<string> {
  try {
    // Check if it's a local network
    const isLocal = rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost');
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Add timeout for local networks
    if (isLocal) {
      provider.polling = false;
    }
    
    const network = await provider.getNetwork();
    
    // Block mainnet
    if (isMainnetBlocked(network.chainId)) {
      throw new Error('Mainnet not allowed');
    }
    
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    
    // Provide helpful message for local network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('could not detect network')) {
      console.warn('Local network not available. Start Hardhat/Anvil with: npx hardhat node');
    }
    
    return '0';
  }
}

/**
 * Send EVM transaction
 */
export async function sendTransaction(
  privateKey: string,
  to: string,
  value: string,
  rpcUrl: string,
  gasLimit?: string,
  data?: string
): Promise<string> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    
    // Block mainnet
    if (isMainnetBlocked(network.chainId)) {
      throw new Error('Mainnet not allowed');
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.utils.parseEther(value),
      gasLimit: gasLimit ? ethers.BigNumber.from(gasLimit) : undefined,
      data: data || '0x',
    });
    
    await tx.wait();
    return tx.hash;
  } catch (error: any) {
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

/**
 * Sign transaction without sending
 */
export async function signTransaction(
  privateKey: string,
  to: string,
  value: string,
  rpcUrl: string,
  gasLimit?: string,
  data?: string
): Promise<string> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const tx = await wallet.signTransaction({
      to,
      value: ethers.utils.parseEther(value),
      gasLimit: gasLimit ? ethers.BigNumber.from(gasLimit) : undefined,
      data: data || '0x',
      nonce: await provider.getTransactionCount(wallet.address),
      chainId: (await provider.getNetwork()).chainId,
    });
    
    return tx;
  } catch (error: any) {
    throw new Error(`Signing failed: ${error.message}`);
  }
}

/**
 * Estimate gas for transaction
 */
export async function estimateGas(
  from: string,
  to: string,
  value: string,
  rpcUrl: string,
  data?: string
): Promise<string> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const gasEstimate = await provider.estimateGas({
      from,
      to,
      value: ethers.utils.parseEther(value),
      data: data || '0x',
    });
    return gasEstimate.toString();
  } catch (error) {
    console.error('Gas estimation failed:', error);
    return '21000'; // Default gas limit
  }
}
