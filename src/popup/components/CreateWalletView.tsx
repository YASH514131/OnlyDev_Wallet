import React, { useState } from 'react';

interface CreateWalletViewProps {
  onCreateWallet: () => void;
  onImportWallet: (evmKey: string, solanaKey: string) => void;
}

export const CreateWalletView: React.FC<CreateWalletViewProps> = ({ 
  onCreateWallet, 
  onImportWallet 
}) => {
  const [mode, setMode] = useState<'create' | 'import'>('create');
  const [evmKey, setEvmKey] = useState('');
  const [solanaKey, setSolanaKey] = useState('');

  const handleImport = () => {
    if (!evmKey.trim() || !solanaKey.trim()) {
      alert('Please enter both EVM and Solana keys');
      return;
    }
    onImportWallet(evmKey.trim(), solanaKey.trim());
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🧩</div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">
            TestNet Wallet
          </h2>
          <p className="text-slate-400 text-sm">
            Developer wallet for blockchain testing
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              mode === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Create New
          </button>
          <button
            onClick={() => setMode('import')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              mode === 'import'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Import
          </button>
        </div>

        {mode === 'create' ? (
          <div>
            <div className="bg-slate-900 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-3">
                Create New Wallet
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Generates EVM & Solana keypairs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Stored in memory (ephemeral)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span>Testnet only - safe for development</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onCreateWallet}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Create Wallet
            </button>
          </div>
        ) : (
          <div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  EVM Private Key or Mnemonic
                </label>
                <textarea
                  value={evmKey}
                  onChange={(e) => setEvmKey(e.target.value)}
                  placeholder="0x... or 12/24 word phrase"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Solana Secret Key (Base64)
                </label>
                <textarea
                  value={solanaKey}
                  onChange={(e) => setSolanaKey(e.target.value)}
                  placeholder="Base64 encoded secret key"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-6">
              <p className="text-yellow-300 text-sm">
                ⚠️ Only import testnet keys. Never use mainnet keys!
              </p>
            </div>

            <button
              onClick={handleImport}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              Import Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
