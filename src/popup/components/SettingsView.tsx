import React, { useState } from 'react';
import { WalletState } from '../Popup';
import { clearAllData, storeEncrypted } from '../../utils/storage';
import { exportSecretKey } from '../../utils/solana';

interface SettingsViewProps {
  wallet: WalletState;
  onClearWallet: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ wallet, onClearWallet }) => {
  const [showKeys, setShowKeys] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState('');
  const [showEncrypt, setShowEncrypt] = useState(false);

  const handleExportKeys = () => {
    if (!showKeys) {
      const confirmed = confirm(
        '⚠️ WARNING: Only export testnet keys!\n\nNever share these keys or use them on mainnet.\n\nDo you want to continue?'
      );
      if (!confirmed) return;
      setShowKeys(true);
    } else {
      setShowKeys(false);
    }
  };

  const handleEncryptWallet = async () => {
    if (!encryptPassword || encryptPassword.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }

    try {
      await storeEncrypted({
        evmPrivateKey: wallet.evmPrivateKey,
        evmMnemonic: wallet.evmMnemonic,
        solanaSecretKey: JSON.stringify(Array.from(wallet.solanaSecretKey)),
        selectedNetwork: wallet.selectedNetwork,
        encryptionEnabled: true,
      }, encryptPassword);

      alert('✓ Wallet encrypted and saved successfully!');
      setShowEncrypt(false);
      setEncryptPassword('');
    } catch (error) {
      alert('Failed to encrypt wallet. Please try again.');
    }
  };

  const handleClearWallet = () => {
    const confirmed = confirm(
      '⚠️ Are you sure you want to clear your wallet?\n\nThis will remove all stored data. Make sure you have backed up your keys if needed.'
    );
    
    if (confirmed) {
      clearAllData();
      onClearWallet();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-100 mb-6">Settings</h2>

      {/* Wallet Info */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Wallet Information</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-400 mb-1">EVM Address</p>
            <div className="flex gap-2">
              <p className="flex-1 text-sm text-slate-100 font-mono break-all bg-slate-900 px-3 py-2 rounded">
                {wallet.evmAddress}
              </p>
              <button
                onClick={() => copyToClipboard(wallet.evmAddress, 'EVM Address')}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                📋
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm text-slate-400 mb-1">Solana Public Key</p>
            <div className="flex gap-2">
              <p className="flex-1 text-sm text-slate-100 font-mono break-all bg-slate-900 px-3 py-2 rounded">
                {wallet.solanaPublicKey}
              </p>
              <button
                onClick={() => copyToClipboard(wallet.solanaPublicKey, 'Solana Public Key')}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                📋
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Keys */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Export Keys</h3>
        
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 mb-4">
          <p className="text-red-300 text-sm">
            ⚠️ <strong>TESTNET ONLY</strong> - Never export or use mainnet keys in this wallet!
          </p>
        </div>

        <button
          onClick={handleExportKeys}
          className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-xl transition-all mb-4"
        >
          {showKeys ? 'Hide Keys' : 'Show Private Keys'}
        </button>

        {showKeys && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-300">EVM Private Key</p>
                <button
                  onClick={() => copyToClipboard(wallet.evmPrivateKey, 'EVM Private Key')}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Copy
                </button>
              </div>
              <textarea
                value={wallet.evmPrivateKey}
                readOnly
                className="w-full px-3 py-2 bg-slate-900 text-slate-100 font-mono text-xs rounded border border-slate-700 resize-none"
                rows={2}
              />
            </div>

            {wallet.evmMnemonic && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-300">EVM Mnemonic</p>
                  <button
                    onClick={() => copyToClipboard(wallet.evmMnemonic!, 'EVM Mnemonic')}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  value={wallet.evmMnemonic}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-900 text-slate-100 font-mono text-xs rounded border border-slate-700 resize-none"
                  rows={3}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-300">Solana Secret Key (Base64)</p>
                <button
                  onClick={() => copyToClipboard(exportSecretKey(wallet.solanaSecretKey), 'Solana Secret Key')}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Copy
                </button>
              </div>
              <textarea
                value={exportSecretKey(wallet.solanaSecretKey)}
                readOnly
                className="w-full px-3 py-2 bg-slate-900 text-slate-100 font-mono text-xs rounded border border-slate-700 resize-none"
                rows={4}
              />
            </div>
          </div>
        )}
      </div>

      {/* Encrypt Wallet */}
      <div className="bg-slate-800 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Persist Wallet (Encrypted)</h3>
        
        <p className="text-sm text-slate-400 mb-4">
          By default, your keys are stored in memory and wiped when you close the browser.
          You can encrypt and save your wallet with a password to persist it.
        </p>

        {!showEncrypt ? (
          <button
            onClick={() => setShowEncrypt(true)}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all"
          >
            Encrypt & Save Wallet
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Encryption Password (min 8 characters)
              </label>
              <input
                type="password"
                value={encryptPassword}
                onChange={(e) => setEncryptPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleEncryptWallet}
                className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowEncrypt(false);
                  setEncryptPassword('');
                }}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-slate-800 rounded-xl p-6 border-2 border-red-900/50">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
        
        <button
          onClick={handleClearWallet}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all"
        >
          Clear Wallet & All Data
        </button>
        
        <p className="text-xs text-slate-400 mt-2">
          This will remove all wallet data from storage. Make sure to backup your keys first!
        </p>
      </div>

      {/* About */}
      <div className="mt-8 text-center text-sm text-slate-500">
        <p>TestNet Wallet v1.0.0</p>
        <p className="mt-1">Developer tool for testnet only • MIT License</p>
      </div>
    </div>
  );
};
