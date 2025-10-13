import React, { useState, useEffect } from 'react';
import { Header, WalletView, SettingsView, CreateWalletView } from './components';
import { getFromMemory, storeInMemory, hasEncryptedData, refreshSession, getRemainingSessionTime } from '../utils/storage';
import { createEvmWallet } from '../utils/evm';
import { createSolanaWallet } from '../utils/solana';

export type View = 'create' | 'wallet' | 'settings';

export interface WalletState {
  evmAddress: string;
  evmPrivateKey: string;
  evmMnemonic?: string;
  solanaPublicKey: string;
  solanaSecretKey: Uint8Array;
  selectedNetwork: string;
}

const Popup: React.FC = () => {
  const [view, setView] = useState<View>('create');
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMnemonic, setShowMnemonic] = useState<string | null>(null);
  const [hasExistingWallet, setHasExistingWallet] = useState(false);

  useEffect(() => {
    initializeWallet();
  }, []);

  // Refresh session on any interaction
  useEffect(() => {
    if (wallet) {
      const handleInteraction = () => {
        refreshSession();
        console.log('Session refreshed. Time remaining:', getRemainingSessionTime(), 'seconds');
      };

      // Refresh on mouse move, click, or keypress
      window.addEventListener('mousemove', handleInteraction);
      window.addEventListener('click', handleInteraction);
      window.addEventListener('keypress', handleInteraction);

      // Check session expiry every minute
      const interval = setInterval(() => {
        const remaining = getRemainingSessionTime();
        console.log('Session check. Time remaining:', remaining, 'seconds');
        
        if (remaining <= 0) {
          // Session expired, lock wallet
          console.log('Session expired! Locking wallet...');
          setWallet(null);
          setView('create');
        }
      }, 60000); // Check every minute

      return () => {
        window.removeEventListener('mousemove', handleInteraction);
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('keypress', handleInteraction);
        clearInterval(interval);
      };
    }
  }, [wallet]);

  const initializeWallet = async () => {
    try {
      setLoading(true);
      
      // Check if wallet exists in memory
      const memoryData = getFromMemory();
      if (memoryData && memoryData.evmPrivateKey) {
        setWallet({
          evmAddress: memoryData.evmPrivateKey ? await getAddressFromKey(memoryData.evmPrivateKey) : '',
          evmPrivateKey: memoryData.evmPrivateKey,
          evmMnemonic: memoryData.evmMnemonic,
          solanaPublicKey: memoryData.solanaSecretKey ? await getSolanaAddress(memoryData.solanaSecretKey) : '',
          solanaSecretKey: memoryData.solanaSecretKey ? new Uint8Array(JSON.parse(memoryData.solanaSecretKey)) : new Uint8Array(),
          selectedNetwork: memoryData.selectedNetwork || 'sepolia',
        });
        setView('wallet');
        setLoading(false);
        return;
      }
      
      // Check if encrypted wallet exists
      const hasEncrypted = await hasEncryptedData();
      setHasExistingWallet(hasEncrypted);
      
      if (hasEncrypted) {
        // User needs to unlock wallet - show create view with unlock option
        setView('create');
      } else {
        // New user - show create wallet view
        setView('create');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      setLoading(false);
    }
  };

  const getAddressFromKey = async (privateKey: string): Promise<string> => {
    const { importFromPrivateKey } = await import('../utils/evm');
    const wallet = importFromPrivateKey(privateKey);
    return wallet.address;
  };

  const getSolanaAddress = async (secretKeyStr: string): Promise<string> => {
    const { importFromSecretKey } = await import('../utils/solana');
    const secretKey = new Uint8Array(JSON.parse(secretKeyStr));
    const wallet = importFromSecretKey(secretKey);
    return wallet.publicKey;
  };

  const handleCreateWallet = async (password: string) => {
    try {
      const evmWallet = createEvmWallet();
      const solanaWallet = createSolanaWallet();
      
      const newWallet: WalletState = {
        evmAddress: evmWallet.address,
        evmPrivateKey: evmWallet.privateKey,
        evmMnemonic: evmWallet.mnemonic,
        solanaPublicKey: solanaWallet.publicKey,
        solanaSecretKey: solanaWallet.secretKey,
        selectedNetwork: 'sepolia',
      };
      
      const walletData = {
        evmPrivateKey: evmWallet.privateKey,
        evmMnemonic: evmWallet.mnemonic,
        solanaSecretKey: JSON.stringify(Array.from(solanaWallet.secretKey)),
        selectedNetwork: 'sepolia',
      };
      
      // Store encrypted
      const { storeEncrypted } = await import('../utils/storage');
      await storeEncrypted(walletData, password);
      
      // Also store in memory (session)
      storeInMemory(walletData);
      
      setWallet(newWallet);
      
      // Show mnemonic first if available
      if (evmWallet.mnemonic) {
        setShowMnemonic(evmWallet.mnemonic);
      } else {
        setView('wallet');
      }
    } catch (error) {
      console.error('Failed to create wallet:', error);
      alert('Failed to create wallet. Please try again.');
    }
  };

  const handleMnemonicConfirmed = () => {
    setShowMnemonic(null);
    setView('wallet');
  };

  const handleUnlockWallet = async (password: string) => {
    try {
      const { getEncrypted } = await import('../utils/storage');
      const walletData = await getEncrypted(password);
      
      if (!walletData) {
        alert('Failed to decrypt wallet. Incorrect password.');
        return;
      }
      
      const evmAddress = await getAddressFromKey(walletData.evmPrivateKey!);
      const solanaPublicKey = await getSolanaAddress(walletData.solanaSecretKey!);
      
      const unlockedWallet: WalletState = {
        evmAddress,
        evmPrivateKey: walletData.evmPrivateKey!,
        evmMnemonic: walletData.evmMnemonic,
        solanaPublicKey,
        solanaSecretKey: new Uint8Array(JSON.parse(walletData.solanaSecretKey!)),
        selectedNetwork: walletData.selectedNetwork || 'sepolia',
      };
      
      // Store in memory for current session
      storeInMemory(walletData);
      
      setWallet(unlockedWallet);
      setView('wallet');
    } catch (error) {
      console.error('Failed to unlock wallet:', error);
      alert('Failed to unlock wallet. Incorrect password.');
    }
  };

  const handleImportWallet = async (evmKey: string, solanaKey: string, password: string) => {
    try {
      const { importFromPrivateKey, importFromMnemonic } = require('../utils/evm');
      const { importFromSecretKey } = require('../utils/solana');
      
      let evmWallet;
      // Check if it's a mnemonic or private key
      if (evmKey.includes(' ')) {
        evmWallet = importFromMnemonic(evmKey);
      } else {
        evmWallet = importFromPrivateKey(evmKey);
      }
      
      const solanaWallet = importFromSecretKey(solanaKey);
      
      const newWallet: WalletState = {
        evmAddress: evmWallet.address,
        evmPrivateKey: evmWallet.privateKey,
        evmMnemonic: evmWallet.mnemonic,
        solanaPublicKey: solanaWallet.publicKey,
        solanaSecretKey: solanaWallet.secretKey,
        selectedNetwork: 'sepolia',
      };
      
      const walletData = {
        evmPrivateKey: evmWallet.privateKey,
        evmMnemonic: evmWallet.mnemonic,
        solanaSecretKey: JSON.stringify(Array.from(solanaWallet.secretKey)),
        selectedNetwork: 'sepolia',
      };
      
      // Store encrypted
      const { storeEncrypted } = await import('../utils/storage');
      await storeEncrypted(walletData, password);
      
      // Store in memory
      storeInMemory(walletData);
      
      setWallet(newWallet);
      setView('wallet');
    } catch (error) {
      console.error('Failed to import wallet:', error);
      alert('Failed to import wallet. Please check your keys and try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-slate-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <Header 
        view={view} 
        onViewChange={setView}
        selectedNetwork={wallet?.selectedNetwork || 'sepolia'}
      />
      
      {view === 'create' && (
        <CreateWalletView 
          onCreateWallet={handleCreateWallet}
          onImportWallet={handleImportWallet}
          onUnlockWallet={handleUnlockWallet}
          mnemonic={showMnemonic || undefined}
          onMnemonicConfirmed={handleMnemonicConfirmed}
          hasExistingWallet={hasExistingWallet}
        />
      )}
      
      {view === 'wallet' && wallet && (
        <WalletView 
          wallet={wallet}
          onNetworkChange={(network: string) => {
            setWallet({ ...wallet, selectedNetwork: network });
            storeInMemory({
              evmPrivateKey: wallet.evmPrivateKey,
              evmMnemonic: wallet.evmMnemonic,
              solanaSecretKey: JSON.stringify(Array.from(wallet.solanaSecretKey)),
              selectedNetwork: network,
            });
          }}
        />
      )}
      
      {view === 'settings' && wallet && (
        <SettingsView 
          wallet={wallet}
          onClearWallet={() => {
            setWallet(null);
            setView('create');
          }}
        />
      )}
    </div>
  );
};

export default Popup;
