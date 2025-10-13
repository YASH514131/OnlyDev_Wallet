import { Keypair, Connection, Transaction, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { isMainnetBlocked } from './network';

export interface SolanaWallet {
  publicKey: string;
  secretKey: Uint8Array;
}

/**
 * Create a new random Solana wallet (Ed25519 keypair)
 */
export function createSolanaWallet(): SolanaWallet {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey,
  };
}

/**
 * Import Solana wallet from secret key (base58 or Uint8Array)
 */
export function importFromSecretKey(secretKey: string | Uint8Array): SolanaWallet {
  try {
    let secretKeyBytes: Uint8Array;
    
    if (typeof secretKey === 'string') {
      // Assume base58 encoded
      secretKeyBytes = Uint8Array.from(Buffer.from(secretKey, 'base64'));
    } else {
      secretKeyBytes = secretKey;
    }
    
    const keypair = Keypair.fromSecretKey(secretKeyBytes);
    return {
      publicKey: keypair.publicKey.toBase58(),
      secretKey: keypair.secretKey,
    };
  } catch (error) {
    throw new Error('Invalid Solana secret key');
  }
}

/**
 * Get Solana balance
 */
export async function getBalance(publicKey: string, rpcUrl: string): Promise<string> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Block mainnet
    if (rpcUrl.includes('mainnet-beta') || isMainnetBlocked(undefined, 'mainnet-beta')) {
      throw new Error('Mainnet not allowed');
    }
    
    const pubKey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);
    return (balance / LAMPORTS_PER_SOL).toString();
  } catch (error) {
    console.error('Error fetching Solana balance:', error);
    return '0';
  }
}

/**
 * Send SOL transaction
 */
export async function sendTransaction(
  secretKey: Uint8Array,
  to: string,
  amount: string,
  rpcUrl: string
): Promise<string> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Block mainnet
    if (rpcUrl.includes('mainnet-beta')) {
      throw new Error('Mainnet not allowed');
    }
    
    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(to);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports: Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL),
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [fromKeypair]);
    await connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error: any) {
    throw new Error(`Solana transaction failed: ${error.message}`);
  }
}

/**
 * Sign a Solana transaction
 */
export async function signTransaction(
  secretKey: Uint8Array,
  transaction: Transaction
): Promise<Transaction> {
  try {
    const keypair = Keypair.fromSecretKey(secretKey);
    transaction.partialSign(keypair);
    return transaction;
  } catch (error: any) {
    throw new Error(`Signing failed: ${error.message}`);
  }
}

/**
 * Request airdrop on devnet
 */
export async function requestAirdrop(publicKey: string, rpcUrl: string, amount = 1): Promise<string> {
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const pubKey = new PublicKey(publicKey);
    
    const signature = await connection.requestAirdrop(
      pubKey,
      amount * LAMPORTS_PER_SOL
    );
    
    await connection.confirmTransaction(signature, 'confirmed');
    return signature;
  } catch (error: any) {
    throw new Error(`Airdrop failed: ${error.message}`);
  }
}

/**
 * Export secret key as base58
 */
export function exportSecretKey(secretKey: Uint8Array): string {
  return Buffer.from(secretKey).toString('base64');
}
