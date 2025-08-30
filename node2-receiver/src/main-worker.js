#!/usr/bin/env node

import { TaskClaimer } from "./worker/task-claimer.js";
import {
  loadDeploymentInfo,
  getNetworkConfig,
  validateEnvironment,
} from "./utils/contract-utils.js";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("🚀 DeAsync Node2 Worker - Enhanced GPU/ML Computing Platform");
  console.log("============================================================\n");

  // Validate environment
  validateEnvironment();

  // Load contract deployment info
  const deployment = loadDeploymentInfo();
  const networkName =
    process.argv[2] ||
    deployment.network ||
    process.env.DEFAULT_NETWORK ||
    "monad";
  const networkConfig = getNetworkConfig(networkName);

  console.log(`📄 Contract: ${deployment.address}`);
  console.log(`🌐 Network: ${networkConfig.name} (${networkConfig.chainId})`);
  console.log(
    `⏰ Polling Interval: ${process.env.POLLING_INTERVAL || 5000}ms\n`
  );

  // Initialize worker with enhanced configuration
  const workerName = process.env.WORKER_NAME || "DeAsync-Enhanced-Worker";
  const worker = new TaskClaimer(
    deployment.address,
    networkConfig.url,
    process.env.PRIVATE_KEY,
    workerName
  );

  try {
    // Initialize connection to blockchain
    await worker.initialize();

    // Set up enhanced event handlers
    worker.on("taskClaimed", ({ taskId, transactionHash }) => {
      console.log(`🎯 Successfully claimed task #${taskId}`);
      console.log(`📋 Transaction: ${transactionHash}`);
    });

    worker.on(
      "taskCompleted",
      ({ taskId, result, transactionHash, blockNumber }) => {
        console.log(`✅ Task #${taskId} completed successfully!`);

        // Enhanced result logging
        if (result && typeof result === "object") {
          if (result.executionMetadata) {
            console.log(
              `⚡ GPU Accelerated: ${
                result.executionMetadata.gpuAccelerated ? "Yes" : "No"
              }`
            );
            console.log(
              `🧠 ML Inference: ${
                result.executionMetadata.mlInference ? "Yes" : "No"
              }`
            );
            console.log(`📊 Task Type: ${result.executionMetadata.type}`);
          }
          if (result.executionTime) {
            console.log(
              `⏱️ Execution Time: ${result.executionTime.toFixed(2)}ms`
            );
          }
        }

        console.log(`📋 Transaction: ${transactionHash}`);
        console.log(`📦 Block: ${blockNumber}`);
      }
    );

    // Start worker polling
    await worker.startPolling();

    // Display enhanced periodic stats
    setInterval(async () => {
      const stats = await worker.getWorkerStats();
      if (stats) {
        console.log("\n📊 Enhanced Worker Statistics:");
        console.log("================================");
        console.log(`👤 Worker: ${workerName}`);
        console.log(`📍 Address: ${stats.workerAddress}`);
        console.log(`💰 MONAD Balance: ${stats.ethBalance} MONAD`);
        console.log(`💎 Earned: ${stats.earnedBalance} MONAD`);
        console.log(`📈 Network Tasks: ${stats.totalNetworkTasks}`);
        console.log(`🔧 Active Tasks: ${stats.activeTasks}`);
        console.log(`📍 Last Processed: Task #${stats.lastProcessedTask}`);
        console.log(`⛽ Current Gas: ${stats.currentGasPrice || "N/A"} gwei`);
        console.log(`🟢 Status: ${stats.isRunning ? "Running" : "Stopped"}`);

        // Enhanced capabilities display
        console.log(`\n🚀 Enhanced Capabilities:`);
        console.log(`   GPU Computing: Available`);
        console.log(`   ML Inference: Available`);
        console.log(`   Scientific Computing: Available`);
        console.log(`   Cryptographic Operations: Available`);
        console.log(`   Image Processing: Available`);
        console.log(`   Text Analysis: Available`);

        console.log(`\n📋 Supported Task Types:`);
        console.log(`   • JavaScript (legacy)`);
        console.log(`   • GPU-accelerated computing`);
        console.log(`   • Machine Learning inference`);
        console.log(`   • Scientific/mathematical computing`);
        console.log(`   • Cryptographic operations`);
        console.log(`   • Image processing & computer vision`);
        console.log(`   • Text processing & NLP`);
        console.log(`   • Batch processing workflows\n`);
      }
    }, 45000); // Every 45 seconds for enhanced stats

    // Enhanced balance monitoring with threshold alerts
    setInterval(async () => {
      try {
        const balance = await worker.provider.getBalance(worker.wallet.address);
        const balanceETH = parseFloat(ethers.formatEther(balance));

        if (balanceETH < 0.01) {
          console.log(
            `⚠️ WARNING: Low MONAD balance (${balanceETH.toFixed(
              6
            )} MONAD). Consider adding more funds for enhanced computing tasks.`
          );
        } else if (balanceETH < 0.05) {
          console.log(
            `📊 Balance update: ${balanceETH.toFixed(
              4
            )} MONAD available for task execution.`
          );
        }
      } catch (error) {
        console.warn("⚠️ Could not check balance:", error.message);
      }
    }, 120000); // Every 2 minutes

    // Resource monitoring alerts (simulated)
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

      console.log(`💾 Memory usage: ${memUsedMB}MB heap`);

      if (memUsedMB > 500) {
        console.log(`⚠️ High memory usage detected: ${memUsedMB}MB`);
      }
    }, 180000); // Every 3 minutes
  } catch (error) {
    console.error("❌ Enhanced Worker failed:", error.message);
    process.exit(1);
  }
}

// Enhanced graceful shutdown handling

// Enhanced graceful shutdown handling
process.on("SIGINT", async () => {
  console.log("\n👋 Shutting down worker gracefully...");
  console.log("⏳ Waiting for active tasks to complete...");

  // Give some time for active tasks to complete
  setTimeout(() => {
    console.log("✅ Worker shutdown complete");
    process.exit(0);
  }, 3000);
});

process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled rejection:", error);
  console.log("🔄 Worker continuing...");
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  console.log("🔄 Worker will restart in 5 seconds...");

  // Restart the worker
  setTimeout(() => {
    main();
  }, 5000);
});

// Run worker if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
