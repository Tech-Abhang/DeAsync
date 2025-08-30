import { GPUComputeEngine } from './src/compute/gpu-compute-engine.js';

async function testLocal() {
  console.log('🧪 Testing Mathematical Compute Engine');
  
  const engine = new GPUComputeEngine();
  await engine.initialize();
  
  console.log('✅ Engine initialized');
  console.log('Capabilities:', engine.getCapabilities());
  
  // Test matrix multiply
  const result = await engine.matrixMultiply([[1,2],[3,4]], [[2,0],[1,2]]);
  console.log('Matrix result:', result);
  
  // Test Monte Carlo
  const pi = await engine.monteCarloPI(10000);
  console.log('Pi estimation:', pi);
  
  await engine.cleanup();
}

testLocal().catch(console.error);
