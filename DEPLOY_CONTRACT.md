# 🚀 How to Deploy ChainOrbArena Smart Contract

Complete guide for deploying the ChainOrbArena contract to Base and Arbitrum networks.

---

## 📋 Prerequisites

1. **Node.js & npm** installed
2. **MetaMask** or another wallet with testnet/mainnet funds
3. **USDC addresses** for each network:
   - Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - Arbitrum: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
4. **Testnet funds** (for testing first)

---

## 🛠️ Setup Hardhat Project

### Option 1: Create New Hardhat Project

```bash
# Create new directory for contracts
mkdir chain-orb-arena-contracts
cd chain-orb-arena-contracts

# Initialize npm
npm init -y

# Install Hardhat and dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv

# Initialize Hardhat
npx hardhat init
# Select: Create a JavaScript project

# Create contract file
mkdir contracts
# Copy ChainOrbArena.sol to contracts/
```

### Option 2: Use Existing Project Structure

If you prefer to keep contracts in this repo:

```bash
# Install Hardhat in current project
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts dotenv

# Initialize Hardhat config
npx hardhat init
```

---

## ⚙️ Configure Hardhat

Create/edit `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Base Sepolia (Testnet)
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
    },
    // Base Mainnet
    base: {
      url: "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
    },
    // Arbitrum Sepolia (Testnet)
    arbitrumSepolia: {
      url: "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614,
    },
    // Arbitrum Mainnet
    arbitrum: {
      url: "https://arb1.arbitrum.io/rpc",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 42161,
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      arbitrum: process.env.ARBISCAN_API_KEY || "",
    },
  },
};
```

---

## 🔐 Environment Variables

Create `.env` file (NEVER commit this!):

```env
# Your wallet private key (for deployment)
PRIVATE_KEY=your_private_key_here

# Explorer API keys (for contract verification)
BASESCAN_API_KEY=your_basescan_api_key
ARBISCAN_API_KEY=your_arbiscan_api_key

# USDC addresses
USDC_BASE=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
USDC_ARBITRUM=0xaf88d065e77c8cC2239327C5EDb3A432268e5831

# Fee recipient (where 0.5% game revenue fees will be collected)
FEE_RECIPIENT=your_fee_recipient_address_here
# Or use owner address as fee recipient:
# OWNER_ADDRESS=your_wallet_address_here
```

**⚠️ WARNING:** Never share your private key! Add `.env` to `.gitignore`.

---

## 📝 Deployment Script

Create `scripts/deploy.js`:

```javascript
const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  // Get USDC address for this network
  const usdcAddresses = {
    baseSepolia: process.env.USDC_BASE || "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia testnet USDC
    base: process.env.USDC_BASE || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    arbitrumSepolia: process.env.USDC_ARBITRUM || "0x75faf114eafb1BDbe2F0316DF893fd58Ce87AAf7", // Arbitrum Sepolia testnet USDC
    arbitrum: process.env.USDC_ARBITRUM || "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
  };

  const usdcAddress = usdcAddresses[network];
  if (!usdcAddress) {
    throw new Error(`USDC address not configured for ${network}`);
  }

  // Get fee recipient address (where 0.5% fees will be sent)
  const feeRecipient = process.env.FEE_RECIPIENT || process.env.OWNER_ADDRESS;
  if (!feeRecipient) {
    throw new Error(`FEE_RECIPIENT or OWNER_ADDRESS must be set in .env`);
  }

  console.log(`Using USDC address: ${usdcAddress}`);
  console.log(`Using fee recipient: ${feeRecipient}`);
  console.log(`Fee: 0.5% of prize pool (50 basis points)`);

  // Deploy contract
  const ChainOrbArena = await hre.ethers.getContractFactory("ChainOrbArena");
  const arena = await ChainOrbArena.deploy(usdcAddress, feeRecipient);

  await arena.waitForDeployment();
  const address = await arena.getAddress();

  console.log(`✅ ChainOrbArena deployed to: ${address}`);
  console.log(`   Network: ${network}`);
  console.log(`   Deployer: ${(await hre.ethers.provider.getSigner()).address}`);

  // Wait for block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await arena.deploymentTransaction()?.wait(5);

  // Verify contract (optional)
  if (network !== "hardhat" && network !== "localhost") {
    console.log("\n🔍 Verifying contract on explorer...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [usdcAddress, feeRecipient],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("⚠️  Verification failed (might already be verified)");
      console.error(error.message);
    }
  }

  console.log("\n📋 Next Steps:");
  console.log(`1. Update lib/contracts.ts with address: ${address}`);
  console.log(`2. For ${network === "base" || network === "baseSepolia" ? "Base" : "Arbitrum"} chain`);
  console.log(`3. Test the contract before using in production!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

---

## 🚀 Deploy to Testnet (Recommended First)

### 1. Get Testnet Funds

**Base Sepolia:**
- Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- Add network to MetaMask:
  - Network Name: Base Sepolia
  - RPC URL: https://sepolia.base.org
  - Chain ID: 84532
  - Currency: ETH

**Arbitrum Sepolia:**
- Faucet: https://faucet.quicknode.com/arbitrum/sepolia
- Add network to MetaMask:
  - Network Name: Arbitrum Sepolia
  - RPC URL: https://sepolia-rollup.arbitrum.io/rpc
  - Chain ID: 421614
  - Currency: ETH

### 2. Deploy to Base Sepolia

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

### 3. Deploy to Arbitrum Sepolia

```bash
npx hardhat run scripts/deploy.js --network arbitrumSepolia
```

### 4. Test the Contracts

Test all functions:
- Create match
- Join match
- Start match
- Finish match (as oracle)
- Claim prize

---

## 🎯 Deploy to Mainnet

### ⚠️ IMPORTANT: Test thoroughly on testnet first!

### 1. Deploy to Base Mainnet

```bash
npx hardhat run scripts/deploy.js --network base
```

### 2. Deploy to Arbitrum Mainnet

```bash
npx hardhat run scripts/deploy.js --network arbitrum
```

---

## 📝 Update Frontend

After deployment, update `lib/contracts.ts`:

```typescript
export const ARENA_ADDRESSES: Record<number, `0x${string}`> = {
  [CHAIN_IDS.BASE]: '0xYourDeployedAddressBase', // Replace with actual address
  [CHAIN_IDS.ARBITRUM]: '0xYourDeployedAddressArbitrum', // Replace with actual address
}
```

---

## ✅ Verify Deployment

Check your contract on the explorer:

**Base:**
- Testnet: https://sepolia.basescan.org
- Mainnet: https://basescan.org

**Arbitrum:**
- Testnet: https://sepolia.arbiscan.io
- Mainnet: https://arbiscan.io

Search for your contract address to verify it's deployed correctly.

---

## 🔍 Troubleshooting

### "Insufficient funds"
- Get more testnet/mainnet ETH from faucet
- Check gas prices

### "Contract verification failed"
- Make sure constructor args are correct
- Try manual verification on explorer

### "USDC address not found"
- Double-check USDC address for the network
- Use testnet USDC for testnet deployment

---

## 🎉 You're Done!

Your contract is now deployed. Next steps:
1. Update contract addresses in frontend
2. Test the full flow
3. Deploy SpacetimeDB module
4. Deploy frontend to Vercel

Good luck! 🚀

