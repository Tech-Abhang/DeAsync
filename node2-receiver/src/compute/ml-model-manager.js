import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-node"; // Use Node.js backend for better performance
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import fetch from "node-fetch";

/**
 * Advanced ML Model Manager for DeAsync Platform
 * Handles TensorFlow.js model loading, caching, and inference operations
 * Supports image classification, text processing, and custom model inference
 */
export class MLModelManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.isInitialized = false;
    this.modelCache = new Map(); // Use simple Map instead of NodeCache

    this.config = {
      backend: options.backend || "cpu", // Force CPU backend for compatibility
      maxModelSize: options.maxModelSize || 100 * 1024 * 1024, // 100MB
      inferenceTimeout: options.inferenceTimeout || 60000, // 1 minute
      warmupModels: options.warmupModels || true,
      maxCachedModels: options.maxCachedModels || 5,
      ...options,
    };

    // Pre-configured model URLs and metadata
    this.modelConfigs = {
      mobilenet: {
        url: "https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1",
        type: "image_classification",
        inputShape: [224, 224, 3],
        preprocess: "imagenet",
        description: "MobileNet v3 for image classification",
      },
      toxicity: {
        url: "@tensorflow-models/toxicity",
        type: "text_classification",
        threshold: 0.9,
        description: "Text toxicity classification",
      },
      sentiment: {
        url: "https://tfhub.dev/tensorflow/tfjs-model/universal-sentence-encoder-lite/1/default/1",
        type: "text_embedding",
        description: "Universal Sentence Encoder for sentiment analysis",
      },
      "pose-detection": {
        url: "@tensorflow-models/posenet",
        type: "pose_estimation",
        inputShape: [513, 513, 3],
        description: "PoseNet for human pose estimation",
      },
    };

    console.log(
      `🤖 ML Model Manager initializing with backend: ${this.config.backend}`
    );
  }

  /**
   * Initialize TensorFlow.js and set up backend
   */
  async initialize() {
    try {
      console.log("🔍 Initializing TensorFlow.js backend...");

      // Set TensorFlow backend to CPU for compatibility
      await tf.setBackend("cpu");
      await tf.ready();

      console.log(`✅ TensorFlow.js ready with backend: ${tf.getBackend()}`);
      console.log(`📊 Memory info: ${JSON.stringify(tf.memory())}`);

      // Warmup if enabled
      if (this.config.warmupModels) {
        await this._warmupBackend();
      }

      this.isInitialized = true;
      this.emit("initialized");

      return {
        backend: tf.getBackend(),
        memory: tf.memory(),
        version: tf.version.tfjs,
      };
    } catch (error) {
      console.error("❌ TensorFlow.js initialization failed:", error.message);
      throw new Error(`ML initialization failed: ${error.message}`);
    }
  }

  /**
   * Load and cache a model
   */
  async loadModel(modelId, customUrl = null) {
    this._ensureInitialized();

    const startTime = performance.now();
    console.log(`📥 Loading model: ${modelId}`);

    // Check cache first
    const cachedModel = this.modelCache.get(modelId);
    if (cachedModel) {
      console.log(`⚡ Model loaded from cache: ${modelId}`);
      return cachedModel;
    }

    try {
      let model;
      const modelConfig = this.modelConfigs[modelId];
      const modelUrl = customUrl || modelConfig?.url;

      if (!modelUrl) {
        throw new Error(`Model configuration not found: ${modelId}`);
      }

      // Handle different model sources
      if (modelUrl.startsWith("@tensorflow-models/")) {
        // Load from TensorFlow Models package
        model = await this._loadTensorFlowModel(modelUrl, modelConfig);
      } else if (modelUrl.startsWith("http")) {
        // Load from URL
        model = await tf.loadLayersModel(modelUrl);
      } else {
        // Load from local path
        model = await tf.loadLayersModel(`file://${modelUrl}`);
      }

      const loadTime = performance.now() - startTime;
      console.log(
        `✅ Model loaded successfully in ${loadTime.toFixed(2)}ms: ${modelId}`
      );

      // Cache the model with metadata
      const modelData = {
        model,
        config: modelConfig,
        loadTime,
        loadedAt: Date.now(),
        memoryFootprint: this._estimateModelMemory(model),
      };

      this.modelCache.set(modelId, modelData);

      this.emit("modelLoaded", {
        modelId,
        loadTime,
        memoryFootprint: modelData.memoryFootprint,
      });

      return modelData;
    } catch (error) {
      console.error(`❌ Failed to load model ${modelId}:`, error.message);
      throw new Error(`Model loading failed: ${error.message}`);
    }
  }

  /**
   * Image classification using MobileNet or custom model
   */
  async classifyImage(imageData, modelId = "mobilenet", options = {}) {
    this._ensureInitialized();

    const startTime = performance.now();
    const { topK = 5, threshold = 0.1 } = options;

    console.log(`🖼️ Image classification with model: ${modelId}`);

    try {
      const modelData = await this.loadModel(modelId);
      const { model, config } = modelData;

      // Preprocess image
      const preprocessedImage = await this._preprocessImage(
        imageData,
        config.inputShape,
        config.preprocess
      );

      // Run inference
      const predictions = await model.predict(preprocessedImage).data();
      const inferenceTime = performance.now() - startTime;

      // Process predictions based on model type
      let results;
      if (config.type === "image_classification") {
        results = await this._processImageClassificationResults(
          predictions,
          topK,
          threshold
        );
      } else {
        results = Array.from(predictions);
      }

      // Cleanup tensors
      preprocessedImage.dispose();

      console.log(
        `✅ Image classification completed in ${inferenceTime.toFixed(2)}ms`
      );
      console.log(
        `📊 Top prediction: ${results[0]?.className || "Unknown"} (${(
          results[0]?.probability * 100
        )?.toFixed(1)}%)`
      );

      return {
        results,
        inferenceTime,
        modelId,
        inputShape: config.inputShape,
        confidence: results[0]?.probability || 0,
      };
    } catch (error) {
      console.error("❌ Image classification failed:", error.message);
      throw new Error(`Image classification failed: ${error.message}`);
    }
  }

  /**
   * Text sentiment analysis
   */
  async analyzeSentiment(text, modelId = "sentiment", options = {}) {
    this._ensureInitialized();

    const startTime = performance.now();
    console.log(
      `📝 Sentiment analysis for text: "${text.substring(0, 50)}..."`
    );

    try {
      const modelData = await this.loadModel(modelId);
      const { model, config } = modelData;

      // Tokenize and preprocess text
      const processedText = await this._preprocessText(text, config);

      // Run inference
      const embeddings = await model.embed([processedText]).data();

      // Simple sentiment calculation (this would be model-specific in practice)
      const sentimentScore = this._calculateSentimentScore(
        Array.from(embeddings)
      );

      const inferenceTime = performance.now() - startTime;

      console.log(
        `✅ Sentiment analysis completed in ${inferenceTime.toFixed(2)}ms`
      );
      console.log(
        `💭 Sentiment: ${
          sentimentScore > 0 ? "Positive" : "Negative"
        } (${sentimentScore.toFixed(3)})`
      );

      return {
        text,
        sentimentScore,
        sentiment: sentimentScore > 0 ? "positive" : "negative",
        confidence: Math.abs(sentimentScore),
        inferenceTime,
        modelId,
      };
    } catch (error) {
      console.error("❌ Sentiment analysis failed:", error.message);
      throw new Error(`Sentiment analysis failed: ${error.message}`);
    }
  }

  /**
   * Toxicity detection in text
   */
  async detectToxicity(text, options = {}) {
    this._ensureInitialized();

    const startTime = performance.now();
    const { threshold = 0.7 } = options;

    console.log(
      `🔍 Toxicity detection for text: "${text.substring(0, 50)}..."`
    );

    try {
      // Load toxicity model (would use @tensorflow-models/toxicity in practice)
      const modelData = await this.loadModel("toxicity");

      // Simple toxicity detection simulation (replace with actual model inference)
      const toxicityScore = await this._simulateToxicityDetection(
        text,
        threshold
      );

      const inferenceTime = performance.now() - startTime;

      console.log(
        `✅ Toxicity detection completed in ${inferenceTime.toFixed(2)}ms`
      );
      console.log(
        `🛡️ Toxicity score: ${toxicityScore.toFixed(
          3
        )} (threshold: ${threshold})`
      );

      return {
        text,
        isToxic: toxicityScore > threshold,
        toxicityScore,
        threshold,
        inferenceTime,
        categories: {
          identity_attack: toxicityScore * 0.8,
          insult: toxicityScore * 0.9,
          obscene: toxicityScore * 0.7,
          severe_toxicity: toxicityScore * 0.6,
          sexual_explicit: toxicityScore * 0.5,
          threat: toxicityScore * 0.4,
        },
      };
    } catch (error) {
      console.error("❌ Toxicity detection failed:", error.message);
      throw new Error(`Toxicity detection failed: ${error.message}`);
    }
  }

  /**
   * Object detection in images
   */
  async detectObjects(imageData, modelId = "coco-ssd", options = {}) {
    this._ensureInitialized();

    const startTime = performance.now();
    const { maxDetections = 20, scoreThreshold = 0.5 } = options;

    console.log(`🎯 Object detection with model: ${modelId}`);

    try {
      const modelData = await this.loadModel(modelId);
      const { model, config } = modelData;

      // Preprocess image
      const preprocessedImage = await this._preprocessImage(
        imageData,
        config.inputShape || [640, 640, 3]
      );

      // Run inference
      const predictions = await model.executeAsync(preprocessedImage);

      // Process detection results
      const detections = await this._processObjectDetections(
        predictions,
        maxDetections,
        scoreThreshold
      );

      const inferenceTime = performance.now() - startTime;

      console.log(
        `✅ Object detection completed in ${inferenceTime.toFixed(2)}ms`
      );
      console.log(`🔍 Found ${detections.length} objects`);

      // Cleanup
      preprocessedImage.dispose();
      if (Array.isArray(predictions)) {
        predictions.forEach((tensor) => tensor.dispose());
      } else {
        predictions.dispose();
      }

      return {
        detections,
        inferenceTime,
        modelId,
        totalObjects: detections.length,
      };
    } catch (error) {
      console.error("❌ Object detection failed:", error.message);
      throw new Error(`Object detection failed: ${error.message}`);
    }
  }

  /**
   * Custom model inference with raw tensor input/output
   */
  async runCustomInference(modelId, inputData, options = {}) {
    this._ensureInitialized();

    const startTime = performance.now();
    console.log(`⚙️ Custom inference with model: ${modelId}`);

    try {
      const modelData = await this.loadModel(modelId);
      const { model } = modelData;

      // Convert input data to tensor if needed
      let inputTensor;
      if (tf.isTensor(inputData)) {
        inputTensor = inputData;
      } else {
        inputTensor = tf.tensor(inputData);
      }

      // Run inference
      const output = model.predict(inputTensor);

      // Extract data from output tensor(s)
      let results;
      if (Array.isArray(output)) {
        results = await Promise.all(output.map((tensor) => tensor.data()));
      } else {
        results = await output.data();
      }

      const inferenceTime = performance.now() - startTime;

      // Cleanup
      inputTensor.dispose();
      if (Array.isArray(output)) {
        output.forEach((tensor) => tensor.dispose());
      } else {
        output.dispose();
      }

      console.log(
        `✅ Custom inference completed in ${inferenceTime.toFixed(2)}ms`
      );

      return {
        results: Array.from(results),
        inferenceTime,
        modelId,
        inputShape: inputTensor.shape,
        outputShape: Array.isArray(output)
          ? output.map((t) => t.shape)
          : output.shape,
      };
    } catch (error) {
      console.error("❌ Custom inference failed:", error.message);
      throw new Error(`Custom inference failed: ${error.message}`);
    }
  }

  /**
   * Get model cache statistics
   */
  getCacheStats() {
    const keys = Array.from(this.modelCache.keys());
    const models = keys.map((key) => {
      const model = this.modelCache.get(key);
      return {
        id: key,
        loadedAt: new Date(model.loadedAt).toISOString(),
        memoryFootprint: model.memoryFootprint,
        loadTime: model.loadTime,
      };
    });

    return {
      hits: 0, // Not implemented for simple Map
      misses: 0,
      keys: keys.length,
      models,
      totalMemory: models.reduce((sum, m) => sum + m.memoryFootprint, 0),
      tfMemory: tf.memory(),
    };
  }

  /**
   * Clear model cache and free memory
   */
  async clearCache() {
    console.log("🧹 Clearing ML model cache...");

    const keys = Array.from(this.modelCache.keys());
    for (const key of keys) {
      const modelData = this.modelCache.get(key);
      if (modelData?.model?.dispose) {
        modelData.model.dispose();
      }
    }

    this.modelCache.clear();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    console.log("✅ ML model cache cleared");
    console.log(`📊 TF Memory: ${JSON.stringify(tf.memory())}`);
  }

  /**
   * Private helper methods
   */

  async _warmupBackend() {
    console.log("🔥 Warming up TensorFlow.js backend...");

    try {
      // Create a small tensor and run a simple operation
      const warmupTensor = tf.randomNormal([10, 10]);
      const result = tf.matMul(warmupTensor, warmupTensor);
      await result.data();

      warmupTensor.dispose();
      result.dispose();

      console.log("✅ Backend warmup completed");
    } catch (error) {
      console.warn("⚠️ Backend warmup failed:", error.message);
    }
  }

  async _loadTensorFlowModel(packageName, config) {
    // In a real implementation, you would dynamically import the model package
    // For now, we'll simulate loading
    console.log(`📦 Loading TensorFlow model package: ${packageName}`);

    // This would be replaced with actual model loading:
    // const modelPackage = await import(packageName);
    // return await modelPackage.load(config);

    throw new Error(
      `TensorFlow model packages not yet implemented: ${packageName}`
    );
  }

  async _preprocessImage(imageData, inputShape, preprocessType = "standard") {
    // Convert image data to tensor and resize
    let imageTensor;

    if (Buffer.isBuffer(imageData)) {
      // Process image buffer with Sharp
      const processedBuffer = await sharp(imageData)
        .resize(inputShape[0], inputShape[1])
        .raw()
        .toBuffer();

      imageTensor = tf.tensor3d(Array.from(processedBuffer), [
        inputShape[0],
        inputShape[1],
        inputShape[2],
      ]);
    } else if (Array.isArray(imageData)) {
      imageTensor = tf.tensor3d(imageData, inputShape);
    } else {
      throw new Error("Unsupported image data format");
    }

    // Normalize based on preprocessing type
    let normalizedTensor;
    if (preprocessType === "imagenet") {
      // ImageNet normalization: (pixel - mean) / std
      normalizedTensor = imageTensor
        .div(255.0)
        .sub([0.485, 0.456, 0.406])
        .div([0.229, 0.224, 0.225]);
    } else {
      // Standard normalization: pixel / 255
      normalizedTensor = imageTensor.div(255.0);
    }

    // Add batch dimension
    const batchTensor = normalizedTensor.expandDims(0);

    // Cleanup intermediate tensors
    imageTensor.dispose();
    normalizedTensor.dispose();

    return batchTensor;
  }

  _preprocessText(text, config) {
    // Basic text preprocessing
    return text
      .toLowerCase()
      .replace(/[^\w\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  async _processImageClassificationResults(predictions, topK, threshold) {
    // In a real implementation, you would use ImageNet class labels
    const mockLabels = [
      "cat",
      "dog",
      "bird",
      "car",
      "person",
      "house",
      "tree",
      "flower",
      "computer",
      "phone",
      "book",
      "chair",
      "table",
      "bottle",
      "cup",
    ];

    const results = Array.from(predictions)
      .map((prob, index) => ({
        className: mockLabels[index % mockLabels.length] || `class_${index}`,
        probability: prob,
        classId: index,
      }))
      .filter((result) => result.probability > threshold)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, topK);

    return results;
  }

  _calculateSentimentScore(embeddings) {
    // Simple sentiment calculation based on embedding values
    const positiveWeight = embeddings.reduce((sum, val, idx) => {
      return sum + (idx % 2 === 0 ? val : -val);
    }, 0);

    return Math.tanh(positiveWeight / embeddings.length);
  }

  async _simulateToxicityDetection(text, threshold) {
    // Simple toxicity detection simulation
    const toxicWords = [
      "hate",
      "stupid",
      "kill",
      "die",
      "worst",
      "terrible",
      "awful",
    ];
    const wordCount = text.toLowerCase().split(" ").length;
    const toxicWordCount = toxicWords.filter((word) =>
      text.toLowerCase().includes(word)
    ).length;

    return Math.min(
      0.95,
      (toxicWordCount / wordCount) * 2 + Math.random() * 0.1
    );
  }

  async _processObjectDetections(predictions, maxDetections, scoreThreshold) {
    // Simulate object detection processing
    const mockObjects = [
      "person",
      "car",
      "dog",
      "cat",
      "bird",
      "bicycle",
      "tree",
    ];
    const detectionCount = Math.min(
      maxDetections,
      Math.floor(Math.random() * 10) + 1
    );

    const detections = [];
    for (let i = 0; i < detectionCount; i++) {
      const score = Math.random() * 0.5 + 0.5; // 0.5 to 1.0
      if (score > scoreThreshold) {
        detections.push({
          class: mockObjects[Math.floor(Math.random() * mockObjects.length)],
          score,
          bbox: [
            Math.random() * 100, // x
            Math.random() * 100, // y
            Math.random() * 200 + 50, // width
            Math.random() * 200 + 50, // height
          ],
        });
      }
    }

    return detections.sort((a, b) => b.score - a.score);
  }

  _estimateModelMemory(model) {
    // Estimate model memory footprint in MB
    if (model.countParams) {
      const params = model.countParams();
      return Math.ceil((params * 4) / 1024 / 1024); // 4 bytes per float32 parameter
    }
    return 50; // Default 50MB estimation
  }

  _ensureInitialized() {
    if (!this.isInitialized) {
      throw new Error(
        "ML Model Manager not initialized. Call initialize() first."
      );
    }
  }

  /**
   * Cleanup all resources
   */
  async cleanup() {
    try {
      await this.clearCache();

      // Dispose of any remaining tensors
      const numTensors = tf.memory().numTensors;
      if (numTensors > 0) {
        console.log(`⚠️ ${numTensors} tensors still in memory during cleanup`);
      }

      this.isInitialized = false;
      console.log("🧹 ML Model Manager cleaned up");
    } catch (error) {
      console.error("❌ ML cleanup error:", error.message);
    }
  }
}
