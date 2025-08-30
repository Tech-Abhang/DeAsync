import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export function loadDeploymentInfo() {
  try {
    const possiblePaths = [
      path.resolve(process.cwd(), '../contracts/deployed-contract.json'),
      path.resolve(process.cwd(), '../../contracts/deployed-contract.json'),
      path.resolve(process.cwd(), 'deployed-contract.json')
    ];

    for (const deploymentPath of possiblePaths) {
      if (fs.existsSync(deploymentPath)) {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
        console.log(`📄 Loaded deployment from: ${deploymentPath}`);
        return deploymentData;
      }
    }

    throw new Error('Deployment file not found');
  } catch (error) {
    console.error('❌ Could not load deployment info');
    console.error('Make sure the contract is deployed and deployed-contract.json exists');
    process.exit(1);
  }
}

export function getNetworkConfig(networkName) {
  const networks = {
    localhost: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
      name: 'Localhost'
    },
    sepolia: {
      url: 'https://eth-sepolia.g.alchemy.com/v2/doz4UNKcb6gOk9ls2HQ2G',
      chainId: 11155111,
      name: 'Sepolia Testnet'
    },
    mumbai: {
      url: process.env.PROVIDER_URL_MUMBAI || 'https://rpc-mumbai.maticvigil.com',
      chainId: 80001,
      name: 'Mumbai Testnet'
    },
    monad: {
      url: process.env.PROVIDER_URL_MONAD || 'https://testnet-rpc.monad.xyz',
      chainId: 10143,
      name: 'Monad Testnet'
    }
  };

  return networks[networkName] || networks.monad;
}

export function validateEnvironment() {
  const requiredEnvVars = ['PRIVATE_KEY'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('Create a .env file in project root with required variables');
    process.exit(1);
  }

  if (!process.env.PRIVATE_KEY.startsWith('0x')) {
    console.error('❌ PRIVATE_KEY must start with 0x');
    process.exit(1);
  }
}
