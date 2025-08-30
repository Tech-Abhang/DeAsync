import { ethers } from 'ethers';
import { EventEmitter } from 'events';

const CONTRACT_ABI = [
  "event NewTask(uint256 indexed taskId, address indexed requester, string funcType, string data)",
  "event TaskClaimed(uint256 indexed taskId, address indexed worker)",
  "event TaskCompleted(uint256 indexed taskId, string result)",
  "function submitTask(string funcType, string data) payable",
  "function claimTask(uint256 taskId)",
  "function submitResult(uint256 taskId, string result)",
  "function withdrawBalance()",
  "function getTask(uint256 taskId) view returns (tuple(uint id, address requester, address worker, string funcType, string data, string result, bool completed, uint reward))",
  "function getLatestTasks(uint256 count) view returns (tuple(uint id, address requester, address worker, string funcType, string data, string result, bool completed, uint reward)[])",
  "function taskCount() view returns (uint256)",
  "function balances(address account) view returns (uint256)"
];

export class TaskClaimer extends EventEmitter {
  constructor(contractAddress, providerUrl, privateKey, workerName) {
    super();
    
    this.contractAddress = contractAddress;
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.wallet);
    
    this.workerName = workerName;
    this.isRunning = false;
    this.claimedTasks = new Map();
    this.pollingInterval = process.env.POLLING_INTERVAL || 5000;
    
    // New properties for competitive claiming
    this.lastProcessedTaskId = 0;
    this.maxConcurrentClaims = 1;
    this.claimQueue = [];
  }

  async initialize() {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      const network = await this.provider.getNetwork();
      
      console.log(`🔗 Worker connected to ${network.name || 'Monad'} (Chain ID: ${network.chainId})`);
      console.log(`👷 Worker: ${this.workerName}`);
      console.log(`👤 Address: ${this.wallet.address}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
      
      const taskCount = await this.contract.taskCount();
      console.log(`📊 Current task count on network: ${taskCount}`);
      
      // Initialize last processed task ID
      this.lastProcessedTaskId = Number(taskCount);
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error.message);
      throw error;
    }
  }

  async startPolling() {
    if (this.isRunning) {
      console.log('⚠️ Worker is already running');
      return;
    }

    console.log(`🚀 Starting ${this.workerName} - Polling every ${this.pollingInterval}ms`);
    this.isRunning = true;

    // Start the polling loop
    this.pollingTimer = setInterval(async () => {
      try {
        await this.checkForAvailableTasks();
      } catch (error) {
        console.error('❌ Error during task polling:', error.message);
      }
    }, this.pollingInterval);

    this.emit('started');
  }

  async stopPolling() {
    if (!this.isRunning) {
      console.log('⚠️ Worker is not running');
      return;
    }

    console.log('⏹️ Stopping worker...');
    this.isRunning = false;
    
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    this.emit('stopped');
  }

  async checkForAvailableTasks() {
    try {
      console.log('🔍 Checking for available tasks...');
      
      // Get latest tasks from contract
      const latestTasks = await this.contract.getLatestTasks(10);
      let claimsAttempted = 0;
      const maxClaimsPerRound = 2; // Limit claims per polling round
      
      // Filter for truly available tasks
      const availableTasks = latestTasks.filter(task => {
        const taskId = Number(task.id);
        return (
          task.worker === ethers.ZeroAddress &&  // Unclaimed
          !task.completed &&                     // Not completed
          !this.claimedTasks.has(taskId) &&      // Not already claimed by us
          taskId > this.lastProcessedTaskId      // New task
        );
      });

      if (availableTasks.length === 0) {
        console.log('📭 No new available tasks found');
        return;
      }

      console.log(`🎯 Found ${availableTasks.length} available tasks`);
      
      for (const task of latestTasks) {
        if (claimsAttempted >= maxClaimsPerRound) break;
        
        const taskId = Number(task.id);
        
        // Skip if already processed
        if (taskId <= this.lastProcessedTaskId) continue;
        
        // Available for claiming
        if (task.worker === ethers.ZeroAddress && !task.completed) {
          console.log(`🎯 Found unclaimed task #${taskId} - attempting to claim`);
          
          // Random delay to avoid all workers claiming simultaneously
          const randomDelay = Math.random() * 2000; // 0-2 seconds
          await new Promise(resolve => setTimeout(resolve, randomDelay));
          
          await this.attemptClaimTaskWithRetry(taskId);
          claimsAttempted++;
        }
        
        // Execute our claimed tasks
        if (task.worker === this.wallet.address && !task.completed) {
          console.log(`🔧 Found our claimed task #${taskId} - executing`);
          await this.executeClaimedTask(taskId, task);
        }
        
        this.lastProcessedTaskId = Math.max(this.lastProcessedTaskId, taskId);
      }
      
    } catch (error) {
      console.error('❌ Error checking for tasks:', error.message);
    }
  }

  async attemptClaimTaskWithRetry(taskId, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📋 Attempting to claim task #${taskId} (Attempt ${attempt}/${maxRetries})`);
        
        // Check if task is still available before each attempt
        const task = await this.contract.getTask(taskId);
        if (task.worker !== ethers.ZeroAddress || task.completed) {
          console.log(`⚠️ Task #${taskId} already claimed or completed, skipping`);
          return;
        }
        
        // Increase gas price with each retry
        const baseGasPrice = await this.provider.getGasPrice();
        const multiplier = 100n + BigInt(20 * attempt); // 120%, 140%, 160%
        const gasPrice = baseGasPrice * multiplier / 100n;
        
        const tx = await this.contract.claimTask(taskId, {
          gasLimit: 200000,
          gasPrice: gasPrice
        });
        
        console.log(`⏳ Claim transaction submitted: ${tx.hash} (Gas: ${ethers.formatUnits(gasPrice, 'gwei')} gwei)`);
        
        const receipt = await tx.wait();
        console.log(`✅ Task #${taskId} claimed successfully in block ${receipt.blockNumber}`);
        
        // Track claimed task
        this.claimedTasks.set(taskId, {
          claimedAt: Date.now(),
          transactionHash: tx.hash
        });
        
        this.emit('taskClaimed', { taskId, transactionHash: tx.hash });
        return; // Success, exit retry loop
        
      } catch (error) {
        const errorType = this.handleClaimError(error, taskId);
        
        if (errorType === 'OUTBID' || errorType === 'ALREADY_CLAIMED') {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
            console.log(`⏱️ Task #${taskId} claim failed, retrying in ${delay/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.log(`⚠️ Task #${taskId} claimed by another worker after ${maxRetries} attempts`);
            return;
          }
        } else if (errorType === 'INSUFFICIENT_FUNDS') {
          console.error(`💰 Stopping claims due to insufficient funds`);
          return;
        } else {
          console.error(`❌ Failed to claim task #${taskId}: ${error.message}`);
          return;
        }
      }
    }
  }

  handleClaimError(error, taskId) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('higher priority') || 
        errorMessage.includes('replacement transaction underpriced')) {
      console.log(`⚠️ Task #${taskId}: Another worker submitted higher gas price`);
      return 'OUTBID';
    }
    
    if (errorMessage.includes('already claimed') || 
        errorMessage.includes('task not available')) {
      console.log(`⚠️ Task #${taskId}: Already claimed by another worker`);
      return 'ALREADY_CLAIMED';
    }
    
    if (errorMessage.includes('insufficient funds')) {
      console.error(`💰 Task #${taskId}: Insufficient ETH balance for gas`);
      return 'INSUFFICIENT_FUNDS';
    }
    
    if (errorMessage.includes('nonce')) {
      console.error(`🔢 Task #${taskId}: Nonce issue - ${error.message}`);
      return 'NONCE_ERROR';
    }
    
    console.error(`❌ Task #${taskId}: Unknown error - ${error.message}`);
    return 'UNKNOWN';
  }

  async executeClaimedTask(taskId, taskData) {
    try {
      console.log(`🔧 Executing claimed task #${taskId}`);
      
      // Import TaskExecutor here to avoid circular dependencies
      const { TaskExecutor } = await import('./task-executor.js');
      const executor = new TaskExecutor({
        maxExecutionTime: 30000
      });
      
      // Execute the task
      const result = await executor.executeTask(taskData.data);
      
      // Submit result to blockchain
      await this.submitTaskResult(taskId, result);
      
    } catch (error) {
      console.error(`❌ Failed to execute task #${taskId}: ${error.message}`);
    }
  }

  async submitTaskResult(taskId, result) {
    try {
      console.log(`📤 Submitting result for task #${taskId}`);
      
      const resultJson = JSON.stringify(result);
      
      // Use higher gas price for result submission to ensure it goes through
      const baseGasPrice = await this.provider.getGasPrice();
      const gasPrice = baseGasPrice * 110n / 100n; // 10% higher than current
      
      const tx = await this.contract.submitResult(taskId, resultJson, {
        gasLimit: 300000,
        gasPrice: gasPrice
      });
      
      console.log(`⏳ Result submission transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Result submitted for task #${taskId} in block ${receipt.blockNumber}`);
      
      // Remove from our tracking
      this.claimedTasks.delete(taskId);
      
      this.emit('taskCompleted', { 
        taskId, 
        result, 
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      });
      
    } catch (error) {
      console.error(`❌ Failed to submit result for task #${taskId}: ${error.message}`);
      
      // Don't remove from tracking if submission failed - we can retry
      if (error.message.includes('higher priority') || error.message.includes('replacement')) {
        console.log(`⏱️ Will retry result submission for task #${taskId} in next round`);
      }
    }
  }

  async getWorkerStats() {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      const contractBalance = await this.contract.balances(this.wallet.address);
      const taskCount = await this.contract.taskCount();
      const gasPrice = await this.provider.getGasPrice();
      
      return {
        workerAddress: this.wallet.address,
        ethBalance: ethers.formatEther(balance),
        earnedBalance: ethers.formatEther(contractBalance),
        totalNetworkTasks: taskCount.toString(),
        activeTasks: this.claimedTasks.size,
        lastProcessedTask: this.lastProcessedTaskId,
        currentGasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        isRunning: this.isRunning
      };
    } catch (error) {
      console.error('❌ Error getting worker stats:', error.message);
      return null;
    }
  }

  async withdrawEarnings() {
    try {
      console.log('💸 Withdrawing earned balance...');
      
      const tx = await this.contract.withdrawBalance();
      const receipt = await tx.wait();
      
      console.log('✅ Balance withdrawn successfully');
      return receipt;
    } catch (error) {
      console.error('❌ Failed to withdraw balance:', error.message);
      throw error;
    }
  }
}
