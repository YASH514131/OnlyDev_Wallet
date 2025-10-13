import React, { useState, useEffect } from 'react';
import { Header, WalletView, SettingsView, CreateWalletView } from './components';
import { getFromMemory, storeInMemory, hasEncryptedData } from '../utils/storage';
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

  useEffect(() => {
    initializeWallet();
  }, []);

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

  const handleCreateWallet = () => {
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
      
      // Store in memory (session)
      storeInMemory({
        evmPrivateKey: evmWallet.privateKey,
        evmMnemonic: evmWallet.mnemonic,
        solanaSecretKey: JSON.stringify(Array.from(solanaWallet.secretKey)),
        selectedNetwork: 'sepolia',
      });
      
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

  const handleImportWallet = (evmKey: string, solanaKey: string) => {
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
      
      // Store in memory
      storeInMemory({
        evmPrivateKey: evmWallet.privateKey,
        evmMnemonic: evmWallet.mnemonic,
        solanaSecretKey: JSON.stringify(Array.from(solanaWallet.secretKey)),
        selectedNetwork: 'sepolia',
      });
      
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
          mnemonic={showMnemonic || undefined}
          onMnemonicConfirmed={handleMnemonicConfirmed}
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
