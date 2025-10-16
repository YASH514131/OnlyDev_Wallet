# 🧩 DevNet-Only Developer Wallet Extension

A secure, open-source browser wallet for testing smart contracts across multiple blockchains — **never mainnet**.

![DevNet Wallet](https://img.shields.io/badge/DevNet-Only-0f995a?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)

## 🚀 Overview

**DevNet Wallet** is a lightweight, privacy-preserving Chrome/Brave extension that lets blockchain developers test and debug dApps on devnets and other test networks without risking real assets.

### ✨ Features

- ✅ **Developer-only wallet** – never stores or touches mainnet keys
- ✅ Supports both **ECDSA (secp256k1)** and **Ed25519 (Solana)** key types
- ✅ **Ephemeral by default** – private keys live in memory unless user encrypts
- ✅ **Multi-chain testing** – single UI for EVM and Solana testnets
- ✅ **Extensible architecture** – easy to add new testnets

### Supported Networks

| Network | Type | Chain/Cluster ID | RPC URL | Explorer | Faucet |
|---------|------|------------------|---------|----------|--------|
| **Ethereum Sepolia** | EVM | 11155111 | `https://eth-sepolia.public.blastapi.io` | [sepolia.etherscan.io](https://sepolia.etherscan.io) | [sepoliafaucet.com](https://sepoliafaucet.com) |
| **Polygon Amoy** | EVM | 80002 | `https://rpc-amoy.polygon.technology` | [amoy.polygonscan.com](https://amoy.polygonscan.com) | [faucet.polygon.technology](https://faucet.polygon.technology) |
| **BSC Testnet** | EVM | 97 | `https://data-seed-prebsc-1-s1.binance.org:8545` | [testnet.bscscan.com](https://testnet.bscscan.com) | [Binance Faucet](https://testnet.binance.org/faucet-smart) |
| **Avalanche Fuji** | EVM | 43113 | `https://api.avax-test.network/ext/bc/C/rpc` | [testnet.snowtrace.io](https://testnet.snowtrace.io) | [faucet.avax.network](https://faucet.avax.network) |
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
devnet-wallet/
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

The extension injects `window.devnetWallet` (EVM) and `window.solanaDevnetWallet` (Solana) into web pages. Legacy aliases (`window.testnetWallet`, `window.solanaTestnetWallet`) remain available for compatibility.

#### EVM API (similar to `window.ethereum`)

```javascript
// Request accounts
const accounts = await window.devnetWallet.request({ 
  method: 'eth_requestAccounts' 
});

// Get current chain
const chainId = await window.devnetWallet.request({ 
  method: 'eth_chainId' 
});

// Send transaction
const txHash = await window.devnetWallet.request({
  method: 'eth_sendTransaction',
  params: [{
    from: accounts[0],
    to: '0x...',
    value: '0x...',
    gas: '0x...',
  }]
});

// Listen for network changes
window.devnetWallet.on('chainChanged', (chainId) => {
  console.log('Network changed to:', chainId);
});
```

#### Solana API (similar to Phantom)

```javascript
// Connect wallet
const { publicKey } = await window.solanaDevnetWallet.connect();

// Send transaction
const connection = new solanaWeb3.Connection('https://api.devnet.solana.com');
const transaction = new solanaWeb3.Transaction().add(
  solanaWeb3.SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: recipientPublicKey,
    lamports: amount,
  })
);

const { signature } = await window.solanaDevnetWallet.signAndSendTransaction(transaction);
```

---

## 🛡️ Security Model

- ✅ **Handshake-authenticated messaging bridge** between dApp, content script, and service worker
- ✅ **Strict RPC input validation** before forwarding any call to external providers
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
git clone https://github.com/yourname/devnet-wallet
cd devnet-wallet

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

## 🧪 Testing with Smart Contracts

The `contracts/` directory contains sample smart contracts to test the wallet's functionality:

### Quick Start with Contracts

```bash
cd contracts
npm install
npm run compile

# Start local Hardhat node
npm run node

# Deploy contracts (in another terminal)
npm run deploy:local
```

### Available Contracts

1. **SimpleStorage** - Test basic transactions and state changes
2. **TestToken** - ERC20 token for testing transfers
3. **Guestbook** - Test string parameters and events

See [contracts/README.md](./contracts/README.md) for detailed instructions.

---

## � Developer Tools

### Generate Solana Keypair (JSON Format)

From the extension UI:

1. Open the wallet popup → **Settings**.
2. Under **Export Keys**, click **Show Private Keys**.
3. Press **Download Solana Keypair (.json)**.

The browser downloads `solana-wallet-keypair.json` containing the Uint8Array representation that Solana CLI, Solana Playground, and other tools expect.

Prefer the command line? You can still run:

```bash
node scripts/generate-keypair.js YOUR_BASE64_SECRET_KEY
```

📖 See [docs/SOLANA_DEPLOY_GUIDE.md](docs/SOLANA_DEPLOY_GUIDE.md) for full deployment guide.

---

## �📚 Documentation

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
