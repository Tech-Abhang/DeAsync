import { DeAsyncSDK } from '../sdk/deasync-sdk.js';
import { loadDeploymentInfo, getNetworkConfig, validateEnvironment } from '../utils/contract-utils.js';
import dotenv from 'dotenv';

dotenv.config();

async function simpleDemo() {
  console.log('🚀 Simple DeAsync Demo\n');
  
  validateEnvironment();
  const deployment = loadDeploymentInfo();
  const networkConfig = getNetworkConfig('sepolia');
  
  const sdk = new DeAsyncSDK(
    deployment.address,
    networkConfig.url,
    process.env.PRIVATE_KEY
  );

  try {
    await sdk.initialize();
    
    console.log('📤 Submitting simple task: double a number\n');
    
        const result = await sdk.deAsync(
    (x) => x * 2,  // Function to execute
    21,           // Input: 21
    {             // ✅ Added missing opening brace
        reward: '0.001',
        timeout: 15000
    }             // ✅ Added missing closing brace
    );

    console.log('\n✅ Task completed!');
    console.log('📈 Result:', result.result);
    console.log('🆔 Task ID:', result.taskId || 'Local execution');
    console.log('🌐 Remote execution:', result.executedRemotely ? 'Yes' : 'No');

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    sdk.disconnect();
  }
}

simpleDemo();
