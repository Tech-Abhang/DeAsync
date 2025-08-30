import { DeAsyncSDK } from '../sdk/deasync-sdk.js';
import { loadDeploymentInfo, getNetworkConfig, validateEnvironment } from '../utils/contract-utils.js';
import dotenv from 'dotenv';

dotenv.config();

async function batchDemo() {
  console.log('🚀 Batch Tasks Demo\n');
  
  validateEnvironment();
  const deployment = loadDeploymentInfo();
  const networkConfig = getNetworkConfig('monad');
  
  const sdk = new DeAsyncSDK(
    deployment.address,
    networkConfig.url,
    process.env.PRIVATE_KEY
  );

  const batchTasks = [
    { name: 'Factorial 5', func: (n) => { let r=1; for(let i=1;i<=n;i++) r*=i; return r; }, input: 5 },
    { name: 'Fibonacci 8', func: (n) => { if(n<=1) return n; let a=0,b=1; for(let i=2;i<=n;i++){let t=a+b;a=b;b=t;} return b; }, input: 8 },
    { name: 'Prime Check', func: (n) => { if(n<=1) return false; for(let i=2;i<=Math.sqrt(n);i++) if(n%i===0) return false; return true; }, input: 17 }
  ];

  try {
    await sdk.initialize();
    
    console.log(`📦 Submitting ${batchTasks.length} tasks concurrently...\n`);

    const startTime = Date.now();
    
    // Submit all tasks in parallel
    const promises = batchTasks.map(async (task, index) => {
      console.log(`[${index + 1}] Submitting: ${task.name}`);
      
      try {
        const result = await sdk.deAsync(task.func, task.input, {
          reward: '0.001',
          timeout: 25000
        });
        
        return { ...task, result: result.result, success: true, taskId: result.taskId };
      } catch (error) {
        return { ...task, error: error.message, success: false };
      }
    });

    // Wait for all to complete
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // Show results
    console.log('\n📊 Batch Results:');
    console.log('==================');
    
    results.forEach((result, i) => {
      console.log(`\n[${i + 1}] ${result.name}`);
      if (result.success) {
        console.log(`✅ Result: ${result.result}`);
        console.log(`🆔 Task ID: ${result.taskId || 'Local'}`);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`\n📈 Summary: ${successCount}/${results.length} successful`);
    console.log(`⏱️ Total time: ${totalTime}ms`);

  } catch (error) {
    console.error('❌ Batch demo failed:', error.message);
  } finally {
    sdk.disconnect();
  }
}

batchDemo();
