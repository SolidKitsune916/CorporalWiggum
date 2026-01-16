/**
 * Metrics Collection for WIGGUM
 *
 * Tracks runtime metrics for monitoring and observability.
 * Designed to be compatible with Prometheus-style metrics.
 */

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  help: string;
  value: number;
  labels?: Record<string, string>;
  updatedAt: Date;
}

interface HistogramBuckets {
  [bucket: string]: number;
}

class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();
  private histogramBuckets: Map<string, HistogramBuckets> = new Map();

  /**
   * Increment a counter metric
   */
  incCounter(name: string, labels?: Record<string, string>, amount: number = 1): void {
    const key = this.getKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing) {
      existing.value += amount;
      existing.updatedAt = new Date();
    } else {
      this.metrics.set(key, {
        name,
        type: 'counter',
        help: `Counter for ${name}`,
        value: amount,
        labels,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);
    this.metrics.set(key, {
      name,
      type: 'gauge',
      help: `Gauge for ${name}`,
      value,
      labels,
      updatedAt: new Date(),
    });
  }

  /**
   * Observe a value for a histogram metric
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getKey(name, labels);

    // Standard histogram buckets (in seconds for timing)
    const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, Infinity];

    let bucketData = this.histogramBuckets.get(key);
    if (!bucketData) {
      bucketData = {};
      buckets.forEach((b) => (bucketData![b.toString()] = 0));
      bucketData['sum'] = 0;
      bucketData['count'] = 0;
      this.histogramBuckets.set(key, bucketData);
    }

    // Increment appropriate buckets
    for (const bucket of buckets) {
      if (value <= bucket) {
        bucketData[bucket.toString()]++;
      }
    }
    bucketData['sum'] += value;
    bucketData['count']++;
  }

  /**
   * Get a metric value
   */
  getMetric(name: string, labels?: Record<string, string>): Metric | undefined {
    return this.metrics.get(this.getKey(name, labels));
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      const labelStr = metric.labels
        ? `{${Object.entries(metric.labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')}}`
        : '';

      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      lines.push(`${metric.name}${labelStr} ${metric.value}`);
    }

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.histogramBuckets.clear();
  }

  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

// Common WIGGUM metrics
export const METRICS = {
  // Loop metrics
  LOOP_ITERATIONS_TOTAL: 'wiggum_loop_iterations_total',
  LOOP_DURATION_SECONDS: 'wiggum_loop_duration_seconds',
  LOOP_ERRORS_TOTAL: 'wiggum_loop_errors_total',
  LOOP_ACTIVE: 'wiggum_loop_active',

  // Cost metrics
  TOKENS_INPUT_TOTAL: 'wiggum_tokens_input_total',
  TOKENS_OUTPUT_TOTAL: 'wiggum_tokens_output_total',
  COST_USD_TOTAL: 'wiggum_cost_usd_total',

  // WebSocket metrics
  WS_CONNECTIONS_ACTIVE: 'wiggum_ws_connections_active',
  WS_MESSAGES_TOTAL: 'wiggum_ws_messages_total',

  // Instance metrics
  INSTANCES_ACTIVE: 'wiggum_instances_active',
  INSTANCES_SPAWNED_TOTAL: 'wiggum_instances_spawned_total',
};

export default metrics;
