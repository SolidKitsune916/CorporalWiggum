import { useState } from 'react';
import type { IterationTelemetry, CostTracker } from '../types';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Download,
  Clock,
  DollarSign,
} from 'lucide-react';

interface TelemetryPanelProps {
  telemetryHistory: IterationTelemetry[];
  costTracker: CostTracker | null;
}

export function TelemetryPanel({
  telemetryHistory,
  costTracker,
}: TelemetryPanelProps) {
  const [expandedIterations, setExpandedIterations] = useState<Set<number>>(
    new Set()
  );
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const toggleExpanded = (iteration: number) => {
    const newExpanded = new Set(expandedIterations);
    if (newExpanded.has(iteration)) {
      newExpanded.delete(iteration);
    } else {
      newExpanded.add(iteration);
    }
    setExpandedIterations(newExpanded);
  };

  const filteredHistory = telemetryHistory.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'success') return t.success;
    return !t.success;
  });

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
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

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      summary: {
        totalIterations: telemetryHistory.length,
        successfulIterations: telemetryHistory.filter((t) => t.success).length,
        totalCost: costTracker?.totalCost ?? 0,
        totalTokensInput: costTracker?.totalTokensInput ?? 0,
        totalTokensOutput: costTracker?.totalTokensOutput ?? 0,
      },
      iterations: telemetryHistory,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ralph-metrics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = telemetryHistory.filter((t) => t.success).length;
  const failedCount = telemetryHistory.length - successCount;
  const avgDuration =
    telemetryHistory.length > 0
      ? telemetryHistory.reduce((sum, t) => sum + t.duration, 0) /
        telemetryHistory.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Iterations</div>
          <div className="text-2xl font-bold">{telemetryHistory.length}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Success Rate</div>
          <div className="text-2xl font-bold text-green-500">
            {telemetryHistory.length > 0
              ? ((successCount / telemetryHistory.length) * 100).toFixed(0)
              : 0}
            %
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Avg Duration
          </div>
          <div className="text-2xl font-bold">{formatDuration(avgDuration)}</div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Total Cost
          </div>
          <div className="text-2xl font-bold">
            ${(costTracker?.totalCost ?? 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Iteration History */}
      <div className="bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold">Iteration History</h3>
          <div className="flex items-center gap-2">
            {/* Filter Buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 text-xs rounded ${
                  filter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                All ({telemetryHistory.length})
              </button>
              <button
                onClick={() => setFilter('success')}
                className={`px-2 py-1 text-xs rounded ${
                  filter === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Success ({successCount})
              </button>
              <button
                onClick={() => setFilter('failed')}
                className={`px-2 py-1 text-xs rounded ${
                  filter === 'failed'
                    ? 'bg-red-500 text-white'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                Failed ({failedCount})
              </button>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded"
              title="Export telemetry data"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No telemetry data yet. Start the loop to collect metrics.
          </div>
        ) : (
          <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
            {filteredHistory.map((telemetry) => (
              <div key={telemetry.iteration}>
                <button
                  onClick={() => toggleExpanded(telemetry.iteration)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {expandedIterations.has(telemetry.iteration) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      Iteration {telemetry.iteration}
                    </span>
                    {telemetry.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-xs px-2 py-0.5 bg-muted rounded">
                      {telemetry.triggerReason}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{formatDuration(telemetry.duration)}</span>
                    {telemetry.cost !== undefined && (
                      <span>${telemetry.cost.toFixed(3)}</span>
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedIterations.has(telemetry.iteration) && (
                  <div className="px-4 py-3 bg-muted/30 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Started At</span>
                        <p>
                          {new Date(telemetry.startedAt).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration</span>
                        <p>{formatDuration(telemetry.duration)}</p>
                      </div>
                      {telemetry.tokensUsed && (
                        <>
                          <div>
                            <span className="text-muted-foreground">
                              Input Tokens
                            </span>
                            <p>{formatTokens(telemetry.tokensUsed.input)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Output Tokens
                            </span>
                            <p>{formatTokens(telemetry.tokensUsed.output)}</p>
                          </div>
                        </>
                      )}
                      {telemetry.toolsUsed && telemetry.toolsUsed.length > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Tools Used
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {telemetry.toolsUsed.map((tool, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs bg-muted rounded"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {telemetry.outputPreview && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Output Preview
                          </span>
                          <p className="text-xs font-mono bg-muted p-2 rounded mt-1 truncate">
                            {telemetry.outputPreview}
                          </p>
                        </div>
                      )}
                      {telemetry.errorMessage && (
                        <div className="col-span-2">
                          <span className="text-red-500">Error</span>
                          <p className="text-xs font-mono bg-red-500/10 p-2 rounded mt-1 text-red-500">
                            {telemetry.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
