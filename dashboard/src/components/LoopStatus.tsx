import type { LoopStatus as LoopStatusType } from '../types';
import {
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
} from 'lucide-react';

interface LoopStatusProps {
  loopStatus: LoopStatusType | null;
}

export function LoopStatus({ loopStatus }: LoopStatusProps) {
  if (!loopStatus) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="font-semibold text-foreground mb-4">Loop Status</h3>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusIcon = () => {
    if (loopStatus.running) {
      return <Activity className="h-5 w-5 text-green-500 animate-pulse" />;
    }
    switch (loopStatus.exitReason) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'max_iterations':
      case 'cost_limit':
      case 'runtime_limit':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      case 'user_stopped':
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (loopStatus.running) {
      return 'Running';
    }
    switch (loopStatus.exitReason) {
      case 'completed':
        return 'Completed';
      case 'max_iterations':
        return 'Max Iterations Reached';
      case 'cost_limit':
        return 'Cost Limit Exceeded';
      case 'runtime_limit':
        return 'Runtime Limit Exceeded';
      case 'user_stopped':
        return 'Stopped by User';
      case 'error':
        return 'Error';
      default:
        return 'Stopped';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="font-semibold text-foreground mb-4">Loop Status</h3>

      <div className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
          </div>
        </div>

        {/* Mode */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Mode</span>
          <span className="font-medium capitalize">{loopStatus.mode}</span>
        </div>

        {/* Iteration */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Iteration</span>
          <span className="font-medium">
            {loopStatus.iteration} / {loopStatus.maxIterations}
          </span>
        </div>

        {/* Elapsed Time */}
        {loopStatus.elapsedTime !== undefined && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Elapsed
            </span>
            <span className="font-medium">
              {formatTime(loopStatus.elapsedTime)}
              {loopStatus.maxRuntime && (
                <span className="text-muted-foreground">
                  {' '}
                  / {formatTime(loopStatus.maxRuntime)}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Consecutive Failures */}
        {loopStatus.consecutiveFailures > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-yellow-500" /> Failures
            </span>
            <span className="font-medium text-yellow-500">
              {loopStatus.consecutiveFailures}
            </span>
          </div>
        )}

        {/* Loop Detection Warning */}
        {loopStatus.loopDetected && (
          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Loop Detected</span>
            </div>
            <p className="text-xs text-yellow-600 mt-1">
              Similar outputs detected. The AI may be stuck in a loop.
            </p>
          </div>
        )}

        {/* Backoff Status */}
        {loopStatus.backoffSeconds !== undefined && loopStatus.backoffSeconds > 0 && (
          <div className="mt-2 p-2 bg-muted rounded">
            <p className="text-sm text-muted-foreground">
              Backing off for {loopStatus.backoffSeconds}s before retry...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
