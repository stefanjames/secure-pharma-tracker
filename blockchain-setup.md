# Blockchain Setup Guide for PharmaChain

## Quick Fix for "unrecognized-selector" Error

The error you're seeing means the smart contract isn't deployed properly or the ABI doesn't match. Here's how to fix it:

### Step 1: Start Hardhat Network
```bash
npx hardhat node --hostname 0.0.0.0 --port 8545
```
Keep this terminal open.

### Step 2: Deploy Contract (in new terminal)
```bash
npx hardhat run scripts/deploy.mjs --network localhost
```

### Step 3: MetaMask Setup
1. Open MetaMask
2. Add Network:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency Symbol: ETH

3. Import Test Account:
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - This gives you test ETH for transactions

### Step 4: Update Contract Address
After deployment, update the contract address in `client/src/lib/contract-abi.ts` with the deployed address.

## Alternative: Use Database Only
If blockchain continues to cause issues, you can disable Web3 features temporarily:

1. Set `DISABLE_WEB3=true` in environment
2. The app will work with database-only mode
3. All features except blockchain verification will work

## Troubleshooting

### "No active wallet found" Error:
- Ensure MetaMask is unlocked
- Switch to Hardhat Local network
- Import the test account above

### "unrecognized-selector" Error:
- Contract not deployed or wrong ABI
- Follow deployment steps above
- Check contract address matches deployment

### Network Issues:
- Ensure Hardhat node is running on port 8545
- Check MetaMask network settings
- Clear MetaMask activity tab if needed