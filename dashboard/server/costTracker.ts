// Pricing constants (Opus model)
const PRICING = {
  inputPerMillion: 3.0,   // $3 per 1M input tokens
  outputPerMillion: 15.0, // $15 per 1M output tokens
};

interface IterationCost {
  iteration: number;
  tokensInput: number;
  tokensOutput: number;
  cost: number;
  timestamp: Date;
}

interface CostData {
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCost: number;
  costLimit: number;
  perIterationCosts: IterationCost[];
}

export class CostTracker {
  private totalTokensInput: number = 0;
  private totalTokensOutput: number = 0;
  private costLimit: number = 50;
  private perIterationCosts: IterationCost[] = [];
  private currentIteration: number = 0;

  reset(): void {
    this.totalTokensInput = 0;
    this.totalTokensOutput = 0;
    this.perIterationCosts = [];
    this.currentIteration = 0;
  }

  setLimit(limit: number): void {
    this.costLimit = limit;
  }

  addUsage(inputTokens: number, outputTokens: number): void {
    this.totalTokensInput += inputTokens;
    this.totalTokensOutput += outputTokens;

    const cost = this.calculateCost(inputTokens, outputTokens);

    // Update current iteration cost
    const existingIndex = this.perIterationCosts.findIndex(
      (c) => c.iteration === this.currentIteration
    );

    if (existingIndex >= 0) {
      this.perIterationCosts[existingIndex].tokensInput += inputTokens;
      this.perIterationCosts[existingIndex].tokensOutput += outputTokens;
      this.perIterationCosts[existingIndex].cost += cost;
    } else {
      this.perIterationCosts.push({
        iteration: this.currentIteration,
        tokensInput: inputTokens,
        tokensOutput: outputTokens,
        cost,
        timestamp: new Date(),
      });
    }
  }

  setIteration(iteration: number): void {
    this.currentIteration = iteration;
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * PRICING.inputPerMillion;
    const outputCost = (outputTokens / 1_000_000) * PRICING.outputPerMillion;
    return inputCost + outputCost;
  }

  getTotalCost(): number {
    return this.calculateCost(this.totalTokensInput, this.totalTokensOutput);
  }

  isOverLimit(): boolean {
    return this.getTotalCost() >= this.costLimit;
  }

  getData(): CostData {
    return {
      totalTokensInput: this.totalTokensInput,
      totalTokensOutput: this.totalTokensOutput,
      totalCost: this.getTotalCost(),
      costLimit: this.costLimit,
      perIterationCosts: [...this.perIterationCosts],
    };
  }
}
