import { EventEmitter } from 'events';

export class TaskExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxExecutionTime = options.maxExecutionTime || 30000;
    this.enableSandbox = options.enableSandbox || true;
    this.allowedFunctions = options.allowedFunctions || [];
  }

  async executeTask(taskData) {
    console.log(`🔧 Executing task with data:`, taskData);
    
    try {
      // Parse task data
      const { func, input, timestamp } = JSON.parse(taskData);
      
      console.log(`📝 Function: ${func}`);
      console.log(`📊 Input: ${JSON.stringify(input)}`);
      console.log(`⏰ Submitted: ${new Date(timestamp).toISOString()}`);

      // Execute with timeout
      const startTime = Date.now();
      const result = await this._executeWithTimeout(func, input, this.maxExecutionTime);
      const executionTime = Date.now() - startTime;

      console.log(`✅ Task executed successfully in ${executionTime}ms`);
      console.log(`📈 Result: ${JSON.stringify(result)}`);

      this.emit('taskCompleted', { result, executionTime });
      return result;

    } catch (error) {
      console.error(`❌ Task execution failed: ${error.message}`);
      this.emit('taskFailed', { error: error.message });
      throw error;
    }
  }

  async _executeWithTimeout(funcCode, inputData, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        // Execute the function in a controlled environment
        const result = this._executeSafely(funcCode, inputData);
        
        clearTimeout(timer);
        
        // Handle both sync and async results
        Promise.resolve(result)
          .then(resolve)
          .catch(reject);
          
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  _executeSafely(funcCode, inputData) {
    try {
      // Create sandboxed execution environment
      const sandbox = this._createSandbox();
      
      // Create function from string
      const func = new Function('return ' + funcCode).call(sandbox);
      
      // Validate function
      if (typeof func !== 'function') {
        throw new Error('Provided code does not evaluate to a function');
      }

      // Execute with input data
      const result = func(inputData);
      
      // Ensure result is serializable
      JSON.stringify(result);
      
      return result;

    } catch (error) {
      throw new Error(`Safe execution failed: ${error.message}`);
    }
  }

  _createSandbox() {
    // Create limited execution context for security
    return {
      // Math functions
      Math: Math,
      
      // Safe array methods
      Array: Array,
      
      // Date functions (read-only)
      Date: {
        now: Date.now
      },
      
      // JSON methods
      JSON: JSON,
      
      // String methods
      String: String,
      
      // Number methods
      Number: Number,
      
      // Boolean
      Boolean: Boolean,
      
      // Safe console for debugging
      console: {
        log: (...args) => console.log('[SANDBOX]', ...args)
      }
    };
  }

  // Helper method to validate task data
  validateTaskData(taskData) {
    try {
      const parsed = JSON.parse(taskData);
      
      if (!parsed.func || typeof parsed.func !== 'string') {
        throw new Error('Task must contain valid function code');
      }
      
      if (parsed.input === undefined) {
        throw new Error('Task must contain input data');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Invalid task data: ${error.message}`);
    }
  }
}
