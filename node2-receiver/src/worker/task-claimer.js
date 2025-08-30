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
    
    // Nonce management properties
    this.nonceLock = Promise.resolve(); // Serializes nonce operations
    this.nextNonce = null;
    this.pendingTransactions = new Map();
    this.lastProcessedTaskId = 0;
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
      
      // Initialize nonce
      this.nextNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
      this.lastProcessedTaskId = Number(taskCount);
      
      console.log(`🔢 Starting nonce: ${this.nextNonce}`);
      
      this.emit('initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize worker:', error.message);
      throw error;
    }
  }

  async _getNextNonce() {
    // Serialize nonce access to prevent race conditions
    const currentLock = this.nonceLock;
    let releaseNext;
    this.nonceLock = new Promise(resolve => releaseNext = resolve);
    
    await currentLock;
    
    try {
      if (this.nextNonce === null) {
        this.nextNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
      }
      return this.nextNonce++;
    } finally {
      releaseNext();
    }
  }

  async _refreshNonce() {
    // Refresh nonce from network in case of errors
    this.nextNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
    console.log(`🔄 Refreshed nonce to: ${this.nextNonce}`);
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
      const latestTasks = await this.contract.getLatestTasks(5);
      
      for (const task of latestTasks) {
        const taskId = Number(task.id);
        
        // Skip already processed tasks
        if (taskId <= this.lastProcessedTaskId) {
          continue;
        }
        
        // Skip if task is already completed or claimed by someone else
        if (task.completed || (task.worker !== ethers.ZeroAddress && task.worker !== this.wallet.address)) {
          this.lastProcessedTaskId = Math.max(this.lastProcessedTaskId, taskId);
          continue;
        }

        // Skip if we already claimed this task
        if (this.claimedTasks.has(taskId)) {
          continue;
        }

        // Available for claiming
        if (task.worker === ethers.ZeroAddress && !task.completed) {
          console.log(`🎯 Found unclaimed task #${taskId} - attempting to claim`);
          await this.attemptClaimTask(taskId);
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

  async attemptClaimTask(taskId) {
    try {
      console.log(`📋 Attempting to claim task #${taskId}`);
      
      // Check balance before claiming
      const balance = await this.provider.getBalance(this.wallet.address);
      const balanceETH = parseFloat(ethers.formatEther(balance));
      
      if (balanceETH < 0.005) {
        console.error(`💰 Insufficient balance: ${balanceETH.toFixed(6)} ETH. Skipping claim.`);
        return;
      }
      
      // Get next nonce in a thread-safe way
      const nonce = await this._getNextNonce();
      
      // Get optimal gas settings
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('2.0', 'gwei');
      
      console.log(`📋 Claiming task #${taskId} with nonce ${nonce} and gas ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
      
      const tx = await this.contract.claimTask(taskId, {
        nonce: nonce,
        gasLimit: 200000,
        gasPrice: gasPrice
      });
      
      console.log(`⏳ Claim transaction submitted: ${tx.hash}`);
      this.pendingTransactions.set(nonce, { taskId, hash: tx.hash, type: 'claim' });
      
      const receipt = await tx.wait();
      console.log(`✅ Task #${taskId} claimed successfully in block ${receipt.blockNumber}`);
      
      // Clean up tracking
      this.pendingTransactions.delete(nonce);
      
      // Track claimed task
      this.claimedTasks.set(taskId, {
        claimedAt: Date.now(),
        transactionHash: tx.hash
      });
      
      this.emit('taskClaimed', { taskId, transactionHash: tx.hash });
      
    } catch (error) {
      // Handle nonce-related errors specifically
      if (error.code === 'NONCE_EXPIRED' || 
          error.message.includes('nonce too low') ||
          error.message.includes('nonce has already been used')) {
        
        console.log(`🔢 Task #${taskId}: Nonce issue detected - ${error.message}`);
        await this._refreshNonce();
        
        // Don't retry immediately - let next polling cycle handle it
        return;
      }
      
      console.error(`❌ Failed to claim task #${taskId}: ${error.message}`);
    }
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
      
      // Get next nonce
      const nonce = await this._getNextNonce();
      
      // Get gas settings
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('2.0', 'gwei');
      
      const tx = await this.contract.submitResult(taskId, resultJson, {
        nonce: nonce,
        gasLimit: 300000,
        gasPrice: gasPrice
      });
      
      console.log(`⏳ Result submission transaction: ${tx.hash}`);
      this.pendingTransactions.set(nonce, { taskId, hash: tx.hash, type: 'submit' });
      
      const receipt = await tx.wait();
      console.log(`✅ Result submitted for task #${taskId} in block ${receipt.blockNumber}`);
      
      // Clean up tracking
      this.pendingTransactions.delete(nonce);
      this.claimedTasks.delete(taskId);
      
      this.emit('taskCompleted', { 
        taskId, 
        result, 
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber
      });
      
    } catch (error) {
      if (error.code === 'NONCE_EXPIRED' || 
          error.message.includes('nonce too low') ||
          error.message.includes('nonce has already been used')) {
        
        console.log(`🔢 Task #${taskId} result submission: Nonce issue - ${error.message}`);
        await this._refreshNonce();
        
        // Keep task in claimed tasks for retry on next cycle
        console.log(`⏱️ Will retry result submission for task #${taskId} in next round`);
        return;
      }
      
      console.error(`❌ Failed to submit result for task #${taskId}: ${error.message}`);
    }
  }

  async getWorkerStats() {
    try {
      const balance = await this.provider.getBalance(this.wallet.address);
      const contractBalance = await this.contract.balances(this.wallet.address);
      const taskCount = await this.contract.taskCount();
      
      return {
        workerAddress: this.wallet.address,
        ethBalance: ethers.formatEther(balance),
        earnedBalance: ethers.formatEther(contractBalance),
        totalNetworkTasks: taskCount.toString(),
        activeTasks: this.claimedTasks.size,
        lastProcessedTask: this.lastProcessedTaskId,
        pendingTxs: this.pendingTransactions.size,
        currentNonce: this.nextNonce,
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
      
      const nonce = await this._getNextNonce();
      const tx = await this.contract.withdrawBalance({ nonce });
      const receipt = await tx.wait();
      
      console.log('✅ Balance withdrawn successfully');
      return receipt;
    } catch (error) {
      console.error('❌ Failed to withdraw balance:', error.message);
      throw error;
    }
  }
}
