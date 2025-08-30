import { ethers } from "ethers";
import { EventEmitter } from "events";

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

export class DeAsyncSDK extends EventEmitter {
  constructor(contractAddress, providerUrl, privateKey) {
    super();
    
    this.contractAddress = contractAddress;
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.wallet);
    
    this.isConnected = false;
    this.taskQueue = new Map();
    
    this._setupEventListeners();
  }

  async initialize() {
    try {
      // Verify connection
      const balance = await this.wallet.getBalance();
      const network = await this.provider.getNetwork();
      
      console.log(`🔗 Connected to ${network.name} (Chain ID: ${network.chainId})`);
      console.log(`👤 Wallet: ${this.wallet.address}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
      
      // Test contract connection
      const taskCount = await this.contract.taskCount();
      console.log(`📊 Current task count: ${taskCount}`);
      
      this.isConnected = true;
      this.emit('connected');
      
    } catch (error) {
      console.error('❌ Failed to initialize SDK:', error.message);
      throw error;
    }
  }

  _setupEventListeners() {
    // Listen for new tasks
    this.contract.on('NewTask', (taskId, requester, funcType, data, event) => {
      const taskInfo = {
        taskId: Number(taskId),
        requester,
        funcType,
        data,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };
      
      console.log(`🆕 New Task Created: #${taskInfo.taskId}`);
      this.emit('newTask', taskInfo);
    });

    // Listen for task claims
    this.contract.on('TaskClaimed', (taskId, worker, event) => {
      const claimInfo = {
        taskId: Number(taskId),
        worker,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };
      
      console.log(`👷 Task #${claimInfo.taskId} claimed by: ${worker.slice(0, 8)}...`);
      this.emit('taskClaimed', claimInfo);
    });

    // Listen for task completions
    this.contract.on('TaskCompleted', (taskId, result, event) => {
      const completionInfo = {
        taskId: Number(taskId),
        result,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      };
      
      console.log(`✅ Task #${completionInfo.taskId} completed!`);
      this.emit('taskCompleted', completionInfo);
      
      // Resolve any waiting promises
      if (this.taskQueue.has(Number(taskId))) {
        const { resolve } = this.taskQueue.get(Number(taskId));
        this.taskQueue.delete(Number(taskId));
        
        try {
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (e) {
          resolve(result);
        }
      }
    });
  }

  async submitTask(funcCode, inputData, options = {}) {
    if (!this.isConnected) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    const {
      funcType = 'javascript',
      reward = '0.001',
      timeout = 30000,
      fallbackToLocal = true
    } = options;

    try {
      console.log('📤 Preparing task submission...');
      
      // Prepare task payload
      const taskPayload = JSON.stringify({
        func: funcCode.toString(),
        input: inputData,
        timestamp: Date.now()
      });

      const rewardWei = ethers.parseEther(reward.toString());
      
      console.log(`💰 Reward: ${reward} ETH`);
      console.log(`📝 Function: ${funcCode.toString().slice(0, 50)}...`);
      console.log(`📊 Input: ${JSON.stringify(inputData)}`);
      
      // Submit transaction
      const tx = await this.contract.submitTask(funcType, taskPayload, { 
        value: rewardWei,
        gasLimit: 500000
      });
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Extract task ID from logs
      const taskId = this._extractTaskIdFromReceipt(receipt);
      
      if (!taskId) {
        throw new Error('Could not extract task ID from transaction receipt');
      }
      
      console.log(`🆔 Task ID: ${taskId}`);
      
      // Wait for completion
      const result = await this._waitForTaskCompletion(taskId, timeout);
      
      return {
        taskId,
        result,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        executedRemotely: true
      };
      
    } catch (error) {
      console.error('❌ Task submission failed:', error.message);
      
      // Fallback to local execution
      if (fallbackToLocal) {
        console.log('🔄 Attempting local fallback...');
        try {
          const localResult = await this._executeLocally(funcCode, inputData);
          return {
            taskId: null,
            result: localResult,
            executedRemotely: false,
            fallback: true
          };
        } catch (fallbackError) {
          console.error('❌ Local fallback failed:', fallbackError.message);
        }
      }
      
      throw error;
    }
  }

  _extractTaskIdFromReceipt(receipt) {
    for (const log of receipt.logs) {
      try {
        const parsedLog = this.contract.interface.parseLog(log);
        if (parsedLog.name === 'NewTask') {
          return Number(parsedLog.args.taskId);
        }
      } catch (e) {
        // Log doesn't match our interface, skip
        continue;
      }
    }
    return null;
  }

  async _waitForTaskCompletion(taskId, timeout) {
    console.log(`⏳ Waiting for task ${taskId} to complete...`);
    
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.taskQueue.delete(taskId);
        reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
      }, timeout);

      // Store the resolve function to call when task completes
      this.taskQueue.set(taskId, { 
        resolve: (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });
    });
  }

  async _executeLocally(funcCode, inputData) {
    console.log('💻 Executing locally as fallback...');
    
    try {
      // Create and execute function
      const func = new Function('return ' + funcCode)();
      const result = await Promise.resolve(func(inputData));
      
      console.log('✅ Local execution completed');
      return result;
      
    } catch (error) {
      throw new Error(`Local execution failed: ${error.message}`);
    }
  }

  // Convenience method - main API
  async deAsync(funcCode, inputData, options = {}) {
    return await this.submitTask(funcCode, inputData, options);
  }

  // Utility methods
  async getTask(taskId) {
    const task = await this.contract.getTask(taskId);
    return {
      id: Number(task.id),
      requester: task.requester,
      worker: task.worker,
      funcType: task.funcType,
      data: JSON.parse(task.data),
      result: task.result ? JSON.parse(task.result) : null,
      completed: task.completed,
      reward: ethers.formatEther(task.reward)
    };
  }

  async getLatestTasks(count = 10) {
    const tasks = await this.contract.getLatestTasks(count);
    return tasks.map(task => ({
      id: Number(task.id),
      requester: task.requester,
      worker: task.worker,
      funcType: task.funcType,
      completed: task.completed,
      reward: ethers.formatEther(task.reward)
    }));
  }

  async getTaskCount() {
    return Number(await this.contract.taskCount());
  }

  async getBalance() {
    const balance = await this.contract.balances(this.wallet.address);
    return ethers.formatEther(balance);
  }

  async withdrawBalance() {
    console.log('💸 Withdrawing balance...');
    const tx = await this.contract.withdrawBalance();
    const receipt = await tx.wait();
    console.log('✅ Balance withdrawn successfully');
    return receipt;
  }

  disconnect() {
    console.log('👋 Disconnecting SDK...');
    this.contract.removeAllListeners();
    this.removeAllListeners();
    this.taskQueue.clear();
    this.isConnected = false;
  }
}
