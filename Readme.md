# 🧩 TestNet-Only Developer Wallet Extension

A secure, open-source browser wallet for testing smart contracts across multiple blockchains — **never mainnet**.

![TestNet Wallet](https://img.shields.io/badge/TestNet-Only-red?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)

## 🚀 Overview

**TestNet Wallet** is a lightweight, privacy-preserving Chrome/Brave extension that lets blockchain developers test and debug dApps on testnets without risking real assets.

### ✨ Features

- ✅ **Developer-only wallet** – never stores or touches mainnet keys
- ✅ Supports both **ECDSA (secp256k1)** and **Ed25519 (Solana)** key types
- ✅ **Ephemeral by default** – private keys live in memory unless user encrypts
- ✅ **Multi-chain testing** – single UI for EVM and Solana testnets
- ✅ **Extensible architecture** – easy to add new testnets

### Supported Networks

| Network | Type | Chain/Cluster ID | RPC URL | Explorer | Faucet |
|---------|------|------------------|---------|----------|--------|
| **Ethereum Sepolia** | EVM | 11155111 | `https://sepolia.infura.io/v3/YOUR_KEY` | [sepolia.etherscan.io](https://sepolia.etherscan.io) | [sepoliafaucet.com](https://sepoliafaucet.com) |
| **Polygon Mumbai** | EVM | 80001 | `https://rpc-mumbai.maticvigil.com` | [mumbai.polygonscan.com](https://mumbai.polygonscan.com) | [faucet.polygon.technology](https://faucet.polygon.technology) |
| **BSC Testnet** | EVM | 97 | `https://data-seed-prebsc-1-s1.binance.org:8545` | [testnet.bscscan.com](https://testnet.bscscan.com) | [Binance Faucet](https://testnet.binance.org/faucet-smart) |
| **Avalanche Fuji** | EVM | 43113 | `https://api.avax-test.network/ext/bc/C/rpc` | [testnet.snowtrace.io](https://testnet.snowtrace.io) | [faucet.avax.network](https://faucet.avax.network) |
| **Fantom Testnet** | EVM | 4002 | `https://rpc.testnet.fantom.network` | [testnet.ftmscan.com](https://testnet.ftmscan.com) | [faucet.fantom.network](https://faucet.fantom.network) |
| **Local Hardhat/Anvil** | EVM | 31337 | `http://127.0.0.1:8545` | Local Dev | Built-in |
| **Solana Devnet** | Ed25519 | devnet | `https://api.devnet.solana.com` | [explorer.solana.com](https://explorer.solana.com?cluster=devnet) | [faucet.solana.com](https://faucet.solana.com) |

---

## 🧱 Architecture

### Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Blockchain Libraries**:
  - `ethers.js` → EVM chains (secp256k1)
  - `@solana/web3.js` → Solana Devnet (Ed25519)
- **Extension APIs**: Manifest V3 (`chrome.runtime`, `chrome.storage`, `chrome.action`)
- **Crypto**:
  - EVM keys → BIP-39 / BIP-44 (HD wallets)
  - Solana keys → Ed25519 Keypair (tweetnacl)
- **Storage**: In-memory (default) or AES-encrypted sessionStorage

### Project Structure

```
testnet-wallet/
├── manifest.json           # Extension manifest (V3)
├── package.json            # Dependencies
├── vite.config.ts          # Build configuration
├── tailwind.config.js      # Tailwind CSS config
├── tsconfig.json           # TypeScript config
├── index.html              # Popup HTML
├── public/
│   ├── icons/              # Extension icons
│   └── inject.js           # Injected wallet API
├── src/
│   ├── background/
│   │   └── index.ts        # Service worker
│   ├── content/
│   │   └── inject.ts       # Content script
│   ├── popup/
│   │   ├── index.tsx       # Popup entry
│   │   ├── Popup.tsx       # Main popup component
│   │   └── components/     # UI components
│   │       ├── Header.tsx
│   │       ├── CreateWalletView.tsx
│   │       ├── WalletView.tsx
│   │       └── SettingsView.tsx
│   ├── utils/
│   │   ├── evm.ts          # EVM wallet helpers
│   │   ├── solana.ts       # Solana key & tx helpers
│   │   ├── network.ts      # Network configurations
│   │   ├── faucet.ts       # Faucet integrations
│   │   ├── crypto.ts       # Encryption utilities
│   │   └── storage.ts      # Storage management
│   └── styles/
│       └── index.css       # Global styles
└── README.md
```

---

## 🧠 Core Features

### 🔐 Key Management

- **Auto-generate** new wallet on first load (ECDSA + Ed25519)
- **Optional import** (private key / seed phrase / Solana keypair)
- **Optional encrypted export** with "TESTNET ONLY" warning
- **Auto-wipe keys** on tab close
- **Multi-format support**:
  - `0x` hex (private key – EVM)
  - Mnemonic (12/24 words)
  - Solana base58 secret key

### 🌍 Network Management

- Preloaded testnets (see table above)
- Manual switch dropdown
- Custom RPC addition with explicit "TESTNET ONLY" checkbox
- Auto-reject `chainId 1` (mainnet) or Solana `mainnet-beta`

### 💸 Faucet Access

- Per-network "Get Test Tokens" button
- Built-in local faucet for Hardhat/Anvil
- Direct links to external faucets

### 🧾 Transactions & Signing

- Transaction preview modal (from/to/value/gas/data)
- **EVM**: `ethers.Wallet.signTransaction` & `sendTransaction`
- **Solana**: `Transaction` via `@solana/web3.js`
- Logs all signed tx hashes for developer debugging

### 💬 UI Overview

#### Popup Panel
- Network selector
- Wallet address (copy icon)
- Balance display
- Buttons: **Send** / **Receive** / **Faucet** / **Settings**

#### Settings Panel
- "Persist key (encrypted)" toggle
- Manage networks
- Clear wallet
- Export key (with warning)
- Debug logs toggle

#### Visual Safety
- **Red banner**: "TESTNET ONLY – NO REAL FUNDS"
- Always display chain name and RPC URL in header

---

## 🧰 Developer Integration

### Injected APIs

The extension injects `window.testnetWallet` (EVM) and `window.solanaTestnetWallet` (Solana) into web pages.

#### EVM API (similar to `window.ethereum`)

```javascript
// Request accounts
const accounts = await window.testnetWallet.request({ 
  method: 'eth_requestAccounts' 
});

// Get current chain
const chainId = await window.testnetWallet.request({ 
  method: 'eth_chainId' 
});

// Send transaction
const txHash = await window.testnetWallet.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x...',
    value: '0x...',
    gas: '0x...',
  }]
});

// Listen for network changes
window.testnetWallet.on('chainChanged', (chainId) => {
  console.log('Network changed to:', chainId);
});
```

#### Solana API (similar to Phantom)

```javascript
// Connect wallet
const { publicKey } = await window.solanaTestnetWallet.connect();

// Send transaction
const connection = new solanaWeb3.Connection('https://api.devnet.solana.com');
const transaction = new solanaWeb3.Transaction().add(
  solanaWeb3.SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: recipientPublicKey,
    lamports: amount,
  })
);

const { signature } = await window.solanaTestnetWallet.signAndSendTransaction(transaction);
```

---

## 🛡️ Security Model

- ✅ **Block `chainId 1` and `mainnet-beta`**
- ✅ Keys never leave local context
- ✅ All RPC calls HTTPS or localhost
- ✅ No analytics or telemetry
- ✅ Strong warnings for seed import/export
- ✅ UI must show active network and testnet badge at all times

---

## 🔧 Build & Run

### Prerequisites

- Node.js 18+ and npm/yarn
- Chrome or Brave browser

### Installation

```bash
# Clone the repository
git clone https://github.com/yourname/testnet-wallet
cd testnet-wallet

# Install dependencies
npm install

# Build the extension
npm run build
```

### Load in Browser

1. Open Chrome/Brave
2. Navigate to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `build/` directory

### Development Mode

```bash
# Run in watch mode
npm run dev
```

---

## 💡 Example User Flow

1. Developer installs extension
2. On launch, wallet auto-generates EVM & Solana keys (in memory)
3. Developer selects "Sepolia" or "Solana Devnet"
4. Clicks **Get Test Tokens** to fund wallet
5. Deploys contracts or runs CI tests
6. Closes browser → keys wiped

---

## 🎨 Design Guidelines

- **Tailwind CSS** + Inter font
- **Developer-centric dark theme**
- **Rounded corners** (2xl), soft shadows, large padding
- **Animated banner** "TESTNET ONLY"

---

## 🧩 Future Extensions

- [ ] Add Base Goerli, Linea, zkSync Testnet
- [ ] Multi-account management
- [ ] Built-in Solana airdrops button
- [ ] Local node manager (start/stop Anvil)
- [ ] Web dashboard for testnet analytics

---

## 📜 License

**MIT** – Open source for educational / developer testing purposes.

---

## ⚠️ Disclaimer

**Never use with mainnet funds. This wallet is for testnets only.**

This extension is designed exclusively for development and testing purposes. It includes safeguards to prevent mainnet usage, but developers should always exercise caution.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

### Development Setup

```bash
npm install
npm run dev      # Development mode
npm run build    # Production build
```

---

## 📚 Documentation

### Key Code Snippets

#### EVM Ephemeral Wallet

```typescript
import { ethers } from "ethers";

export async function createEvmWallet(rpcUrl: string) {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  const net = await provider.getNetwork();
  
  if (net.chainId === 1) throw new Error("Mainnet not allowed");
  
  return ethers.Wallet.createRandom().connect(provider);
}
```

#### Solana Ephemeral Wallet

```typescript
import { Keypair, Connection } from "@solana/web3.js";

export function createSolanaWallet(cluster = "https://api.devnet.solana.com") {
  const connection = new Connection(cluster, "confirmed");
  const wallet = Keypair.generate();
  return { wallet, connection };
}
```

#### Prevent Mainnet

```typescript
const BLOCKED = [1, 137, 56]; // Ethereum, Polygon, BSC mainnets

if (BLOCKED.includes(chainId) || cluster === "mainnet-beta") {
  throw new Error("Mainnet not supported");
}
```

---

## 🙏 Acknowledgments

Built with ❤️ for the blockchain developer community.

---

**Made for testing. Built for developers. Never for mainnet.**
