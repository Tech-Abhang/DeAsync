import { EventEmitter } from "events";
import { performance, PerformanceObserver } from "perf_hooks";
import os from "os";

/**
 * Advanced Resource Monitor for DeAsync Platform
 * Tracks GPU/CPU/memory utilization, performance metrics, and system health
 * Provides real-time monitoring and historical data for optimization
 */
export class ResourceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      monitoringInterval: options.monitoringInterval || 5000, // 5 seconds
      historyRetention: options.historyRetention || 300000, // 5 minutes
      performanceThresholds: {
        cpuWarning: options.cpuWarningThreshold || 80,
        memoryWarning: options.memoryWarningThreshold || 85,
        gpuMemoryWarning: options.gpuMemoryWarningThreshold || 90,
        ...options.performanceThresholds,
      },
      enableDetailedMetrics: options.enableDetailedMetrics || true,
      ...options,
    };

    this.isMonitoring = false;
    this.monitoringTimer = null;
    this.performanceObserver = null;

    // Data storage
    this.metrics = {
      system: {
        cpu: { usage: 0, cores: os.cpus().length, model: os.cpus()[0].model },
        memory: { used: 0, total: os.totalmem(), available: 0, percentage: 0 },
        platform: os.platform(),
        arch: os.arch(),
        uptime: 0,
      },
      process: {
        cpu: 0,
        memory: { rss: 0, heapUsed: 0, heapTotal: 0, external: 0 },
        uptime: 0,
        pid: process.pid,
      },
      gpu: {
        available: false,
        utilization: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        temperature: 0,
        vendor: "Unknown",
      },
      tensorflow: {
        numTensors: 0,
        numBytes: 0,
        numBytesInGPU: 0,
        backend: "unknown",
      },
      tasks: {
        active: 0,
        completed: 0,
        failed: 0,
        averageExecutionTime: 0,
        totalExecutionTime: 0,
      },
      performance: {
        throughput: 0, // tasks per minute
        latency: 0, // average response time
        errorRate: 0, // percentage of failed tasks
      },
    };

    this.history = [];
    this.taskMetrics = new Map();
    this.performanceMetrics = [];

    console.log("📊 Resource Monitor initialized");
  }

  /**
   * Start resource monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log("⚠️ Resource monitoring already active");
      return;
    }

    console.log(
      `🔍 Starting resource monitoring (interval: ${this.config.monitoringInterval}ms)`
    );

    try {
      // Initialize performance observer for detailed metrics
      if (this.config.enableDetailedMetrics) {
        await this._initPerformanceObserver();
      }

      // Start monitoring loop
      this.isMonitoring = true;
      await this._collectInitialMetrics();

      this.monitoringTimer = setInterval(async () => {
        try {
          await this._collectMetrics();
          this._analyzeMetrics();
          this._cleanupHistory();
        } catch (error) {
          console.error("❌ Error during metrics collection:", error.message);
          this.emit("error", error);
        }
      }, this.config.monitoringInterval);

      this.emit("monitoringStarted");
      console.log("✅ Resource monitoring started");
    } catch (error) {
      console.error("❌ Failed to start resource monitoring:", error.message);
      throw error;
    }
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log("⚠️ Resource monitoring not active");
      return;
    }

    console.log("⏹️ Stopping resource monitoring...");

    this.isMonitoring = false;

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.emit("monitoringStopped");
    console.log("✅ Resource monitoring stopped");
  }

  /**
   * Get current system metrics
   */
  getCurrentMetrics() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
      isMonitoring: this.isMonitoring,
    };
  }

  /**
   * Get historical metrics for a time range
   */
  getHistoricalMetrics(timeRangeMs = 60000) {
    // Default 1 minute
    const cutoffTime = Date.now() - timeRangeMs;
    const filteredHistory = this.history.filter(
      (entry) => entry.timestamp >= cutoffTime
    );

    return {
      timeRange: timeRangeMs,
      dataPoints: filteredHistory.length,
      metrics: filteredHistory,
      summary: this._generateHistoricalSummary(filteredHistory),
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const recentTasks = Array.from(this.taskMetrics.values())
      .filter((task) => task.completedAt > Date.now() - 300000) // Last 5 minutes
      .sort((a, b) => b.completedAt - a.completedAt);

    const totalTasks = recentTasks.length;
    const successfulTasks = recentTasks.filter((task) => !task.failed).length;
    const failedTasks = totalTasks - successfulTasks;

    const executionTimes = recentTasks
      .filter((task) => !task.failed)
      .map((task) => task.executionTime);

    return {
      totalTasks,
      successfulTasks,
      failedTasks,
      successRate: totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0,
      averageExecutionTime:
        executionTimes.length > 0
          ? executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length
          : 0,
      medianExecutionTime: this._calculateMedian(executionTimes),
      p95ExecutionTime: this._calculatePercentile(executionTimes, 95),
      throughputPerMinute: totalTasks * (60000 / 300000), // Scale to per minute
      recentTasks: recentTasks.slice(0, 10), // Last 10 tasks
    };
  }

  /**
   * Record task execution metrics
   */
  recordTaskExecution(taskId, metrics) {
    const taskMetric = {
      taskId,
      startTime: metrics.startTime || Date.now(),
      executionTime: metrics.executionTime || 0,
      memoryUsage: metrics.memoryUsage || 0,
      gpuUsage: metrics.gpuUsage || 0,
      failed: metrics.failed || false,
      error: metrics.error || null,
      taskType: metrics.taskType || "unknown",
      completedAt: Date.now(),
      ...metrics,
    };

    this.taskMetrics.set(taskId, taskMetric);

    // Update aggregated task metrics
    this.metrics.tasks.completed += metrics.failed ? 0 : 1;
    this.metrics.tasks.failed += metrics.failed ? 1 : 0;

    if (!metrics.failed && metrics.executionTime) {
      this.metrics.tasks.totalExecutionTime += metrics.executionTime;
      const totalSuccessful = this.metrics.tasks.completed;
      this.metrics.tasks.averageExecutionTime =
        this.metrics.tasks.totalExecutionTime / totalSuccessful;
    }

    this.emit("taskMetricsUpdated", taskMetric);
  }

  /**
   * Get resource utilization warnings
   */
  getWarnings() {
    const warnings = [];
    const thresholds = this.config.performanceThresholds;

    if (this.metrics.system.cpu.usage > thresholds.cpuWarning) {
      warnings.push({
        type: "cpu",
        level: "warning",
        message: `High CPU usage: ${this.metrics.system.cpu.usage.toFixed(1)}%`,
        value: this.metrics.system.cpu.usage,
        threshold: thresholds.cpuWarning,
      });
    }

    if (this.metrics.system.memory.percentage > thresholds.memoryWarning) {
      warnings.push({
        type: "memory",
        level: "warning",
        message: `High memory usage: ${this.metrics.system.memory.percentage.toFixed(
          1
        )}%`,
        value: this.metrics.system.memory.percentage,
        threshold: thresholds.memoryWarning,
      });
    }

    if (
      this.metrics.gpu.available &&
      this.metrics.gpu.memory.percentage > thresholds.gpuMemoryWarning
    ) {
      warnings.push({
        type: "gpu_memory",
        level: "warning",
        message: `High GPU memory usage: ${this.metrics.gpu.memory.percentage.toFixed(
          1
        )}%`,
        value: this.metrics.gpu.memory.percentage,
        threshold: thresholds.gpuMemoryWarning,
      });
    }

    if (this.metrics.performance.errorRate > 10) {
      warnings.push({
        type: "error_rate",
        level: "error",
        message: `High error rate: ${this.metrics.performance.errorRate.toFixed(
          1
        )}%`,
        value: this.metrics.performance.errorRate,
        threshold: 10,
      });
    }

    return warnings;
  }

  /**
   * Get system capabilities and recommendations
   */
  getSystemCapabilities() {
    const capabilities = {
      cpu: {
        cores: this.metrics.system.cpu.cores,
        model: this.metrics.system.cpu.model,
        currentUsage: this.metrics.system.cpu.usage,
        recommendation: this._getCPURecommendation(),
      },
      memory: {
        total: Math.round(
          this.metrics.system.memory.total / 1024 / 1024 / 1024
        ), // GB
        available: Math.round(
          this.metrics.system.memory.available / 1024 / 1024 / 1024
        ), // GB
        currentUsage: this.metrics.system.memory.percentage,
        recommendation: this._getMemoryRecommendation(),
      },
      gpu: {
        available: this.metrics.gpu.available,
        vendor: this.metrics.gpu.vendor,
        currentUsage: this.metrics.gpu.utilization,
        memoryUsage: this.metrics.gpu.memory.percentage,
        recommendation: this._getGPURecommendation(),
      },
      platform: {
        os: this.metrics.system.platform,
        arch: this.metrics.system.arch,
        nodeVersion: process.version,
      },
    };

    return capabilities;
  }

  /**
   * Private methods for metrics collection and analysis
   */

  async _initPerformanceObserver() {
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.performanceMetrics.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now(),
          });
        });
      });

      this.performanceObserver.observe({ entryTypes: ["measure", "mark"] });
    } catch (error) {
      console.warn("⚠️ Performance observer not available:", error.message);
    }
  }

  async _collectInitialMetrics() {
    console.log("📊 Collecting initial system metrics...");
    await this._collectMetrics();
  }

  async _collectMetrics() {
    const timestamp = Date.now();

    // System CPU and Memory
    await this._collectSystemMetrics();

    // Process metrics
    this._collectProcessMetrics();

    // GPU metrics (if available)
    await this._collectGPUMetrics();

    // TensorFlow metrics (if available)
    this._collectTensorFlowMetrics();

    // Performance metrics
    this._calculatePerformanceMetrics();

    // Add to history
    this.history.push({
      timestamp,
      metrics: JSON.parse(JSON.stringify(this.metrics)),
    });

    this.emit("metricsUpdated", this.metrics);
  }

  async _collectSystemMetrics() {
    // CPU usage calculation
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      Object.keys(cpu.times).forEach((type) => {
        totalTick += cpu.times[type];
      });
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    this.metrics.system.cpu.usage = 100 - ~~((100 * idle) / total);

    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    this.metrics.system.memory.total = totalMem;
    this.metrics.system.memory.available = freeMem;
    this.metrics.system.memory.used = usedMem;
    this.metrics.system.memory.percentage = (usedMem / totalMem) * 100;

    // System uptime
    this.metrics.system.uptime = os.uptime();
  }

  _collectProcessMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.metrics.process.memory = memUsage;
    this.metrics.process.cpu = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
    this.metrics.process.uptime = process.uptime();
  }

  async _collectGPUMetrics() {
    // GPU metrics collection (would integrate with actual GPU monitoring tools)
    // For now, simulating GPU metrics
    try {
      // In a real implementation, you would use nvidia-smi, CUDA APIs, etc.
      this.metrics.gpu = {
        available: false, // Would be detected
        utilization: 0,
        memory: { used: 0, total: 0, percentage: 0 },
        temperature: 0,
        vendor: "Unknown",
      };
    } catch (error) {
      // GPU monitoring not available
      this.metrics.gpu.available = false;
    }
  }

  _collectTensorFlowMetrics() {
    try {
      // Check if TensorFlow is available
      const tf = require("@tensorflow/tfjs");
      if (tf && tf.memory) {
        const memInfo = tf.memory();
        this.metrics.tensorflow = {
          numTensors: memInfo.numTensors,
          numBytes: memInfo.numBytes,
          numBytesInGPU: memInfo.numBytesInGPU || 0,
          backend: tf.getBackend ? tf.getBackend() : "unknown",
        };
      }
    } catch (error) {
      // TensorFlow not available or not initialized
      this.metrics.tensorflow = {
        numTensors: 0,
        numBytes: 0,
        numBytesInGPU: 0,
        backend: "not_available",
      };
    }
  }

  _calculatePerformanceMetrics() {
    const recentTasks = Array.from(this.taskMetrics.values()).filter(
      (task) => task.completedAt > Date.now() - 60000
    ); // Last minute

    const totalTasks = recentTasks.length;
    const successfulTasks = recentTasks.filter((task) => !task.failed).length;
    const failedTasks = totalTasks - successfulTasks;

    this.metrics.performance = {
      throughput: totalTasks, // Tasks per minute
      latency:
        successfulTasks > 0
          ? recentTasks.reduce((sum, task) => sum + task.executionTime, 0) /
            successfulTasks
          : 0,
      errorRate: totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0,
    };
  }

  _analyzeMetrics() {
    const warnings = this.getWarnings();

    if (warnings.length > 0) {
      this.emit("performanceWarning", warnings);
    }

    // Emit specific events for high resource usage
    if (this.metrics.system.cpu.usage > 90) {
      this.emit("highCPUUsage", this.metrics.system.cpu.usage);
    }

    if (this.metrics.system.memory.percentage > 95) {
      this.emit("highMemoryUsage", this.metrics.system.memory.percentage);
    }
  }

  _cleanupHistory() {
    const cutoffTime = Date.now() - this.config.historyRetention;
    this.history = this.history.filter(
      (entry) => entry.timestamp >= cutoffTime
    );

    // Clean up old task metrics
    const cutoffTaskTime = Date.now() - this.config.historyRetention * 2;
    for (const [taskId, metrics] of this.taskMetrics.entries()) {
      if (metrics.completedAt < cutoffTaskTime) {
        this.taskMetrics.delete(taskId);
      }
    }
  }

  _generateHistoricalSummary(data) {
    if (data.length === 0) return null;

    const cpuValues = data.map((d) => d.metrics.system.cpu.usage);
    const memoryValues = data.map((d) => d.metrics.system.memory.percentage);

    return {
      cpu: {
        average: cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length,
        min: Math.min(...cpuValues),
        max: Math.max(...cpuValues),
        median: this._calculateMedian(cpuValues),
      },
      memory: {
        average: memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length,
        min: Math.min(...memoryValues),
        max: Math.max(...memoryValues),
        median: this._calculateMedian(memoryValues),
      },
      dataPoints: data.length,
      timeSpan: data[data.length - 1].timestamp - data[0].timestamp,
    };
  }

  _calculateMedian(values) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * (percentile / 100)) - 1;

    return sorted[Math.max(0, index)];
  }

  _getCPURecommendation() {
    const usage = this.metrics.system.cpu.usage;
    const cores = this.metrics.system.cpu.cores;

    if (usage < 30) return "CPU usage is low - can handle more intensive tasks";
    if (usage < 70) return "CPU usage is moderate - good for current workload";
    if (usage < 90)
      return "CPU usage is high - consider reducing task complexity";
    return "CPU usage is critical - may need to scale down or add more cores";
  }

  _getMemoryRecommendation() {
    const usage = this.metrics.system.memory.percentage;

    if (usage < 50) return "Memory usage is low - can handle larger datasets";
    if (usage < 75) return "Memory usage is moderate - monitor for large tasks";
    if (usage < 90)
      return "Memory usage is high - consider memory optimization";
    return "Memory usage is critical - immediate attention required";
  }

  _getGPURecommendation() {
    if (!this.metrics.gpu.available) {
      return "No GPU detected - using CPU for computations";
    }

    const usage = this.metrics.gpu.utilization;

    if (usage < 30)
      return "GPU is underutilized - can handle more parallel tasks";
    if (usage < 70) return "GPU usage is optimal for current workload";
    if (usage < 90) return "GPU usage is high - monitor performance";
    return "GPU usage is at maximum - consider task optimization";
  }

  /**
   * Export metrics data
   */
  exportMetrics(format = "json") {
    const data = {
      current: this.getCurrentMetrics(),
      performance: this.getPerformanceSummary(),
      capabilities: this.getSystemCapabilities(),
      warnings: this.getWarnings(),
      exportedAt: new Date().toISOString(),
    };

    if (format === "csv") {
      return this._convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  _convertToCSV(data) {
    // Simple CSV conversion for metrics
    const headers = [
      "timestamp",
      "cpu_usage",
      "memory_usage",
      "gpu_usage",
      "active_tasks",
    ];
    const rows = this.history.map((entry) => [
      entry.timestamp,
      entry.metrics.system.cpu.usage,
      entry.metrics.system.memory.percentage,
      entry.metrics.gpu.utilization,
      entry.metrics.tasks.active,
    ]);

    return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  /**
   * Cleanup and stop monitoring
   */
  async cleanup() {
    this.stopMonitoring();
    this.history = [];
    this.taskMetrics.clear();
    this.performanceMetrics = [];

    console.log("🧹 Resource Monitor cleaned up");
  }
}
