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
  console.log("🚀 DeAsync Node2 Worker - Enhanced Competition Mode");
  console.log("==================================================\n");

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

  // Initialize worker
  const workerName = process.env.WORKER_NAME || "DeAsync-Worker";
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
        console.log(`📈 Result: ${JSON.stringify(result)}`);
        console.log(`📋 Transaction: ${transactionHash}`);
        console.log(`📦 Block: ${blockNumber}`);
      }
    );

    // Start worker polling
    await worker.startPolling();

    // Display periodic stats with more details
    setInterval(async () => {
      const stats = await worker.getWorkerStats();
      if (stats) {
        console.log("\n📊 Worker Statistics:");
        console.log(`👤 Address: ${stats.workerAddress}`);
        console.log(`💰 MONAD Balance: ${stats.ethBalance}`);
        console.log(`💎 Earned: ${stats.earnedBalance} MONAD`);
        console.log(`📈 Network Tasks: ${stats.totalNetworkTasks}`);
        console.log(`🔧 Active Tasks: ${stats.activeTasks}`);
        console.log(`📍 Last Processed: Task #${stats.lastProcessedTask}`);
        console.log(`⛽ Current Gas: ${stats.currentGasPrice} gwei`);
        console.log(`🟢 Status: ${stats.isRunning ? "Running" : "Stopped"}\n`);
      }
    }, 30000); // Every 30 seconds

    // Check for low balance warning
    setInterval(async () => {
      try {
        const balance = await worker.provider.getBalance(worker.wallet.address);
        const balanceETH = parseFloat(ethers.formatEther(balance));

        if (balanceETH < 0.01) {
          // Less than 0.01 MONAD
          console.log(
            `⚠️ WARNING: Low MONAD balance (${balanceETH.toFixed(
              4
            )} MONAD). Consider adding more funds.`
          );
        }
      } catch (error) {
        console.warn("⚠️ Could not check balance:", error.message);
      }
    }, 60000); // Every minute
  } catch (error) {
    console.error("❌ Worker failed:", error.message);
    process.exit(1);
  }
}

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
