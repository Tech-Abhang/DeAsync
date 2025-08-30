import { DeAsyncSDK } from "../sdk/deasync-sdk.js";
import { GPUTemplates, CostEstimator } from "../templates/task-templates.js";
import {
  loadDeploymentInfo,
  getNetworkConfig,
  validateEnvironment,
} from "../utils/contract-utils.js";
import dotenv from "dotenv";

dotenv.config();

async function gpuDemo() {
  console.log("🚀 GPU Computing Demo - DeAsync Advanced Platform");
  console.log("==================================================\n");

  validateEnvironment();
  const deployment = loadDeploymentInfo();
  const networkConfig = getNetworkConfig("monad");

  const sdk = new DeAsyncSDK(
    deployment.address,
    networkConfig.url,
    process.env.PRIVATE_KEY
  );

  try {
    await sdk.initialize();

    console.log("🔥 Running GPU-accelerated computational tasks...\n");

    // 1. Matrix Multiplication Demo
    await runMatrixMultiplicationDemo(sdk);

    // 2. Vector Similarity Search Demo
    await runVectorSimilarityDemo(sdk);

    // 3. Mandelbrot Fractal Demo
    await runMandelbrotDemo(sdk);

    // 4. Monte Carlo Simulation Demo
    await runMonteCarloDemo(sdk);

    // 5. Parallel Processing Demo
    await runParallelMapDemo(sdk);

    console.log("\n✅ GPU Computing Demo completed successfully!");
  } catch (error) {
    console.error("❌ GPU Demo failed:", error.message);
  } finally {
    sdk.disconnect();
  }
}

async function runMatrixMultiplicationDemo(sdk) {
  console.log("\n📊 1. GPU Matrix Multiplication");
  console.log("=================================");

  // Create test matrices
  const matrixA = [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12],
    [13, 14, 15, 16],
  ];

  const matrixB = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  console.log("Matrix A (4x4):");
  matrixA.forEach((row) => console.log(row.join("\t")));
  console.log("\nMatrix B (4x4 Identity):");
  matrixB.forEach((row) => console.log(row.join("\t")));

  // Create task using template
  const task = GPUTemplates.matrixMultiplication(matrixA, matrixB, {
    precision: "single",
    optimize: true,
  });

  // Show cost estimation
  const costEstimate = CostEstimator.estimateTaskCost(task);
  console.log(
    `\n💰 Estimated cost: ${costEstimate.estimatedCost} ETH (${costEstimate.recommendation})`
  );

  const startTime = Date.now();

  try {
    const result = await sdk.submitTask(
      task.payload.operation,
      JSON.stringify(task.payload.data),
      {
        reward: task.options.reward,
        timeout: task.options.timeout,
        funcType: task.type,
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Matrix multiplication completed in ${duration}ms`);
    console.log("Result Matrix (A × B):");

    if (result.result && result.result.result) {
      result.result.result.forEach((row) => {
        console.log(row.map((n) => n.toFixed(1)).join("\t"));
      });

      console.log(
        `📊 GPU Accelerated: ${
          result.result.gpuAccelerated ? "Yes" : "No (CPU fallback)"
        }`
      );
      console.log(
        `⏱️ Execution time: ${result.result.executionTime?.toFixed(2)}ms`
      );
    }
  } catch (error) {
    console.log(`❌ Matrix multiplication failed: ${error.message}`);
  }
}

async function runVectorSimilarityDemo(sdk) {
  console.log("\n🔍 2. GPU Vector Similarity Search");
  console.log("====================================");

  // Create sample vectors for similarity search
  const queryVector = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  const vectorDatabase = Array.from({ length: 1000 }, (_, i) =>
    Array.from({ length: 8 }, () => Math.random())
  );

  // Add some similar vectors
  vectorDatabase[100] = [0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81]; // Very similar
  vectorDatabase[500] = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]; // Somewhat similar

  console.log(`Query vector: [${queryVector.join(", ")}]`);
  console.log(
    `Database size: ${vectorDatabase.length} vectors (8-dimensional)`
  );

  const task = GPUTemplates.vectorSimilaritySearch(
    queryVector,
    vectorDatabase,
    {
      topK: 5,
      threshold: 0.5,
    }
  );

  const costEstimate = CostEstimator.estimateTaskCost(task);
  console.log(`💰 Estimated cost: ${costEstimate.estimatedCost} ETH`);

  const startTime = Date.now();

  try {
    const result = await sdk.submitTask(
      task.payload.operation,
      JSON.stringify(task.payload.data),
      {
        reward: task.options.reward,
        timeout: task.options.timeout,
        funcType: task.type,
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Vector similarity search completed in ${duration}ms`);

    if (result.result && result.result.results) {
      console.log(`📊 Found ${result.result.results.length} similar vectors:`);
      result.result.results.forEach((match, i) => {
        console.log(
          `${i + 1}. Index ${
            match.index
          }: similarity = ${match.similarity.toFixed(4)}`
        );
      });

      console.log(
        `🚀 GPU Accelerated: ${result.result.gpuAccelerated ? "Yes" : "No"}`
      );
      console.log(
        `📈 Search through ${
          result.result.totalVectors
        } vectors in ${result.result.executionTime?.toFixed(2)}ms`
      );
    }
  } catch (error) {
    console.log(`❌ Vector similarity search failed: ${error.message}`);
  }
}

async function runMandelbrotDemo(sdk) {
  console.log("\n🌀 3. GPU Mandelbrot Fractal Generation");
  console.log("=========================================");

  const width = 400;
  const height = 400;
  const maxIterations = 50;

  console.log(
    `Generating ${width}x${height} Mandelbrot fractal with ${maxIterations} iterations`
  );

  const task = GPUTemplates.mandelbrotFractal(width, height, {
    maxIterations,
    xMin: -2.0,
    xMax: 1.0,
    yMin: -1.5,
    yMax: 1.5,
  });

  const costEstimate = CostEstimator.estimateTaskCost(task);
  console.log(`💰 Estimated cost: ${costEstimate.estimatedCost} ETH`);
  console.log(`🖥️ Expected GPU speedup: ~10-50x vs CPU`);

  const startTime = Date.now();

  try {
    const result = await sdk.submitTask(
      task.payload.operation,
      JSON.stringify(task.payload.data),
      {
        reward: task.options.reward,
        timeout: task.options.timeout,
        funcType: task.type,
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Mandelbrot generation completed in ${duration}ms`);

    if (result.result && result.result.fractal) {
      console.log(
        `📊 Generated ${result.result.width}x${result.result.height} fractal`
      );
      console.log(
        `⚡ GPU Accelerated: ${result.result.gpuAccelerated ? "Yes" : "No"}`
      );
      console.log(`🎨 Iterations: ${result.result.iterations}`);
      console.log(
        `⏱️ GPU execution time: ${result.result.executionTime?.toFixed(2)}ms`
      );

      // Show a small sample of the fractal data
      console.log("\\n🎨 Fractal sample (top-left 10x10):");
      for (let y = 0; y < Math.min(10, result.result.fractal.length); y++) {
        const row = result.result.fractal[y].slice(0, 10);
        console.log(row.map((val) => val.toFixed(1)).join(" "));
      }
    }
  } catch (error) {
    console.log(`❌ Mandelbrot generation failed: ${error.message}`);
  }
}

async function runMonteCarloDemo(sdk) {
  console.log("\n🎲 4. GPU Monte Carlo π Estimation");
  console.log("====================================");

  const samples = 1000000; // 1 million samples

  console.log(`Estimating π using ${samples.toLocaleString()} random samples`);
  console.log("Method: Monte Carlo simulation (random points in unit circle)");

  const task = GPUTemplates.monteCarloPI(samples);

  const costEstimate = CostEstimator.estimateTaskCost(task);
  console.log(`💰 Estimated cost: ${costEstimate.estimatedCost} ETH`);

  const startTime = Date.now();

  try {
    const result = await sdk.submitTask(
      task.payload.operation,
      JSON.stringify(task.payload.data),
      {
        reward: task.options.reward,
        timeout: task.options.timeout,
        funcType: task.type,
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Monte Carlo simulation completed in ${duration}ms`);

    if (result.result && result.result.piEstimate) {
      const actualPi = Math.PI;
      const estimated = result.result.piEstimate;
      const error = Math.abs(estimated - actualPi);
      const accuracy = (1 - error / actualPi) * 100;

      console.log(`📊 Results:`);
      console.log(`   Estimated π: ${estimated.toFixed(6)}`);
      console.log(`   Actual π:    ${actualPi.toFixed(6)}`);
      console.log(`   Error:       ${error.toFixed(6)}`);
      console.log(`   Accuracy:    ${accuracy.toFixed(3)}%`);
      console.log(`   Samples:     ${result.result.samples.toLocaleString()}`);
      console.log(`   Hits:        ${result.result.hits.toLocaleString()}`);
      console.log(
        `⚡ GPU Accelerated: ${result.result.gpuAccelerated ? "Yes" : "No"}`
      );
      console.log(
        `⏱️ Execution time: ${result.result.executionTime?.toFixed(2)}ms`
      );
    }
  } catch (error) {
    console.log(`❌ Monte Carlo simulation failed: ${error.message}`);
  }
}

async function runParallelMapDemo(sdk) {
  console.log("\n🔄 5. GPU Parallel Map Processing");
  console.log("===================================");

  // Create a large array for parallel processing
  const array = Array.from({ length: 10000 }, (_, i) => i + 1);
  const mapFunction = "function(x) { return Math.sqrt(x * x + 1); }"; // Expensive operation

  console.log(`Processing ${array.length.toLocaleString()} elements`);
  console.log(`Operation: f(x) = √(x² + 1) - computationally intensive`);

  const task = GPUTemplates.parallelMap(array, mapFunction);

  const costEstimate = CostEstimator.estimateTaskCost(task);
  console.log(`💰 Estimated cost: ${costEstimate.estimatedCost} ETH`);
  console.log(`📈 Expected speedup: ${task.metadata.speedup} (GPU vs CPU)`);

  const startTime = Date.now();

  try {
    const result = await sdk.submitTask(
      task.payload.operation,
      JSON.stringify(task.payload.data),
      {
        reward: task.options.reward,
        timeout: task.options.timeout,
        funcType: task.type,
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Parallel map processing completed in ${duration}ms`);

    if (result.result && result.result.result) {
      const processedArray = result.result.result;

      console.log(
        `📊 Processed ${processedArray.length.toLocaleString()} elements`
      );
      console.log(
        `⚡ GPU Accelerated: ${result.result.gpuAccelerated ? "Yes" : "No"}`
      );
      console.log(
        `⏱️ GPU execution time: ${result.result.executionTime?.toFixed(2)}ms`
      );
      console.log(
        `🚀 Throughput: ${(
          (processedArray.length / (result.result.executionTime || 1)) *
          1000
        ).toFixed(0)} elements/second`
      );

      // Show sample results
      console.log("\\nSample results:");
      for (let i = 0; i < Math.min(10, processedArray.length); i++) {
        console.log(`f(${i + 1}) = ${processedArray[i].toFixed(4)}`);
      }
    }
  } catch (error) {
    console.log(`❌ Parallel map processing failed: ${error.message}`);
  }
}

// Add delay between demos
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Enhanced demo with delay between tasks
async function enhancedGpuDemo() {
  console.log("🚀 Enhanced GPU Computing Demo");
  console.log("==============================\\n");

  const demos = [
    { name: "Matrix Multiplication", fn: runMatrixMultiplicationDemo },
    { name: "Vector Similarity Search", fn: runVectorSimilarityDemo },
    { name: "Mandelbrot Fractal", fn: runMandelbrotDemo },
    { name: "Monte Carlo π", fn: runMonteCarloDemo },
    { name: "Parallel Map", fn: runParallelMapDemo },
  ];

  validateEnvironment();
  const deployment = loadDeploymentInfo();
  const networkConfig = getNetworkConfig("monad");

  const sdk = new DeAsyncSDK(
    deployment.address,
    networkConfig.url,
    process.env.PRIVATE_KEY
  );

  try {
    await sdk.initialize();

    for (let i = 0; i < demos.length; i++) {
      const demo = demos[i];
      console.log(`\\n[${i + 1}/${demos.length}] Running ${demo.name} demo...`);

      try {
        await demo.fn(sdk);
        console.log(`✅ ${demo.name} demo completed`);
      } catch (error) {
        console.log(`❌ ${demo.name} demo failed: ${error.message}`);
      }

      // Wait between demos to avoid overwhelming the network
      if (i < demos.length - 1) {
        console.log("\\n⏳ Waiting 5 seconds before next demo...");
        await delay(5000);
      }
    }

    console.log("\\n🎉 All GPU demos completed!");
  } catch (error) {
    console.error("❌ Enhanced GPU Demo failed:", error.message);
  } finally {
    sdk.disconnect();
  }
}

// Run the appropriate demo
if (process.argv[2] === "enhanced") {
  enhancedGpuDemo();
} else {
  gpuDemo();
}
