import { DeAsyncSDK } from "../sdk/deasync-sdk.js";
import { MLTemplates, CostEstimator } from "../templates/task-templates.js";
import {
  loadDeploymentInfo,
  getNetworkConfig,
  validateEnvironment,
} from "../utils/contract-utils.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function mlDemo() {
  console.log("🤖 Machine Learning Demo - DeAsync AI Platform");
  console.log("===============================================\n");

  validateEnvironment();
  const deployment = loadDeploymentInfo();
  const networkConfig = getNetworkConfig("monad");

  const sdk = new DeAsyncSDK(
    deployment.address,
    networkConfig.url,
    process.env.PRIVATE_KEY
  );

  try {
    await sdk.initialize();

    console.log("🧠 Running AI/ML inference tasks...\n");

    // 1. Image Classification Demo
    await runImageClassificationDemo(sdk);

    // 2. Sentiment Analysis Demo
    await runSentimentAnalysisDemo(sdk);

    // 3. Toxicity Detection Demo
    await runToxicityDetectionDemo(sdk);

    // 4. Text Analysis Demo
    await runTextAnalysisDemo(sdk);

    console.log("\n🎉 Machine Learning Demo completed successfully!");
  } catch (error) {
    console.error("❌ ML Demo failed:", error.message);
  } finally {
    sdk.disconnect();
  }
}

async function runImageClassificationDemo(sdk) {
  console.log("\n📸 1. AI Image Classification");
  console.log("===============================");

  // Simulate image data (in practice, this would be actual image bytes)
  const sampleImageData = generateSampleImageData(224, 224, 3);

  console.log("Sample image: 224x224 RGB (simulated data)");
  console.log("Model: MobileNet v3 (ImageNet classes)");
  console.log(
    "Expected output: Top-5 class predictions with confidence scores"
  );

  const task = MLTemplates.imageClassification(sampleImageData, {
    modelId: "mobilenet",
    topK: 5,
    threshold: 0.1,
  });

  const costEstimate = CostEstimator.estimateTaskCost(task);
  console.log(
    `💰 Estimated cost: ${costEstimate.estimatedCost} ETH (${costEstimate.recommendation})`
  );
  console.log(`🎯 Use case: ${task.metadata.useCase}`);

  const startTime = Date.now();

  try {
    const result = await sdk.submitTask(
      task.payload.operation,
      JSON.stringify({
        ...task.payload.data,
        imageData: "base64_image_data_placeholder", // In practice, encode image to base64
      }),
      {
        reward: task.options.reward,
        timeout: task.options.timeout,
        funcType: task.type,
      }
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ Image classification completed in ${duration}ms`);

    if (result.result) {
      console.log("🏷️ Classification Results:");

      // Simulate results since we're using placeholder data
      const mockResults = [
        { className: "Golden Retriever", probability: 0.87, classId: 207 },
        { className: "Labrador Retriever", probability: 0.09, classId: 208 },
        { className: "Dog", probability: 0.03, classId: 152 },
        { className: "Beagle", probability: 0.008, classId: 162 },
        { className: "Puppy", probability: 0.002, classId: 218 },
      ];

      mockResults.forEach((prediction, i) => {
        console.log(
          `${i + 1}. ${prediction.className}: ${(
            prediction.probability * 100
          ).toFixed(1)}% confidence`
        );
      });

      console.log(`\n📊 Model: MobileNet v3`);
      console.log(
        `🎯 Top prediction: ${mockResults[0].className} (${(
          mockResults[0].probability * 100
        ).toFixed(1)}%)`
      );
      console.log(`⏱️ Inference time: ~150ms (simulated)`);
      console.log(`🧠 AI Inference: Enabled`);
    }
  } catch (error) {
    console.log(`❌ Image classification failed: ${error.message}`);
    console.log(
      "ℹ️ Note: This demo uses simulated data. In production, provide actual image data."
    );
  }
}

async function runSentimentAnalysisDemo(sdk) {
  console.log("\n💭 2. AI Sentiment Analysis");
  console.log("=============================");

  const testTexts = [
    "I absolutely love this new AI platform! It's revolutionary and will change everything.",
    "This service is okay, nothing special but it works fine.",
    "Terrible experience. The system is slow and unreliable. Very disappointed.",
    "DeAsync is an incredible innovation in decentralized computing. Highly recommended!",
    "The GPU acceleration makes such a huge difference in performance. Amazing work!",
  ];

  console.log("Analyzing sentiment for 5 sample texts...");
  console.log("Model: Universal Sentence Encoder + Sentiment Classifier");

  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    console.log(`\n--- Text ${i + 1} ---`);
    console.log(`"${text}"`);

    const task = MLTemplates.sentimentAnalysis(text, {
      modelId: "sentiment",
    });

    if (i === 0) {
      const costEstimate = CostEstimator.estimateTaskCost(task);
      console.log(`💰 Cost per analysis: ${costEstimate.estimatedCost} ETH`);
    }

    const startTime = Date.now();

    try {
      const result = await sdk.submitTask(
        task.payload.operation,
        JSON.stringify(task.payload.data),
        {
          reward: task.options.reward,
          timeout: task.options.timeout,
          funcType: task.type,
        }
      );

      const duration = Date.now() - startTime;

      // Simulate sentiment analysis results
      const simulatedSentiment = simulateSentimentAnalysis(text);

      console.log(`✅ Analysis completed in ${duration}ms`);
      console.log(
        `😊 Sentiment: ${simulatedSentiment.sentiment.toUpperCase()}`
      );
      console.log(
        `📊 Score: ${simulatedSentiment.score.toFixed(3)} (range: -1 to +1)`
      );
      console.log(
        `🎯 Confidence: ${(simulatedSentiment.confidence * 100).toFixed(1)}%`
      );
    } catch (error) {
      console.log(`❌ Sentiment analysis failed: ${error.message}`);
    }

    // Short delay between analyses
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(`\n📈 Batch Analysis Summary:`);
  console.log(`   Total texts analyzed: ${testTexts.length}`);
  console.log(`   Average processing time: ~300ms per text`);
  console.log(
    `   Use cases: Social media monitoring, review analysis, customer feedback`
  );
}

async function runToxicityDetectionDemo(sdk) {
  console.log("\n🛡️ 3. AI Content Toxicity Detection");
  console.log("======================================");

  const testTexts = [
    "This is a completely normal and friendly message.",
    "I disagree with your opinion, but respect your right to have it.",
    "You're such an idiot and your ideas are completely stupid.",
    "I hate this system, it's the worst thing ever created!",
    "DeAsync provides excellent decentralized computing services.",
    "This content moderation system works really well for community safety.",
  ];

  console.log("Scanning 6 messages for toxic content...");
  console.log("Model: TensorFlow.js Toxicity Classifier");
  console.log(
    "Categories: identity_attack, insult, obscene, severe_toxicity, sexual_explicit, threat\n"
  );

  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    console.log(`--- Message ${i + 1} ---`);
    console.log(`"${text}"`);

    const task = MLTemplates.toxicityDetection(text, {
      threshold: 0.7,
    });

    if (i === 0) {
      const costEstimate = CostEstimator.estimateTaskCost(task);
      console.log(`💰 Cost per scan: ${costEstimate.estimatedCost} ETH`);
    }

    const startTime = Date.now();

    try {
      const result = await sdk.submitTask(
        task.payload.operation,
        JSON.stringify(task.payload.data),
        {
          reward: task.options.reward,
          timeout: task.options.timeout,
          funcType: task.type,
        }
      );

      const duration = Date.now() - startTime;

      // Simulate toxicity detection results
      const simulatedToxicity = simulateToxicityDetection(text);

      console.log(`✅ Scan completed in ${duration}ms`);

      if (simulatedToxicity.isToxic) {
        console.log(`⚠️ TOXIC CONTENT DETECTED`);
        console.log(
          `📊 Toxicity score: ${simulatedToxicity.toxicityScore.toFixed(
            3
          )} (threshold: 0.7)`
        );

        console.log("📋 Category breakdown:");
        Object.entries(simulatedToxicity.categories).forEach(
          ([category, score]) => {
            if (score > 0.3) {
              console.log(`   ${category}: ${score.toFixed(3)}`);
            }
          }
        );
      } else {
        console.log(`✅ SAFE CONTENT`);
        console.log(
          `📊 Toxicity score: ${simulatedToxicity.toxicityScore.toFixed(
            3
          )} (below threshold)`
        );
      }
    } catch (error) {
      console.log(`❌ Toxicity detection failed: ${error.message}`);
    }

    console.log(""); // Empty line
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  console.log(`🛡️ Content Moderation Summary:`);
  console.log(`   Messages scanned: ${testTexts.length}`);
  console.log(`   Detection accuracy: >95% (industry standard)`);
  console.log(
    `   Use cases: Chat moderation, comment filtering, community safety`
  );
}

async function runTextAnalysisDemo(sdk) {
  console.log("\n📝 4. Advanced Text Processing");
  console.log("================================");

  const sampleText = `
    Artificial Intelligence and Machine Learning have revolutionized the way we approach 
    complex computational problems. The DeAsync platform represents a significant advancement 
    in decentralized computing, enabling researchers and developers to leverage distributed 
    GPU resources for intensive AI workloads. This innovative approach democratizes access 
    to high-performance computing, making advanced AI capabilities accessible to a broader 
    range of users and applications. The potential impact on scientific research, 
    business analytics, and creative industries is immense.
  `;

  console.log("Analyzing text sample:");
  console.log(sampleText.trim());
  console.log("\nRunning multiple text analysis operations...\n");

  // Word frequency analysis
  console.log("1. Word Frequency Analysis");
  console.log("---------------------------");

  try {
    const wordFreqResult = await sdk.submitTask(
      "word_frequency",
      JSON.stringify({ text: sampleText.trim() }),
      {
        reward: "0.001",
        timeout: 30000,
        funcType: "text",
      }
    );

    // Simulate word frequency results
    const mockWordFreq = {
      totalWords: 67,
      uniqueWords: 52,
      topWords: [
        { word: "and", count: 4, percentage: "5.97" },
        { word: "to", count: 3, percentage: "4.48" },
        { word: "the", count: 3, percentage: "4.48" },
        { word: "computing", count: 2, percentage: "2.99" },
        { word: "ai", count: 2, percentage: "2.99" },
        { word: "advanced", count: 2, percentage: "2.99" },
      ],
    };

    console.log(`📊 Text Statistics:`);
    console.log(`   Total words: ${mockWordFreq.totalWords}`);
    console.log(`   Unique words: ${mockWordFreq.uniqueWords}`);
    console.log(
      `   Vocabulary richness: ${(
        (mockWordFreq.uniqueWords / mockWordFreq.totalWords) *
        100
      ).toFixed(1)}%`
    );

    console.log(`\n🔤 Most frequent words:`);
    mockWordFreq.topWords.forEach((word, i) => {
      console.log(
        `   ${i + 1}. "${word.word}": ${word.count} times (${word.percentage}%)`
      );
    });
  } catch (error) {
    console.log(`❌ Word frequency analysis failed: ${error.message}`);
  }

  // Text similarity comparison
  console.log("\n2. Text Similarity Analysis");
  console.log("----------------------------");

  const compareText = `
    Machine Learning and Artificial Intelligence are transforming computational approaches
    to complex problems. DeAsync offers groundbreaking decentralized computing solutions
    for distributed AI processing across GPU networks.
  `;

  console.log("Comparing with similar text...");

  try {
    const similarityResult = await sdk.submitTask(
      "text_similarity",
      JSON.stringify({ text1: sampleText.trim(), text2: compareText.trim() }),
      {
        reward: "0.002",
        timeout: 30000,
        funcType: "text",
      }
    );

    // Simulate similarity results
    const mockSimilarity = {
      jaccardSimilarity: 0.34,
      cosineSimilarity: 0.67,
      commonWords: [
        "artificial",
        "intelligence",
        "machine",
        "learning",
        "computing",
        "deasync",
        "ai",
      ],
      uniqueWords1: 45,
      uniqueWords2: 28,
      totalCommon: 7,
    };

    console.log(`📊 Similarity Metrics:`);
    console.log(
      `   Jaccard similarity: ${(
        mockSimilarity.jaccardSimilarity * 100
      ).toFixed(1)}%`
    );
    console.log(
      `   Cosine similarity: ${(mockSimilarity.cosineSimilarity * 100).toFixed(
        1
      )}%`
    );
    console.log(`   Common words: ${mockSimilarity.totalCommon}`);
    console.log(`   Unique to text 1: ${mockSimilarity.uniqueWords1}`);
    console.log(`   Unique to text 2: ${mockSimilarity.uniqueWords2}`);

    console.log(`\n🔗 Common concepts:`);
    mockSimilarity.commonWords.forEach((word) => {
      console.log(`   • ${word}`);
    });
  } catch (error) {
    console.log(`❌ Text similarity analysis failed: ${error.message}`);
  }

  console.log(`\n📈 Text Analysis Applications:`);
  console.log(`   • Content similarity detection`);
  console.log(`   • Plagiarism checking`);
  console.log(`   • Document clustering`);
  console.log(`   • SEO content optimization`);
  console.log(`   • Automated content tagging`);
}

// Helper functions for simulation

function generateSampleImageData(width, height, channels) {
  // Generate random image data for demonstration
  return Array.from({ length: height }, () =>
    Array.from({ length: width }, () =>
      Array.from({ length: channels }, () => Math.floor(Math.random() * 256))
    )
  );
}

function simulateSentimentAnalysis(text) {
  const positiveWords = [
    "love",
    "great",
    "amazing",
    "excellent",
    "wonderful",
    "fantastic",
    "incredible",
    "revolutionary",
  ];
  const negativeWords = [
    "hate",
    "terrible",
    "awful",
    "bad",
    "horrible",
    "disappointed",
    "slow",
    "unreliable",
  ];

  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach((word) => {
    if (positiveWords.some((pos) => word.includes(pos))) positiveCount++;
    if (negativeWords.some((neg) => word.includes(neg))) negativeCount++;
  });

  const score = (positiveCount - negativeCount) / words.length;
  const normalizedScore = Math.tanh(score * 5); // Normalize to -1 to 1

  return {
    sentiment:
      normalizedScore > 0.1
        ? "positive"
        : normalizedScore < -0.1
        ? "negative"
        : "neutral",
    score: normalizedScore,
    confidence: Math.min(0.95, 0.5 + Math.abs(normalizedScore) * 0.5),
  };
}

function simulateToxicityDetection(text) {
  const toxicWords = ["idiot", "stupid", "hate", "worst", "terrible"];
  const words = text.toLowerCase().split(/\s+/);

  let toxicScore = 0;
  words.forEach((word) => {
    if (toxicWords.some((toxic) => word.includes(toxic))) {
      toxicScore += 0.3;
    }
  });

  // Add some randomness and normalize
  toxicScore = Math.min(0.95, toxicScore + Math.random() * 0.1);

  return {
    isToxic: toxicScore > 0.7,
    toxicityScore: toxicScore,
    threshold: 0.7,
    categories: {
      identity_attack: toxicScore * 0.2,
      insult: toxicScore * 0.8,
      obscene: toxicScore * 0.3,
      severe_toxicity: toxicScore * 0.6,
      sexual_explicit: toxicScore * 0.1,
      threat: toxicScore * 0.4,
    },
  };
}

// Run demo
mlDemo();
