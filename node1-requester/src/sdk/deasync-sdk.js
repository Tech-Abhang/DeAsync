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
    this.usePolling = true; // ✅ Force polling mode for Monad
    
    // Don't setup event listeners that cause eth_newFilter errors
    console.log('⚠️ Using polling mode - event filters disabled for Monad compatibility');
  }

  async initialize() {
    try {
      // ✅ Fixed: Use provider.getBalance instead of wallet.getBalance
      const balance = await this.provider.getBalance(this.wallet.address);
      const network = await this.provider.getNetwork();
      
      console.log(`🔗 Connected to ${network.name || 'Monad'} (Chain ID: ${network.chainId})`);
      console.log(`👤 Wallet: ${this.wallet.address}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
      
      const taskCount = await this.contract.taskCount();
      console.log(`📊 Current task count: ${taskCount}`);
      
      this.isConnected = true;
      this.emit('connected');
      
    } catch (error) {
      console.error('❌ Failed to initialize SDK:', error.message);
      throw error;
    }
  }

  // ✅ No event listeners to avoid eth_newFilter calls
  _setupEventListeners() {
    console.log('📊 Event filtering disabled - using polling mode');
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
      
      const taskPayload = JSON.stringify({
        func: funcCode.toString(),
        input: inputData,
        timestamp: Date.now()
      });

      const rewardWei = ethers.parseEther(reward.toString());
      
      const tx = await this.contract.submitTask(funcType, taskPayload, {
        value: rewardWei,
        gasLimit: 500000
      });
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      const taskId = this._extractTaskIdFromReceipt(receipt);
      
      if (!taskId) {
        throw new Error('Could not extract task ID from transaction receipt');
      }
      
      console.log(`🆔 Task ID: ${taskId}`);
      
      // ✅ Use polling instead of events
      const result = await this._pollForTaskCompletion(taskId, timeout);
      
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
        continue;
      }
    }
    return null;
  }

  // ✅ NEW: Polling-based task completion monitoring
  async _pollForTaskCompletion(taskId, timeout) {
    console.log(`📊 Polling for task ${taskId} completion...`);
    
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds
    
    return new Promise((resolve, reject) => {
      const pollTimer = setInterval(async () => {
        try {
          // Check timeout
          if (Date.now() - startTime > timeout) {
            clearInterval(pollTimer);
            reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
            return;
          }

          // Poll contract for task status
          const task = await this.contract.getTask(taskId);
          
          if (task.completed) {
            clearInterval(pollTimer);
            console.log(`✅ Task ${taskId} completed via polling!`);
            
            try {
              const parsedResult = JSON.parse(task.result);
              resolve(parsedResult);
            } catch (e) {
              resolve(task.result);
            }
          } else {
            console.log(`⏳ Task ${taskId} still pending...`);
          }
          
        } catch (error) {
          console.error(`❌ Error polling task ${taskId}:`, error.message);
          // Don't reject here, keep trying unless timeout
        }
      }, pollInterval);
    });
  }

  // ✅ Keep existing _waitForTaskCompletion for compatibility but use polling
  async _waitForTaskCompletion(taskId, timeout) {
    return await this._pollForTaskCompletion(taskId, timeout);
  }

  async _executeLocally(funcCode, inputData) {
    console.log('💻 Executing locally as fallback...');
    
    try {
      const func = new Function('return ' + funcCode)();
      const result = await Promise.resolve(func(inputData));
      
      console.log('✅ Local execution completed');
      return result;
      
    } catch (error) {
      throw new Error(`Local execution failed: ${error.message}`);
    }
  }

  async deAsync(funcCode, inputData, options = {}) {
    return await this.submitTask(funcCode, inputData, options);
  }

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
    // No event listeners to remove
    this.removeAllListeners();
    this.taskQueue.clear();
    this.isConnected = false;
  }
}
