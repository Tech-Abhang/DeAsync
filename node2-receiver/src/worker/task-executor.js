import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import { GPUComputeEngine } from "../compute/gpu-compute-engine.js";
import { MLModelManager } from "../compute/ml-model-manager.js";
import { ResourceMonitor } from "../compute/resource-monitor.js";
import * as mathjs from "mathjs";

/**
 * Enhanced Task Executor for DeAsync Platform
 * Supports GPU-accelerated computing, machine learning inference,
 * scientific computing, and advanced computational workloads
 */
export class TaskExecutor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.maxExecutionTime = options.maxExecutionTime || 120000; // 2 minutes for complex tasks
    this.enableSandbox = options.enableSandbox || true;
    this.allowedFunctions = options.allowedFunctions || [];

    // Initialize compute engines
    this.gpuEngine = new GPUComputeEngine({
      maxExecutionTime: this.maxExecutionTime,
      ...options.gpu,
    });

    this.mlManager = new MLModelManager({
      cacheTimeoutSeconds: options.mlCacheTimeout || 3600,
      maxCachedModels: options.maxCachedModels || 5,
      ...options.ml,
    });

    this.resourceMonitor = new ResourceMonitor({
      monitoringInterval: options.monitoringInterval || 10000,
      enableDetailedMetrics: true,
      ...options.monitoring,
    });

    this.isInitialized = false;
    this.capabilities = {
      gpu: false,
      ml: false,
      supportedTaskTypes: ["javascript", "gpu", "ml", "scientific", "crypto"],
    };

    console.log("🚀 Enhanced Task Executor initializing...");
  }

  /**
   * Initialize all compute engines and capabilities
   */
  async initialize() {
    if (this.isInitialized) {
      console.log("⚠️ Task Executor already initialized");
      return this.capabilities;
    }

    console.log("🔍 Initializing compute engines...");

    try {
      // Start resource monitoring
      await this.resourceMonitor.startMonitoring();

      // Initialize GPU compute engine
      try {
        const gpuCapabilities = await this.gpuEngine.initialize();
        this.capabilities.gpu = gpuCapabilities.hasGPU;
        console.log(
          `✅ GPU Engine: ${
            gpuCapabilities.hasGPU ? "Available" : "CPU Fallback"
          }`
        );
      } catch (error) {
        console.warn(
          "⚠️ GPU initialization failed, using CPU fallback:",
          error.message
        );
        this.capabilities.gpu = false;
      }

      // Initialize ML model manager
      try {
        await this.mlManager.initialize();
        this.capabilities.ml = true;
        console.log("✅ ML Engine: Available");
      } catch (error) {
        console.warn("⚠️ ML initialization failed:", error.message);
        this.capabilities.ml = false;
      }

      this.isInitialized = true;
      console.log("✅ Enhanced Task Executor initialized successfully");
      console.log(
        `📊 Capabilities: GPU=${this.capabilities.gpu}, ML=${this.capabilities.ml}`
      );

      this.emit("initialized", this.capabilities);
      return this.capabilities;
    } catch (error) {
      console.error("❌ Task Executor initialization failed:", error.message);
      throw new Error(`Task Executor initialization failed: ${error.message}`);
    }
  }

  /**
   * Execute task based on type and data
   */
  async executeTask(taskData, taskId = null) {
    console.log(`🔧 Executing enhanced task with data:`, taskData);

    const startTime = performance.now();
    const executionId = taskId || `task_${Date.now()}`;

    try {
      // Parse and validate task data
      const taskInfo = await this._parseTaskData(taskData);
      const { type, payload, options = {} } = taskInfo;

      console.log(`📝 Task Type: ${type}`);
      console.log(`📊 Payload Size: ${JSON.stringify(payload).length} bytes`);
      console.log(`⚙️ Options: ${JSON.stringify(options)}`);

      // Record task start
      this.resourceMonitor.recordTaskExecution(executionId, {
        startTime,
        taskType: type,
        payloadSize: JSON.stringify(payload).length,
      });

      let result;
      let executionMetadata = {
        type,
        gpuAccelerated: false,
        mlInference: false,
        resourceUsage: {},
      };

      // Route to appropriate execution engine
      switch (type.toLowerCase()) {
        case "javascript":
        case "js":
          result = await this._executeJavaScript(payload, options);
          break;

        case "gpu":
          result = await this._executeGPUTask(payload, options);
          executionMetadata.gpuAccelerated = this.capabilities.gpu;
          break;

        case "ml":
        case "ai":
          result = await this._executeMLTask(payload, options);
          executionMetadata.mlInference = true;
          break;

        case "scientific":
        case "math":
          result = await this._executeScientificTask(payload, options);
          break;

        case "crypto":
        case "hash":
          result = await this._executeCryptoTask(payload, options);
          break;

        case "image":
          result = await this._executeImageTask(payload, options);
          executionMetadata.mlInference = true;
          break;

        case "text":
          result = await this._executeTextTask(payload, options);
          executionMetadata.mlInference = true;
          break;

        default:
          throw new Error(`Unsupported task type: ${type}`);
      }

      const executionTime = performance.now() - startTime;

      // Record successful completion
      this.resourceMonitor.recordTaskExecution(executionId, {
        startTime,
        executionTime,
        taskType: type,
        memoryUsage: process.memoryUsage().heapUsed,
        failed: false,
      });

      console.log(
        `✅ Task executed successfully in ${executionTime.toFixed(2)}ms`
      );
      console.log(`📈 Result: ${JSON.stringify(result).substring(0, 200)}...`);

      const finalResult = {
        result,
        executionTime,
        executionMetadata,
        resourceMetrics: this.resourceMonitor.getCurrentMetrics(),
        taskId: executionId,
      };

      this.emit("taskCompleted", finalResult);
      return finalResult;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      // Record failed execution
      this.resourceMonitor.recordTaskExecution(executionId, {
        startTime,
        executionTime,
        failed: true,
        error: error.message,
      });

      console.error(
        `❌ Task execution failed after ${executionTime.toFixed(2)}ms: ${
          error.message
        }`
      );
      this.emit("taskFailed", {
        error: error.message,
        executionTime,
        taskId: executionId,
      });
      throw error;
    }
  }

  /**
   * Execute GPU-accelerated computational tasks
   */
  async _executeGPUTask(payload, options) {
    if (!this.capabilities.gpu) {
      console.log("⚠️ GPU not available, falling back to CPU implementation");
    }

    const { operation, data, parameters = {} } = payload;

    switch (operation.toLowerCase()) {
      case "matrix_multiply":
      case "matmul":
        const { matrixA, matrixB } = data;
        return await this.gpuEngine.matrixMultiply(
          matrixA,
          matrixB,
          parameters
        );

      case "vector_similarity":
        const {
          queryVector,
          vectorDatabase,
          topK = 10,
          threshold = 0.0,
        } = data;
        return await this.gpuEngine.vectorSimilarity(
          queryVector,
          vectorDatabase,
          { topK, threshold }
        );

      case "parallel_map":
        const { array, mapFunction } = data;
        return await this.gpuEngine.parallelMap(array, mapFunction, parameters);

      case "mandelbrot":
        const { width = 800, height = 600, maxIterations = 100 } = data;
        return await this.gpuEngine.generateMandelbrot(width, height, {
          maxIterations,
          ...parameters,
        });

      case "monte_carlo_pi":
        const { samples = 1000000 } = data;
        return await this.gpuEngine.monteCarloPI(samples, parameters);

      case "image_convolution":
        const { imageData, kernel, imageWidth, imageHeight } = data;
        return await this.gpuEngine.imageConvolution(imageData, kernel, {
          width: imageWidth,
          height: imageHeight,
          ...parameters,
        });

      default:
        throw new Error(`Unsupported GPU operation: ${operation}`);
    }
  }

  /**
   * Execute machine learning inference tasks
   */
  async _executeMLTask(payload, options) {
    if (!this.capabilities.ml) {
      throw new Error("ML capabilities not available");
    }

    const { operation, data, modelId, parameters = {} } = payload;

    switch (operation.toLowerCase()) {
      case "image_classification":
      case "classify_image":
        const { imageData, topK = 5, threshold = 0.1 } = data;
        return await this.mlManager.classifyImage(
          imageData,
          modelId || "mobilenet",
          { topK, threshold, ...parameters }
        );

      case "sentiment_analysis":
      case "analyze_sentiment":
        const { text } = data;
        return await this.mlManager.analyzeSentiment(
          text,
          modelId || "sentiment",
          parameters
        );

      case "toxicity_detection":
      case "detect_toxicity":
        const { text: toxicityText, threshold: toxicityThreshold = 0.7 } = data;
        return await this.mlManager.detectToxicity(toxicityText, {
          threshold: toxicityThreshold,
          ...parameters,
        });

      case "object_detection":
      case "detect_objects":
        const {
          imageData: objImageData,
          maxDetections = 20,
          scoreThreshold = 0.5,
        } = data;
        return await this.mlManager.detectObjects(
          objImageData,
          modelId || "coco-ssd",
          { maxDetections, scoreThreshold, ...parameters }
        );

      case "custom_inference":
        const { inputData, modelId: customModelId } = data;
        return await this.mlManager.runCustomInference(
          customModelId,
          inputData,
          parameters
        );

      default:
        throw new Error(`Unsupported ML operation: ${operation}`);
    }
  }

  /**
   * Execute scientific computing tasks
   */
  async _executeScientificTask(payload, options) {
    const { operation, data, parameters = {} } = payload;

    switch (operation.toLowerCase()) {
      case "fft":
      case "fourier_transform":
        const { signal } = data;
        return this._computeFFT(signal);

      case "linear_regression":
        const { xValues, yValues } = data;
        return this._computeLinearRegression(xValues, yValues);

      case "polynomial_fit":
        const { x, y, degree = 2 } = data;
        return this._computePolynomialFit(x, y, degree);

      case "statistics":
        const { dataset } = data;
        return this._computeStatistics(dataset);

      case "numerical_integration":
        const { functionStr, lowerBound, upperBound, intervals = 1000 } = data;
        return this._computeNumericalIntegration(
          functionStr,
          lowerBound,
          upperBound,
          intervals
        );

      case "differential_equation":
        const {
          equation,
          initialConditions,
          stepSize = 0.01,
          steps = 1000,
        } = data;
        return this._solveDifferentialEquation(
          equation,
          initialConditions,
          stepSize,
          steps
        );

      case "optimization":
        const { objectiveFunction, constraints = [], initialGuess } = data;
        return this._solveOptimization(
          objectiveFunction,
          constraints,
          initialGuess
        );

      default:
        throw new Error(`Unsupported scientific operation: ${operation}`);
    }
  }

  /**
   * Execute cryptographic tasks
   */
  async _executeCryptoTask(payload, options) {
    const { operation, data, parameters = {} } = payload;
    const crypto = await import("crypto");

    switch (operation.toLowerCase()) {
      case "hash":
        const { input, algorithm = "sha256" } = data;
        const hash = crypto.createHash(algorithm).update(input).digest("hex");
        return { hash, algorithm, input: input.substring(0, 50) + "..." };

      case "hmac":
        const { message, key, algorithm: hmacAlgorithm = "sha256" } = data;
        const hmac = crypto
          .createHmac(hmacAlgorithm, key)
          .update(message)
          .digest("hex");
        return { hmac, algorithm: hmacAlgorithm };

      case "random_bytes":
        const { size = 32 } = data;
        const randomBytes = crypto.randomBytes(size).toString("hex");
        return { randomBytes, size };

      case "merkle_tree":
        const { leaves } = data;
        return this._computeMerkleTree(leaves);

      case "proof_of_work":
        const { blockData, difficulty = 4 } = data;
        return this._computeProofOfWork(blockData, difficulty);

      default:
        throw new Error(`Unsupported crypto operation: ${operation}`);
    }
  }

  /**
   * Execute image processing tasks
   */
  async _executeImageTask(payload, options) {
    const { operation, data, parameters = {} } = payload;

    switch (operation.toLowerCase()) {
      case "classify":
        return await this._executeMLTask(
          {
            operation: "image_classification",
            data,
            modelId: parameters.modelId || "mobilenet",
          },
          options
        );

      case "detect_objects":
        return await this._executeMLTask(
          {
            operation: "object_detection",
            data,
            modelId: parameters.modelId || "coco-ssd",
          },
          options
        );

      case "edge_detection":
        const edgeKernel = [
          [-1, -1, -1],
          [-1, 8, -1],
          [-1, -1, -1],
        ];
        return await this._executeGPUTask(
          {
            operation: "image_convolution",
            data: { ...data, kernel: edgeKernel },
          },
          options
        );

      case "blur":
        const blurKernel = [
          [1 / 9, 1 / 9, 1 / 9],
          [1 / 9, 1 / 9, 1 / 9],
          [1 / 9, 1 / 9, 1 / 9],
        ];
        return await this._executeGPUTask(
          {
            operation: "image_convolution",
            data: { ...data, kernel: blurKernel },
          },
          options
        );

      default:
        throw new Error(`Unsupported image operation: ${operation}`);
    }
  }

  /**
   * Execute text processing tasks
   */
  async _executeTextTask(payload, options) {
    const { operation, data, parameters = {} } = payload;

    switch (operation.toLowerCase()) {
      case "sentiment":
        return await this._executeMLTask(
          {
            operation: "sentiment_analysis",
            data,
            modelId: parameters.modelId || "sentiment",
          },
          options
        );

      case "toxicity":
        return await this._executeMLTask(
          {
            operation: "toxicity_detection",
            data,
            parameters,
          },
          options
        );

      case "word_frequency":
        const { text } = data;
        return this._computeWordFrequency(text);

      case "text_similarity":
        const { text1, text2 } = data;
        return this._computeTextSimilarity(text1, text2);

      default:
        throw new Error(`Unsupported text operation: ${operation}`);
    }
  }

  /**
   * Execute traditional JavaScript functions (backward compatibility)
   */
  async _executeJavaScript(payload, options) {
    console.log("💻 Executing JavaScript task (legacy mode)");

    let func, input;

    // Handle both legacy and new formats
    if (typeof payload === "string") {
      // Legacy format: raw task data string
      const taskData = JSON.parse(payload);
      func = taskData.func;
      input = taskData.input;
    } else {
      // New format: structured payload
      func = payload.func || payload.function;
      input = payload.input || payload.data;
    }

    return await this._executeWithTimeout(func, input, this.maxExecutionTime);
  }

  /**
   * Helper methods for scientific computing
   */

  _computeFFT(signal) {
    // Simple FFT implementation using mathjs
    const math = mathjs;
    const N = signal.length;
    const isPowerOf2 = (N & (N - 1)) === 0;

    if (!isPowerOf2) {
      throw new Error("Signal length must be a power of 2 for FFT");
    }

    // Convert to complex numbers for FFT
    const complexSignal = signal.map((val) => math.complex(val, 0));

    // Simple DFT (would use Cooley-Tukey FFT in practice)
    const result = [];
    for (let k = 0; k < N; k++) {
      let sum = math.complex(0, 0);
      for (let n = 0; n < N; n++) {
        const angle = (-2 * Math.PI * k * n) / N;
        const twiddle = math.complex(Math.cos(angle), Math.sin(angle));
        sum = math.add(sum, math.multiply(complexSignal[n], twiddle));
      }
      result.push({
        real: sum.re,
        imaginary: sum.im,
        magnitude: math.abs(sum),
        phase: math.arg(sum),
      });
    }

    return {
      fft: result,
      frequencies: Array.from({ length: N }, (_, i) => i / N),
      sampleRate: N,
    };
  }

  _computeLinearRegression(x, y) {
    if (x.length !== y.length) {
      throw new Error("X and Y arrays must have the same length");
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const totalSumSquares = y.reduce(
      (sum, yi) => sum + Math.pow(yi - yMean, 2),
      0
    );
    const residualSumSquares = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - residualSumSquares / totalSumSquares;

    return {
      slope,
      intercept,
      rSquared,
      equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
      predictions: x.map((xi) => slope * xi + intercept),
    };
  }

  _computeStatistics(dataset) {
    const sorted = [...dataset].sort((a, b) => a - b);
    const n = dataset.length;
    const sum = dataset.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    const variance =
      dataset.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const median =
      n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];

    return {
      count: n,
      sum,
      mean,
      median,
      mode: this._calculateMode(dataset),
      variance,
      standardDeviation: stdDev,
      min: Math.min(...dataset),
      max: Math.max(...dataset),
      range: Math.max(...dataset) - Math.min(...dataset),
      quartiles: { q1, median, q3 },
      iqr: q3 - q1,
      skewness: this._calculateSkewness(dataset, mean, stdDev),
      kurtosis: this._calculateKurtosis(dataset, mean, stdDev),
    };
  }

  _calculateMode(dataset) {
    const frequency = {};
    let maxFreq = 0;
    let modes = [];

    dataset.forEach((value) => {
      frequency[value] = (frequency[value] || 0) + 1;
      if (frequency[value] > maxFreq) {
        maxFreq = frequency[value];
        modes = [value];
      } else if (frequency[value] === maxFreq && !modes.includes(value)) {
        modes.push(value);
      }
    });

    return modes.length === dataset.length ? null : modes;
  }

  _calculateSkewness(dataset, mean, stdDev) {
    const n = dataset.length;
    const skewness =
      dataset.reduce((sum, x) => {
        return sum + Math.pow((x - mean) / stdDev, 3);
      }, 0) / n;

    return skewness;
  }

  _calculateKurtosis(dataset, mean, stdDev) {
    const n = dataset.length;
    const kurtosis =
      dataset.reduce((sum, x) => {
        return sum + Math.pow((x - mean) / stdDev, 4);
      }, 0) / n;

    return kurtosis - 3; // Excess kurtosis
  }

  _computeWordFrequency(text) {
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 0);

    const frequency = {};
    words.forEach((word) => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    const sortedWords = Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50); // Top 50 words

    return {
      totalWords: words.length,
      uniqueWords: Object.keys(frequency).length,
      frequencies: Object.fromEntries(sortedWords),
      topWords: sortedWords.map(([word, count]) => ({
        word,
        count,
        percentage: ((count / words.length) * 100).toFixed(2),
      })),
    };
  }

  _computeTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
    const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = intersection.size / union.size;
    const cosineSimilarity =
      intersection.size / Math.sqrt(words1.size * words2.size);

    return {
      jaccardSimilarity,
      cosineSimilarity,
      commonWords: Array.from(intersection),
      uniqueWords1: words1.size - intersection.size,
      uniqueWords2: words2.size - intersection.size,
      totalCommon: intersection.size,
    };
  }

  _computeMerkleTree(leaves) {
    const crypto = require("crypto");

    if (leaves.length === 0) {
      throw new Error("Cannot create Merkle tree with empty leaves");
    }

    // Hash all leaves
    let currentLevel = leaves.map((leaf) =>
      crypto.createHash("sha256").update(leaf.toString()).digest("hex")
    );

    const tree = [currentLevel];

    while (currentLevel.length > 1) {
      const nextLevel = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
        const combined = crypto
          .createHash("sha256")
          .update(left + right)
          .digest("hex");
        nextLevel.push(combined);
      }

      currentLevel = nextLevel;
      tree.push(currentLevel);
    }

    return {
      root: currentLevel[0],
      tree,
      leaves: tree[0],
      depth: tree.length - 1,
    };
  }

  _computeProofOfWork(blockData, difficulty) {
    const crypto = require("crypto");
    const target = "0".repeat(difficulty);
    let nonce = 0;
    let hash = "";
    const startTime = Date.now();

    do {
      const data = JSON.stringify(blockData) + nonce;
      hash = crypto.createHash("sha256").update(data).digest("hex");
      nonce++;
    } while (!hash.startsWith(target) && nonce < 1000000); // Limit iterations

    const endTime = Date.now();

    if (!hash.startsWith(target)) {
      throw new Error(
        `Could not find proof of work with difficulty ${difficulty} in reasonable time`
      );
    }

    return {
      hash,
      nonce: nonce - 1,
      difficulty,
      target,
      iterations: nonce - 1,
      timeMs: endTime - startTime,
      blockData,
    };
  }

  /**
   * Parse task data to determine type and structure
   */
  async _parseTaskData(taskData) {
    try {
      let parsed;

      if (typeof taskData === "string") {
        parsed = JSON.parse(taskData);
      } else {
        parsed = taskData;
      }

      // Handle legacy format
      if (parsed.func && parsed.input !== undefined) {
        return {
          type: "javascript",
          payload: parsed,
          options: {},
        };
      }

      // Handle new structured format
      if (parsed.type && parsed.payload) {
        return {
          type: parsed.type,
          payload: parsed.payload,
          options: parsed.options || {},
        };
      }

      // Auto-detect task type based on content
      if (parsed.operation) {
        const operation = parsed.operation.toLowerCase();

        if (
          [
            "matrix_multiply",
            "vector_similarity",
            "mandelbrot",
            "monte_carlo_pi",
          ].includes(operation)
        ) {
          return { type: "gpu", payload: parsed, options: {} };
        }

        if (
          [
            "image_classification",
            "sentiment_analysis",
            "toxicity_detection",
          ].includes(operation)
        ) {
          return { type: "ml", payload: parsed, options: {} };
        }

        if (["fft", "linear_regression", "statistics"].includes(operation)) {
          return { type: "scientific", payload: parsed, options: {} };
        }

        if (
          ["hash", "hmac", "merkle_tree", "proof_of_work"].includes(operation)
        ) {
          return { type: "crypto", payload: parsed, options: {} };
        }
      }

      // Default to JavaScript execution
      return {
        type: "javascript",
        payload: parsed,
        options: {},
      };
    } catch (error) {
      throw new Error(`Failed to parse task data: ${error.message}`);
    }
  }

  /**
   * Legacy execution method for backward compatibility
   */
  async _executeWithTimeout(funcCode, inputData, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = this._executeSafely(funcCode, inputData);
        clearTimeout(timer);
        Promise.resolve(result).then(resolve).catch(reject);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * Safe execution with enhanced sandbox
   */
  _executeSafely(funcCode, inputData) {
    try {
      const sandbox = this._createEnhancedSandbox();
      const func = new Function("return " + funcCode).call(sandbox);

      if (typeof func !== "function") {
        throw new Error("Provided code does not evaluate to a function");
      }

      const result = func(inputData);
      JSON.stringify(result); // Ensure serializability

      return result;
    } catch (error) {
      throw new Error(`Safe execution failed: ${error.message}`);
    }
  }

  /**
   * Create enhanced sandbox with more mathematical capabilities
   */
  _createEnhancedSandbox() {
    return {
      // Standard JavaScript objects
      Math: Math,
      Array: Array,
      Object: Object,
      Date: {
        now: Date.now,
        parse: Date.parse,
      },
      JSON: JSON,
      String: String,
      Number: Number,
      Boolean: Boolean,

      // Enhanced mathematical functions
      mathjs: mathjs,

      // Utility functions
      utils: {
        mean: (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
        median: (arr) => {
          const sorted = [...arr].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
        },
        standardDeviation: (arr) => {
          const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
          const variance =
            arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length;
          return Math.sqrt(variance);
        },
        factorial: (n) => (n <= 1 ? 1 : n * this.factorial(n - 1)),
        fibonacci: (n) =>
          n <= 1 ? n : this.fibonacci(n - 1) + this.fibonacci(n - 2),
        isPrime: (n) => {
          if (n <= 1) return false;
          for (let i = 2; i <= Math.sqrt(n); i++) {
            if (n % i === 0) return false;
          }
          return true;
        },
      },

      // Safe console for debugging
      console: {
        log: (...args) => console.log("[SANDBOX]", ...args),
      },
    };
  }

  /**
   * Validate task data structure and content
   */
  validateTaskData(taskData) {
    try {
      const taskInfo = JSON.parse(
        typeof taskData === "string" ? taskData : JSON.stringify(taskData)
      );

      if (!taskInfo) {
        throw new Error("Task data is empty or invalid");
      }

      // Validate based on task type
      if (taskInfo.type) {
        const validTypes = this.capabilities.supportedTaskTypes;
        if (!validTypes.includes(taskInfo.type.toLowerCase())) {
          throw new Error(`Unsupported task type: ${taskInfo.type}`);
        }
      }

      // Size validation
      const dataSize = JSON.stringify(taskInfo).length;
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (dataSize > maxSize) {
        throw new Error(
          `Task data too large: ${dataSize} bytes (max ${maxSize})`
        );
      }

      return true;
    } catch (error) {
      throw new Error(`Task validation failed: ${error.message}`);
    }
  }

  /**
   * Get current executor capabilities and status
   */
  getCapabilities() {
    return {
      ...this.capabilities,
      isInitialized: this.isInitialized,
      resourceMetrics: this.resourceMonitor.getCurrentMetrics(),
      gpuCapabilities: this.gpuEngine.getCapabilities(),
      mlCacheStats: this.mlManager.getCacheStats(),
      performance: this.resourceMonitor.getPerformanceSummary(),
    };
  }

  /**
   * Get performance and resource statistics
   */
  getStatistics() {
    return {
      performance: this.resourceMonitor.getPerformanceSummary(),
      resources: this.resourceMonitor.getCurrentMetrics(),
      warnings: this.resourceMonitor.getWarnings(),
      capabilities: this.getCapabilities(),
    };
  }

  /**
   * Cleanup all resources and engines
   */
  async cleanup() {
    try {
      console.log("🧹 Cleaning up Enhanced Task Executor...");

      if (this.gpuEngine) {
        await this.gpuEngine.cleanup();
      }

      if (this.mlManager) {
        await this.mlManager.cleanup();
      }

      if (this.resourceMonitor) {
        await this.resourceMonitor.cleanup();
      }

      this.isInitialized = false;
      console.log("✅ Enhanced Task Executor cleaned up successfully");
    } catch (error) {
      console.error("❌ Error during cleanup:", error.message);
    }
  }
}
