#!/usr/bin/env node

import { DeAsyncSDK } from './src/sdk/deasync-sdk.js';
import { loadDeploymentInfo, getNetworkConfig, validateEnvironment } from './src/utils/contract-utils.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🚀 DeAsync Node1 Requester');
  console.log('==========================\n');

  // Validate environment
  validateEnvironment();

  // Load contract deployment
  const deployment = loadDeploymentInfo();
  const networkName = process.argv[2] || deployment.network || 'localhost';
  const networkConfig = getNetworkConfig(networkName);

  console.log(`📄 Contract: ${deployment.address}`);
  console.log(`🌐 Network: ${networkConfig.name} (${networkConfig.chainId})\n`);

  // Initialize SDK
  const sdk = new DeAsyncSDK(
    deployment.address,
    networkConfig.url,
    process.env.PRIVATE_KEY
  );

  try {
    await sdk.initialize();
    
    // Run demo tasks
    await runDemoTasks(sdk);
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  } finally {
    sdk.disconnect();
    process.exit(0);
  }
}

async function runDemoTasks(sdk) {
  const demoTasks = [
    {
      name: 'Simple Multiplication',
      func: (x) => x * 2,
      input: 42,
      expected: 84
    },
    {
      name: 'Array Sum',
      func: (arr) => arr.reduce((a, b) => a + b, 0),
      input: [1, 2, 3, 4, 5],
      expected: 15
    },
    {
      name: 'String Processing',
      func: (str) => str.toUpperCase().split('').reverse().join(''),
      input: 'DeAsync',
      expected: 'CNYNSAED'
    },
    {
      name: 'Object Processing',
      func: (obj) => Object.keys(obj).length + Object.values(obj).reduce((a, b) => a + b, 0),
      input: { a: 1, b: 2, c: 3 },
      expected: 9
    }
  ];

  console.log(`\n🧪 Running ${demoTasks.length} demo tasks...\n`);

  for (let i = 0; i < demoTasks.length; i++) {
    const task = demoTasks[i];
    console.log(`\n[${i + 1}/${demoTasks.length}] ${task.name}`);
    console.log(`📊 Input: ${JSON.stringify(task.input)}`);
    console.log(`🎯 Expected: ${JSON.stringify(task.expected)}`);
    
    const startTime = Date.now();
    
    try {
      const result = await sdk.deAsync(task.func, task.input, {
        reward: '0.001',
        timeout: 30000
      });
      
      const duration = Date.now() - startTime;
      
      console.log(`📈 Result: ${JSON.stringify(result.result)}`);
      console.log(`⏱️ Duration: ${duration}ms`);
      
      if (result.executedRemotely) {
        console.log(`✅ Executed remotely (Task #${result.taskId})`);
      } else {
        console.log('🔄 Executed locally (fallback)');
      }
      
      // Verify correctness
      const isCorrect = JSON.stringify(result.result) === JSON.stringify(task.expected);
      console.log(isCorrect ? '✅ Result correct!' : '❌ Result mismatch!');
      
    } catch (error) {
      console.log(`❌ Task failed: ${error.message}`);
    }
    
    // Wait between tasks
    if (i < demoTasks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Show final statistics
  console.log('\n📊 Final Statistics:');
  const taskCount = await sdk.getTaskCount();
  console.log(`📈 Total network tasks: ${taskCount}`);
  
  const balance = await sdk.getBalance();
  console.log(`💰 Earned balance: ${balance} ETH`);
  
  if (parseFloat(balance) > 0) {
    console.log('💸 You can withdraw your balance using sdk.withdrawBalance()');
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
