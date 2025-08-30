#!/usr/bin/env node

import { DeAsyncSDK } from "./src/sdk/deasync-sdk.js";
import dotenv from "dotenv";

dotenv.config();

async function testEnhancedComputing() {
  console.log("🧪 Testing Enhanced DeAsync Computing Platform");
  console.log("===============================================\n");

  const sdk = new DeAsyncSDK(
    "0x0BB70B410ba87d360f89A9CFb49F889Ac4D98C69", // Contract address
    "https://testnet.monad.xyz", // Monad testnet
    process.env.PRIVATE_KEY
  );

  try {
    // Initialize SDK
    await sdk.initialize();
    console.log("✅ SDK initialized successfully\n");

    console.log("🔢 Test 1: Matrix Multiplication Task");
    console.log("====================================");

    const matrixTask = {
      taskType: "gpu",
      operation: "matrixMultiply",
      data: {
        matrixA: [
          [1, 2],
          [3, 4],
        ],
        matrixB: [
          [2, 0],
          [1, 2],
        ],
      },
      options: {
        timeout: 60000,
        priority: "high",
      },
    };

    const matrixTaskId = await sdk.submitTask(
      "GPU Matrix Multiplication Test",
      JSON.stringify(matrixTask),
      { value: "0.01" } // 0.01 MONAD reward
    );

    console.log(`📤 Submitted matrix task: #${matrixTaskId}`);
    console.log("Expected result: [[4,4], [10,8]]");

    console.log("\n🎲 Test 2: Monte Carlo π Estimation");
    console.log("===================================");

    const monteCarloTask = {
      taskType: "gpu",
      operation: "monteCarloPI",
      data: {
        samples: 100000,
      },
      options: {
        timeout: 60000,
        priority: "medium",
      },
    };

    const monteCarloTaskId = await sdk.submitTask(
      "Monte Carlo π Estimation",
      JSON.stringify(monteCarloTask),
      { value: "0.01" }
    );

    console.log(`📤 Submitted Monte Carlo task: #${monteCarloTaskId}`);
    console.log("Expected result: ~3.14159");

    console.log("\n🧠 Test 3: Simple ML Task");
    console.log("========================");

    const mlTask = {
      taskType: "ml",
      operation: "analyze",
      data: {
        text: "This is a great product! I love it very much.",
        analysisType: "sentiment",
      },
      options: {
        timeout: 90000,
        priority: "medium",
      },
    };

    const mlTaskId = await sdk.submitTask(
      "ML Sentiment Analysis",
      JSON.stringify(mlTask),
      { value: "0.015" }
    );

    console.log(`📤 Submitted ML task: #${mlTaskId}`);
    console.log("Expected result: positive sentiment");

    console.log("\n📊 Summary");
    console.log("=========");
    console.log(`Matrix Task ID: ${matrixTaskId}`);
    console.log(`Monte Carlo Task ID: ${monteCarloTaskId}`);
    console.log(`ML Task ID: ${mlTaskId}`);
    console.log("\n💡 Enhanced DeAsync Platform Test Completed!");
    console.log("🔗 Monitor task progress at: https://testnet.monad.xyz");
    console.log("⚡ Workers will process these enhanced computing tasks");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testEnhancedComputing();
}

export { testEnhancedComputing };
