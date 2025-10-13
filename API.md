# API Documentation

## Developer Integration Guide

TestNet Wallet injects two wallet APIs into web pages for interacting with EVM and Solana testnets.

---

## EVM API (`window.testnetWallet`)

Similar to `window.ethereum` (MetaMask), but restricted to testnets only.

### Properties

- `isTestnetWallet: boolean` - Always `true`
- `isMetaMask: boolean` - Always `false` (to avoid conflicts)

### Methods

#### `request(args: RequestArguments): Promise<any>`

Primary method for interacting with the wallet.

**Supported Methods:**

##### `eth_requestAccounts`
Request user's Ethereum addresses.

```javascript
const accounts = await window.testnetWallet.request({ 
  method: 'eth_requestAccounts' 
});
// Returns: ['0x...']
```

##### `eth_accounts`
Get currently connected accounts.

```javascript
const accounts = await window.testnetWallet.request({ 
  method: 'eth_accounts' 
});
// Returns: ['0x...'] or []
```

##### `eth_chainId`
Get current chain ID.

```javascript
const chainId = await window.testnetWallet.request({ 
  method: 'eth_chainId' 
});
// Returns: 'sepolia' | 'mumbai' | 'bscTestnet' | etc.
```

##### `eth_sendTransaction`
Send a transaction.

```javascript
const txHash = await window.testnetWallet.request({
  method: 'eth_sendTransaction',
  params: [{
    from: '0x...',
    to: '0x...',
    value: '0x...',  // in wei (hex)
    gas: '0x...',    // optional
    data: '0x...'    // optional
  }]
});
// Returns: transaction hash
```

##### `eth_sign` / `personal_sign`
Sign arbitrary data.

```javascript
const signature = await window.testnetWallet.request({
  method: 'personal_sign',
  params: ['0x...data', '0x...address']
});
```

##### `wallet_switchEthereumChain`
Switch to a different network.

```javascript
await window.testnetWallet.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: 'mumbai' }]
});
```

### Events

#### `chainChanged`
Emitted when the network changes.

```javascript
window.testnetWallet.on('chainChanged', (chainId) => {
  console.log('Network changed to:', chainId);
  // Reload your app or update UI
});
```

#### `accountsChanged`
Emitted when accounts change (future implementation).

```javascript
window.testnetWallet.on('accountsChanged', (accounts) => {
  console.log('Accounts changed:', accounts);
});
```

### Event Management

```javascript
// Add event listener
window.testnetWallet.on(eventName, callback);

// Remove event listener
window.testnetWallet.removeListener(eventName, callback);
```

---

## Solana API (`window.solanaTestnetWallet`)

Similar to Phantom wallet, but restricted to Solana devnet only.

### Properties

- `isTestnetWallet: boolean` - Always `true`
- `isPhantom: boolean` - Always `false` (to avoid conflicts)

### Methods

#### `connect(): Promise<{ publicKey: string }>`
Connect to the wallet.

```javascript
const { publicKey } = await window.solanaTestnetWallet.connect();
console.log('Connected:', publicKey);
```

#### `disconnect(): Promise<void>`
Disconnect from the wallet.

```javascript
await window.solanaTestnetWallet.disconnect();
```

#### `signTransaction(transaction: Transaction): Promise<Transaction>`
Sign a single transaction.

```javascript
import { Transaction, SystemProgram } from '@solana/web3.js';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports: 1000000,
  })
);

const signedTx = await window.solanaTestnetWallet.signTransaction(transaction);
```

#### `signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>`
Sign multiple transactions.

```javascript
const signedTxs = await window.solanaTestnetWallet.signAllTransactions([tx1, tx2]);
```

#### `signAndSendTransaction(transaction: Transaction): Promise<{ signature: string }>`
Sign and send a transaction.

```javascript
const { signature } = await window.solanaTestnetWallet.signAndSendTransaction(transaction);
console.log('Transaction signature:', signature);
```

#### `signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>`
Sign arbitrary message.

```javascript
const message = new TextEncoder().encode('Hello, Solana!');
const { signature } = await window.solanaTestnetWallet.signMessage(message);
```

### Events

```javascript
window.solanaTestnetWallet.on(eventName, callback);
window.solanaTestnetWallet.removeListener(eventName, callback);
```

---

## Complete Examples

### Example 1: Send ETH on Sepolia

```javascript
// Check if wallet is available
if (typeof window.testnetWallet !== 'undefined') {
  try {
    // Request accounts
    const accounts = await window.testnetWallet.request({ 
      method: 'eth_requestAccounts' 
    });
    
    const from = accounts[0];
    const to = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
    const value = '0x' + (0.01 * 1e18).toString(16); // 0.01 ETH in wei
    
    // Send transaction
    const txHash = await window.testnetWallet.request({
      method: 'eth_sendTransaction',
      params: [{
        from,
        to,
        value,
      }]
    });
    
    console.log('Transaction sent:', txHash);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

### Example 2: Interact with Smart Contract (EVM)

```javascript
import { ethers } from 'ethers';

// Contract ABI and address
const contractABI = [...];
const contractAddress = '0x...';

// Get provider
const provider = new ethers.providers.Web3Provider(window.testnetWallet);
const signer = provider.getSigner();

// Create contract instance
const contract = new ethers.Contract(contractAddress, contractABI, signer);

// Call contract method
const tx = await contract.someMethod(arg1, arg2);
await tx.wait();

console.log('Transaction confirmed:', tx.hash);
```

### Example 3: Send SOL on Devnet

```javascript
import { 
  Connection, 
  Transaction, 
  SystemProgram, 
  PublicKey,
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';

// Connect to wallet
const { publicKey } = await window.solanaTestnetWallet.connect();
const fromPublicKey = new PublicKey(publicKey);

// Setup connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create transaction
const toPublicKey = new PublicKey('...');
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: fromPublicKey,
    toPubkey: toPublicKey,
    lamports: 0.1 * LAMPORTS_PER_SOL,
  })
);

// Get recent blockhash
transaction.recentBlockhash = (
  await connection.getRecentBlockhash()
).blockhash;
transaction.feePayer = fromPublicKey;

// Sign and send
const { signature } = await window.solanaTestnetWallet.signAndSendTransaction(
  transaction
);

console.log('Transaction signature:', signature);
```

### Example 4: Detect Wallet

```javascript
// Check if TestNet Wallet is installed
function detectWallet() {
  if (typeof window.testnetWallet !== 'undefined') {
    console.log('TestNet Wallet is installed!');
    return true;
  }
  
  // Wait for wallet to load
  window.addEventListener('testnetWallet#initialized', () => {
    console.log('TestNet Wallet initialized!');
  });
  
  return false;
}

detectWallet();
```

### Example 5: Listen for Network Changes

```javascript
// React example
import { useEffect, useState } from 'react';

function useWallet() {
  const [network, setNetwork] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    async function init() {
      if (typeof window.testnetWallet !== 'undefined') {
        // Get initial state
        const accounts = await window.testnetWallet.request({ 
          method: 'eth_requestAccounts' 
        });
        const chainId = await window.testnetWallet.request({ 
          method: 'eth_chainId' 
        });
        
        setAccount(accounts[0]);
        setNetwork(chainId);
        
        // Listen for changes
        window.testnetWallet.on('chainChanged', setNetwork);
        window.testnetWallet.on('accountsChanged', (accounts) => {
          setAccount(accounts[0]);
        });
      }
    }
    
    init();
    
    // Cleanup
    return () => {
      if (typeof window.testnetWallet !== 'undefined') {
        window.testnetWallet.removeListener('chainChanged', setNetwork);
      }
    };
  }, []);

  return { network, account };
}
```

---

## Error Handling

Always wrap wallet interactions in try-catch blocks:

```javascript
try {
  const accounts = await window.testnetWallet.request({ 
    method: 'eth_requestAccounts' 
  });
} catch (error) {
  if (error.code === 4001) {
    // User rejected the request
    console.log('User rejected connection');
  } else {
    console.error('Error:', error);
  }
}
```

---

## Security Best Practices

1. **Always verify network**: Check that you're on the correct testnet
2. **Validate addresses**: Ensure addresses are valid before sending transactions
3. **Use appropriate gas limits**: Set reasonable gas limits for transactions
4. **Handle errors gracefully**: Always implement proper error handling
5. **Never request mainnet**: The wallet blocks mainnet, but verify in your dApp too

---

## TypeScript Support

### Type Definitions

```typescript
interface TestnetWallet {
  isTestnetWallet: boolean;
  isMetaMask: boolean;
  request(args: RequestArguments): Promise<any>;
  on(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string, callback: (...args: any[]) => void): void;
}

interface SolanaTestnetWallet {
  isTestnetWallet: boolean;
  isPhantom: boolean;
  connect(): Promise<{ publicKey: string }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
  signAndSendTransaction(transaction: any): Promise<{ signature: string }>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  on(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string, callback: (...args: any[]) => void): void;
}

declare global {
  interface Window {
    testnetWallet?: TestnetWallet;
    solanaTestnetWallet?: SolanaTestnetWallet;
  }
}
```

---

## Support

For issues or questions:
- GitHub Issues: [github.com/yourname/testnet-wallet/issues]
- Documentation: [README.md]

---

**Remember**: This wallet is for testnet only. Never use it with mainnet funds!
