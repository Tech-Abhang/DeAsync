/**
 * Advanced Task Templates for DeAsync Platform
 * Provides pre-built templates for GPU/ML/Scientific computing tasks
 * Includes cost estimation, validation, and optimization recommendations
 */

/**
 * GPU Computing Templates
 */
export const GPUTemplates = {
  /**
   * Matrix multiplication for linear algebra operations
   */
  matrixMultiplication: (matrixA, matrixB, options = {}) => ({
    type: "gpu",
    payload: {
      operation: "matrix_multiply",
      data: { matrixA, matrixB },
      parameters: {
        precision: options.precision || "single",
        optimize: options.optimize || true,
      },
    },
    options: {
      reward: options.reward || "0.002", // Higher reward for GPU tasks
      timeout: options.timeout || 60000,
      priority: options.priority || "high",
    },
    metadata: {
      description: "GPU-accelerated matrix multiplication",
      complexity: "O(n³)",
      memoryEstimate:
        matrixA.length * matrixA[0].length * matrixB[0].length * 4, // bytes
      recommendedGPU: true,
    },
  }),

  /**
   * Vector similarity search for AI/ML applications
   */
  vectorSimilaritySearch: (queryVector, vectorDatabase, options = {}) => ({
    type: "gpu",
    payload: {
      operation: "vector_similarity",
      data: {
        queryVector,
        vectorDatabase,
        topK: options.topK || 10,
        threshold: options.threshold || 0.0,
      },
    },
    options: {
      reward: options.reward || "0.003",
      timeout: options.timeout || 45000,
    },
    metadata: {
      description: "High-performance vector similarity search",
      useCase: "Semantic search, recommendation systems, RAG applications",
      complexity: "O(n*d)",
      memoryEstimate:
        (queryVector.length +
          vectorDatabase.length * vectorDatabase[0].length) *
        4,
    },
  }),

  /**
   * Mandelbrot fractal generation for computational graphics
   */
  mandelbrotFractal: (width, height, options = {}) => ({
    type: "gpu",
    payload: {
      operation: "mandelbrot",
      data: {
        width,
        height,
        maxIterations: options.maxIterations || 100,
        xMin: options.xMin || -2.5,
        xMax: options.xMax || 1.5,
        yMin: options.yMin || -2.0,
        yMax: options.yMax || 2.0,
      },
    },
    options: {
      reward: options.reward || "0.004",
      timeout: options.timeout || 90000,
    },
    metadata: {
      description: "GPU-accelerated Mandelbrot fractal generation",
      useCase: "Computer graphics, mathematical visualization",
      complexity: "O(width * height * iterations)",
      outputFormat: "2D array of iteration counts",
    },
  }),

  /**
   * Monte Carlo simulation for statistical analysis
   */
  monteCarloPI: (samples, options = {}) => ({
    type: "gpu",
    payload: {
      operation: "monte_carlo_pi",
      data: { samples },
    },
    options: {
      reward: options.reward || "0.001",
      timeout: options.timeout || 30000,
    },
    metadata: {
      description: "Monte Carlo π estimation using parallel random sampling",
      useCase: "Statistical simulation, numerical analysis",
      accuracy:
        samples > 1000000 ? "high" : samples > 100000 ? "medium" : "low",
    },
  }),

  /**
   * Parallel map operation for data processing
   */
  parallelMap: (array, mapFunction, options = {}) => ({
    type: "gpu",
    payload: {
      operation: "parallel_map",
      data: { array, mapFunction },
    },
    options: {
      reward: options.reward || "0.002",
      timeout: options.timeout || 45000,
    },
    metadata: {
      description: "GPU-accelerated parallel array processing",
      useCase: "Data transformation, batch processing",
      complexity: "O(n)",
      speedup: `~${Math.min(array.length / 1000, 10)}x vs CPU`,
    },
  }),

  /**
   * Image convolution for computer vision
   */
  imageConvolution: (imageData, kernel, width, height, options = {}) => ({
    type: "gpu",
    payload: {
      operation: "image_convolution",
      data: { imageData, kernel, imageWidth: width, imageHeight: height },
    },
    options: {
      reward: options.reward || "0.003",
      timeout: options.timeout || 60000,
    },
    metadata: {
      description: "GPU-accelerated image convolution filtering",
      useCase: "Edge detection, image filtering, computer vision",
      kernelType: options.kernelType || "custom",
      outputSize: width * height * 4, // RGBA
    },
  }),
};

/**
 * Machine Learning Templates
 */
export const MLTemplates = {
  /**
   * Image classification using pre-trained models
   */
  imageClassification: (imageData, options = {}) => ({
    type: "ml",
    payload: {
      operation: "image_classification",
      data: {
        imageData,
        topK: options.topK || 5,
        threshold: options.threshold || 0.1,
      },
      modelId: options.modelId || "mobilenet",
    },
    options: {
      reward: options.reward || "0.005", // Higher reward for ML inference
      timeout: options.timeout || 120000,
    },
    metadata: {
      description: "Deep learning image classification",
      model: options.modelId || "mobilenet",
      useCase: "Content moderation, automated tagging, object recognition",
      accuracy: "High (>90% on ImageNet)",
      supportedFormats: ["JPEG", "PNG", "WebP"],
    },
  }),

  /**
   * Text sentiment analysis
   */
  sentimentAnalysis: (text, options = {}) => ({
    type: "ml",
    payload: {
      operation: "sentiment_analysis",
      data: { text },
      modelId: options.modelId || "sentiment",
    },
    options: {
      reward: options.reward || "0.003",
      timeout: options.timeout || 60000,
    },
    metadata: {
      description: "AI-powered sentiment analysis",
      useCase: "Social media monitoring, review analysis, customer feedback",
      outputFormat: "Sentiment score (-1 to 1) with confidence",
      languages: ["English"], // Expandable
    },
  }),

  /**
   * Content toxicity detection
   */
  toxicityDetection: (text, options = {}) => ({
    type: "ml",
    payload: {
      operation: "toxicity_detection",
      data: {
        text,
        threshold: options.threshold || 0.7,
      },
    },
    options: {
      reward: options.reward || "0.004",
      timeout: options.timeout || 45000,
    },
    metadata: {
      description: "Advanced toxicity and harmful content detection",
      useCase: "Content moderation, safe communication platforms",
      categories: [
        "identity_attack",
        "insult",
        "obscene",
        "severe_toxicity",
        "sexual_explicit",
        "threat",
      ],
      accuracy: "High precision for content safety",
    },
  }),

  /**
   * Object detection in images
   */
  objectDetection: (imageData, options = {}) => ({
    type: "ml",
    payload: {
      operation: "object_detection",
      data: {
        imageData,
        maxDetections: options.maxDetections || 20,
        scoreThreshold: options.scoreThreshold || 0.5,
      },
      modelId: options.modelId || "coco-ssd",
    },
    options: {
      reward: options.reward || "0.006",
      timeout: options.timeout || 180000,
    },
    metadata: {
      description: "Real-time object detection and localization",
      model: "COCO-SSD (80 object classes)",
      useCase: "Autonomous systems, security, inventory management",
      outputFormat: "Bounding boxes with class labels and confidence scores",
    },
  }),

  /**
   * Custom model inference
   */
  customInference: (modelId, inputData, options = {}) => ({
    type: "ml",
    payload: {
      operation: "custom_inference",
      data: { inputData, modelId },
    },
    options: {
      reward: options.reward || "0.007",
      timeout: options.timeout || 300000,
    },
    metadata: {
      description: "Custom TensorFlow.js model inference",
      useCase: "Specialized ML applications, custom trained models",
      requirements: "Model must be TensorFlow.js compatible",
    },
  }),
};

/**
 * Scientific Computing Templates
 */
export const ScientificTemplates = {
  /**
   * Fast Fourier Transform for signal processing
   */
  fourierTransform: (signal, options = {}) => ({
    type: "scientific",
    payload: {
      operation: "fft",
      data: { signal },
    },
    options: {
      reward: options.reward || "0.003",
      timeout: options.timeout || 60000,
    },
    metadata: {
      description: "Fast Fourier Transform for frequency domain analysis",
      useCase: "Signal processing, audio analysis, data compression",
      complexity: "O(n log n)",
      requirements: "Signal length must be power of 2",
    },
  }),

  /**
   * Linear regression analysis
   */
  linearRegression: (xValues, yValues, options = {}) => ({
    type: "scientific",
    payload: {
      operation: "linear_regression",
      data: { xValues, yValues },
    },
    options: {
      reward: options.reward || "0.002",
      timeout: options.timeout || 30000,
    },
    metadata: {
      description: "Statistical linear regression with R² calculation",
      useCase: "Data analysis, trend prediction, statistical modeling",
      outputs: ["slope", "intercept", "r_squared", "predictions"],
    },
  }),

  /**
   * Comprehensive statistical analysis
   */
  statisticalAnalysis: (dataset, options = {}) => ({
    type: "scientific",
    payload: {
      operation: "statistics",
      data: { dataset },
    },
    options: {
      reward: options.reward || "0.002",
      timeout: options.timeout || 45000,
    },
    metadata: {
      description: "Complete statistical analysis of numerical data",
      useCase: "Data science, research, quality control",
      outputs: [
        "mean",
        "median",
        "mode",
        "std_dev",
        "quartiles",
        "skewness",
        "kurtosis",
      ],
    },
  }),

  /**
   * Numerical integration
   */
  numericalIntegration: (
    functionStr,
    lowerBound,
    upperBound,
    options = {}
  ) => ({
    type: "scientific",
    payload: {
      operation: "numerical_integration",
      data: {
        functionStr,
        lowerBound,
        upperBound,
        intervals: options.intervals || 1000,
      },
    },
    options: {
      reward: options.reward || "0.003",
      timeout: options.timeout || 60000,
    },
    metadata: {
      description: "Numerical integration using adaptive methods",
      useCase: "Calculus, engineering simulations, physics calculations",
      method: "Adaptive Simpson's rule",
      accuracy: options.intervals > 10000 ? "high" : "standard",
    },
  }),

  /**
   * Polynomial curve fitting
   */
  polynomialFit: (xData, yData, degree, options = {}) => ({
    type: "scientific",
    payload: {
      operation: "polynomial_fit",
      data: { x: xData, y: yData, degree },
    },
    options: {
      reward: options.reward || "0.003",
      timeout: options.timeout || 45000,
    },
    metadata: {
      description: `Polynomial curve fitting (degree ${degree})`,
      useCase: "Data interpolation, trend analysis, curve modeling",
      complexity: "O(n³) for matrix inversion",
      accuracy: degree < 10 ? "stable" : "may_overfit",
    },
  }),
};

/**
 * Cryptographic Templates
 */
export const CryptoTemplates = {
  /**
   * Secure hash computation
   */
  secureHash: (input, algorithm = "sha256", options = {}) => ({
    type: "crypto",
    payload: {
      operation: "hash",
      data: { input, algorithm },
    },
    options: {
      reward: options.reward || "0.001",
      timeout: options.timeout || 15000,
    },
    metadata: {
      description: "Cryptographic hash function",
      useCase: "Data integrity, password hashing, digital signatures",
      algorithms: ["sha256", "sha512", "md5", "sha1"],
      security: algorithm.includes("sha") ? "high" : "legacy",
    },
  }),

  /**
   * HMAC authentication
   */
  hmacAuthentication: (message, key, algorithm = "sha256", options = {}) => ({
    type: "crypto",
    payload: {
      operation: "hmac",
      data: { message, key, algorithm },
    },
    options: {
      reward: options.reward || "0.002",
      timeout: options.timeout || 20000,
    },
    metadata: {
      description: "Hash-based Message Authentication Code",
      useCase: "API authentication, message integrity, secure communications",
      security: "High",
    },
  }),

  /**
   * Merkle tree construction
   */
  merkleTree: (leaves, options = {}) => ({
    type: "crypto",
    payload: {
      operation: "merkle_tree",
      data: { leaves },
    },
    options: {
      reward: options.reward || "0.004",
      timeout: options.timeout || 60000,
    },
    metadata: {
      description: "Merkle tree construction for data verification",
      useCase: "Blockchain, data integrity, efficient verification",
      complexity: "O(n log n)",
      depth: Math.ceil(Math.log2(leaves.length)),
    },
  }),

  /**
   * Proof of Work mining simulation
   */
  proofOfWork: (blockData, difficulty, options = {}) => ({
    type: "crypto",
    payload: {
      operation: "proof_of_work",
      data: { blockData, difficulty },
    },
    options: {
      reward: options.reward || "0.010", // Higher reward for computational intensity
      timeout: options.timeout || 300000, // 5 minutes
    },
    metadata: {
      description: "Proof of Work computation for blockchain",
      useCase: "Cryptocurrency mining, consensus mechanisms",
      difficulty,
      estimatedTime: Math.pow(16, difficulty) / 1000000 + " seconds",
      warning: difficulty > 6 ? "Very high computational cost" : null,
    },
  }),
};

/**
 * Image Processing Templates
 */
export const ImageTemplates = {
  /**
   * Edge detection using convolution
   */
  edgeDetection: (imageData, width, height, options = {}) => ({
    type: "image",
    payload: {
      operation: "edge_detection",
      data: { imageData, imageWidth: width, imageHeight: height },
    },
    options: {
      reward: options.reward || "0.003",
      timeout: options.timeout || 60000,
    },
    metadata: {
      description: "Edge detection using Sobel/Laplacian operators",
      useCase: "Computer vision, feature extraction, image analysis",
    },
  }),

  /**
   * Image blur/smoothing
   */
  imageBlur: (imageData, width, height, options = {}) => ({
    type: "image",
    payload: {
      operation: "blur",
      data: { imageData, imageWidth: width, imageHeight: height },
    },
    options: {
      reward: options.reward || "0.002",
      timeout: options.timeout || 45000,
    },
    metadata: {
      description: "Gaussian blur for image smoothing",
      useCase: "Image preprocessing, noise reduction",
    },
  }),
};

/**
 * Text Processing Templates
 */
export const TextTemplates = {
  /**
   * Word frequency analysis
   */
  wordFrequency: (text, options = {}) => ({
    type: "text",
    payload: {
      operation: "word_frequency",
      data: { text },
    },
    options: {
      reward: options.reward || "0.001",
      timeout: options.timeout || 30000,
    },
    metadata: {
      description: "Word frequency analysis and statistics",
      useCase: "Text mining, content analysis, SEO optimization",
    },
  }),

  /**
   * Text similarity comparison
   */
  textSimilarity: (text1, text2, options = {}) => ({
    type: "text",
    payload: {
      operation: "text_similarity",
      data: { text1, text2 },
    },
    options: {
      reward: options.reward || "0.002",
      timeout: options.timeout || 30000,
    },
    metadata: {
      description: "Jaccard and cosine similarity for text comparison",
      useCase: "Duplicate detection, content similarity, plagiarism detection",
    },
  }),
};

/**
 * Batch Processing Templates
 */
export const BatchTemplates = {
  /**
   * Process multiple images in parallel
   */
  batchImageClassification: (images, options = {}) => ({
    type: "batch",
    payload: {
      operation: "batch_image_classification",
      data: {
        images: images.map((img) => ({ imageData: img.data, id: img.id })),
        batchSize: options.batchSize || 10,
      },
      modelId: options.modelId || "mobilenet",
    },
    options: {
      reward: options.reward || (0.005 * images.length).toString(),
      timeout: options.timeout || 30000 * Math.ceil(images.length / 10),
    },
    metadata: {
      description: "Batch image classification for high throughput",
      useCase: "Content processing, automated cataloging",
      batchSize: images.length,
    },
  }),

  /**
   * Process multiple text documents
   */
  batchTextAnalysis: (texts, operations, options = {}) => ({
    type: "batch",
    payload: {
      operation: "batch_text_analysis",
      data: {
        texts: texts.map((text, idx) => ({ text, id: idx })),
        operations, // ['sentiment', 'toxicity', 'frequency']
      },
    },
    options: {
      reward:
        options.reward || (0.003 * texts.length * operations.length).toString(),
      timeout: options.timeout || 20000 * texts.length,
    },
    metadata: {
      description: "Batch text processing with multiple analysis types",
      operations,
      textCount: texts.length,
    },
  }),
};

/**
 * Cost Estimation Utilities
 */
export const CostEstimator = {
  /**
   * Estimate task cost based on complexity and resource requirements
   */
  estimateTaskCost: (taskTemplate) => {
    const { type, payload, metadata } = taskTemplate;

    let baseCost = 0.001; // Base cost in ETH
    let complexityMultiplier = 1;

    // Type-based cost estimation
    switch (type) {
      case "javascript":
        baseCost = 0.001;
        complexityMultiplier = 1;
        break;
      case "gpu":
        baseCost = 0.003;
        complexityMultiplier = 2;
        break;
      case "ml":
        baseCost = 0.005;
        complexityMultiplier = 3;
        break;
      case "scientific":
        baseCost = 0.002;
        complexityMultiplier = 1.5;
        break;
      case "crypto":
        baseCost = 0.002;
        if (payload.operation === "proof_of_work") {
          complexityMultiplier = Math.pow(2, payload.data?.difficulty || 1);
        }
        break;
    }

    // Memory usage factor
    if (metadata?.memoryEstimate) {
      const memoryGB = metadata.memoryEstimate / (1024 * 1024 * 1024);
      complexityMultiplier *= 1 + memoryGB * 0.5;
    }

    // Data size factor
    const dataSize = JSON.stringify(payload).length;
    if (dataSize > 100000) {
      // 100KB
      complexityMultiplier *= 1 + dataSize / 1000000; // +1x per MB
    }

    const estimatedCost = baseCost * complexityMultiplier;

    return {
      baseCost,
      complexityMultiplier,
      estimatedCost: Math.max(0.001, estimatedCost), // Minimum cost
      factors: {
        type,
        memoryUsage: metadata?.memoryEstimate || 0,
        dataSize,
        specialty: type !== "javascript",
      },
      recommendation:
        estimatedCost > 0.01
          ? "high_cost"
          : estimatedCost > 0.005
          ? "moderate_cost"
          : "low_cost",
    };
  },

  /**
   * Get recommended reward based on task complexity
   */
  getRecommendedReward: (taskTemplate, urgency = "normal") => {
    const costEstimate = CostEstimator.estimateTaskCost(taskTemplate);
    let recommendedReward = costEstimate.estimatedCost;

    // Urgency multiplier
    const urgencyMultipliers = {
      low: 0.8,
      normal: 1.0,
      high: 1.5,
      urgent: 2.0,
    };

    recommendedReward *= urgencyMultipliers[urgency] || 1.0;

    // Round to reasonable precision
    recommendedReward = Math.ceil(recommendedReward * 1000) / 1000;

    return {
      recommended: recommendedReward.toString(),
      minimum: (recommendedReward * 0.7).toString(),
      competitive: (recommendedReward * 1.3).toString(),
      urgency,
      reasoning: `Based on ${costEstimate.recommendation} complexity and ${urgency} priority`,
    };
  },
};

/**
 * Template Validator
 */
export const TemplateValidator = {
  /**
   * Validate task template structure and parameters
   */
  validateTemplate: (template) => {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!template.type) errors.push("Missing task type");
    if (!template.payload) errors.push("Missing payload");

    // Type-specific validation
    const supportedTypes = [
      "javascript",
      "gpu",
      "ml",
      "scientific",
      "crypto",
      "image",
      "text",
      "batch",
    ];
    if (template.type && !supportedTypes.includes(template.type)) {
      errors.push(`Unsupported task type: ${template.type}`);
    }

    // Payload size validation
    const payloadSize = JSON.stringify(template.payload || {}).length;
    if (payloadSize > 10 * 1024 * 1024) {
      // 10MB
      errors.push("Payload too large (max 10MB)");
    } else if (payloadSize > 1024 * 1024) {
      // 1MB
      warnings.push("Large payload may increase processing time");
    }

    // Reward validation
    if (template.options?.reward) {
      const reward = parseFloat(template.options.reward);
      if (reward < 0.001)
        warnings.push("Reward may be too low to attract workers");
      if (reward > 1.0)
        warnings.push("Very high reward - ensure this is intentional");
    }

    // Timeout validation
    if (template.options?.timeout) {
      const timeout = template.options.timeout;
      if (timeout < 10000)
        warnings.push("Short timeout may cause task failures");
      if (timeout > 600000) warnings.push("Very long timeout (>10 minutes)");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      payloadSize,
      estimatedCost: CostEstimator.estimateTaskCost(template),
    };
  },
};

/**
 * Export all templates and utilities
 */
export default {
  GPU: GPUTemplates,
  ML: MLTemplates,
  Scientific: ScientificTemplates,
  Crypto: CryptoTemplates,
  Image: ImageTemplates,
  Text: TextTemplates,
  Batch: BatchTemplates,
  CostEstimator,
  TemplateValidator,
};
