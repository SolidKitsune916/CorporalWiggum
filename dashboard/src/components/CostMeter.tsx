import type { CostTracker } from '../types';
import { DollarSign, TrendingUp } from 'lucide-react';

interface CostMeterProps {
  costTracker: CostTracker | null;
}

export function CostMeter({ costTracker }: CostMeterProps) {
  if (!costTracker) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-4">Cost Tracking</h3>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const percentage = (costTracker.totalCost / costTracker.costLimit) * 100;
  const clampedPercentage = Math.min(percentage, 100);

  const getProgressColor = () => {
    if (percentage >= 80) return 'bg-red-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (percentage >= 80) return 'text-red-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(2)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Cost Tracking
        </h3>
        <span className={`text-sm font-medium ${getTextColor()}`}>
          {percentage.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${clampedPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-lg font-bold">
            ${costTracker.totalCost.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">
            / ${costTracker.costLimit.toFixed(2)} limit
          </span>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Input Tokens
          </span>
          <span className="font-mono">
            {formatTokens(costTracker.totalTokensInput)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Output Tokens
          </span>
          <span className="font-mono">
            {formatTokens(costTracker.totalTokensOutput)}
          </span>
        </div>
      </div>

      {/* Warning */}
      {percentage >= 80 && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-500">
          Warning: Approaching cost limit
        </div>
      )}
    </div>
  );
}
