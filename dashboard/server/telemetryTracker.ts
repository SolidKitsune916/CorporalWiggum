interface IterationTelemetry {
  iteration: number;
  startedAt: Date;
  duration: number;
  success: boolean;
  triggerReason: 'INITIAL' | 'TASK_INCOMPLETE' | 'RECOVERY' | 'LOOP_DETECTED';
  tokensUsed?: {
    input: number;
    output: number;
  };
  cost?: number;
  toolsUsed?: string[];
  outputPreview?: string;
  errorMessage?: string;
}

interface RecordIterationOptions {
  iteration: number;
  success: boolean;
  duration: number;
  tokensInput?: number;
  tokensOutput?: number;
  cost?: number;
  toolsUsed?: string[];
  outputPreview?: string;
  errorMessage?: string;
}

export class TelemetryTracker {
  private history: IterationTelemetry[] = [];

  reset(): void {
    this.history = [];
  }

  recordIteration(opts: RecordIterationOptions): void {
    const telemetry: IterationTelemetry = {
      iteration: opts.iteration,
      startedAt: new Date(Date.now() - opts.duration),
      duration: opts.duration,
      success: opts.success,
      triggerReason: this.determineTriggerReason(opts.iteration),
      tokensUsed: opts.tokensInput !== undefined && opts.tokensOutput !== undefined
        ? { input: opts.tokensInput, output: opts.tokensOutput }
        : undefined,
      cost: opts.cost,
      toolsUsed: opts.toolsUsed,
      outputPreview: opts.outputPreview,
      errorMessage: opts.errorMessage,
    };

    this.history.push(telemetry);
  }

  private determineTriggerReason(iteration: number): IterationTelemetry['triggerReason'] {
    if (iteration === 1) {
      return 'INITIAL';
    }

    // Check if previous iteration failed
    const prevTelemetry = this.history.find((t) => t.iteration === iteration - 1);
    if (prevTelemetry && !prevTelemetry.success) {
      return 'RECOVERY';
    }

    // Check for loop detection
    if (this.history.some((t) => t.triggerReason === 'LOOP_DETECTED')) {
      return 'LOOP_DETECTED';
    }

    return 'TASK_INCOMPLETE';
  }

  getHistory(): IterationTelemetry[] {
    return [...this.history];
  }

  getIteration(iteration: number): IterationTelemetry | undefined {
    return this.history.find((t) => t.iteration === iteration);
  }

  getSummary(): {
    totalIterations: number;
    successfulIterations: number;
    failedIterations: number;
    averageDuration: number;
    totalCost: number;
  } {
    const successful = this.history.filter((t) => t.success).length;
    const failed = this.history.filter((t) => !t.success).length;
    const avgDuration = this.history.length > 0
      ? this.history.reduce((sum, t) => sum + t.duration, 0) / this.history.length
      : 0;
    const totalCost = this.history.reduce((sum, t) => sum + (t.cost ?? 0), 0);

    return {
      totalIterations: this.history.length,
      successfulIterations: successful,
      failedIterations: failed,
      averageDuration: avgDuration,
      totalCost,
    };
  }

  exportToJson(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      summary: this.getSummary(),
      iterations: this.history,
    }, null, 2);
  }
}
