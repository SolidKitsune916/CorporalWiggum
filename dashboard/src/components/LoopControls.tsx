import { useState } from 'react';
import type { LoopStatus, LoopStartOptions, LoopMode } from '../types';
import { Play, Square, Settings } from 'lucide-react';

interface LoopControlsProps {
  loopStatus: LoopStatus | null;
  onStart: (options: LoopStartOptions) => void;
  onStop: () => void;
  isConnected: boolean;
}

export function LoopControls({
  loopStatus,
  onStart,
  onStop,
  isConnected,
}: LoopControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [options, setOptions] = useState<LoopStartOptions>({
    mode: 'build',
    maxIterations: 100,
    maxRuntime: 14400,
    costLimit: 50,
    completionPromise: 'ALL_TASKS_COMPLETE',
    loopDetectionThreshold: 0.9,
    backoffEnabled: true,
    rollbackOnFailure: true,
    dryRun: false,
  });

  const isRunning = loopStatus?.running ?? false;

  const handleStart = () => {
    onStart(options);
  };

  const modes: { value: LoopMode; label: string }[] = [
    { value: 'build', label: 'Build' },
    { value: 'plan', label: 'Plan' },
    { value: 'plan-slc', label: 'Plan (SLC)' },
    { value: 'plan-work', label: 'Plan (Work)' },
    { value: 'review', label: 'Review' },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Loop Controls</h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="p-1 hover:bg-muted rounded"
          title="Advanced Settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="mb-4">
        <label className="block text-sm text-muted-foreground mb-1">Mode</label>
        <select
          value={options.mode}
          onChange={(e) =>
            setOptions({ ...options, mode: e.target.value as LoopMode })
          }
          disabled={isRunning}
          className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground disabled:opacity-50"
        >
          {modes.map((mode) => (
            <option key={mode.value} value={mode.value}>
              {mode.label}
            </option>
          ))}
        </select>
      </div>

      {/* Basic Options */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Max Iterations
          </label>
          <input
            type="number"
            value={options.maxIterations}
            onChange={(e) =>
              setOptions({ ...options, maxIterations: parseInt(e.target.value) || 100 })
            }
            disabled={isRunning}
            min={1}
            max={1000}
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">
            Cost Limit ($)
          </label>
          <input
            type="number"
            value={options.costLimit}
            onChange={(e) =>
              setOptions({ ...options, costLimit: parseFloat(e.target.value) || 50 })
            }
            disabled={isRunning}
            min={1}
            step={5}
            className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground disabled:opacity-50"
          />
        </div>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="border-t border-border pt-4 mt-4 space-y-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Max Runtime (seconds)
            </label>
            <input
              type="number"
              value={options.maxRuntime}
              onChange={(e) =>
                setOptions({ ...options, maxRuntime: parseInt(e.target.value) || 14400 })
              }
              disabled={isRunning}
              min={60}
              step={60}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.floor((options.maxRuntime || 0) / 3600)}h{' '}
              {Math.floor(((options.maxRuntime || 0) % 3600) / 60)}m
            </p>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Completion Promise
            </label>
            <input
              type="text"
              value={options.completionPromise}
              onChange={(e) =>
                setOptions({ ...options, completionPromise: e.target.value })
              }
              disabled={isRunning}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Loop Detection Threshold
            </label>
            <input
              type="number"
              value={options.loopDetectionThreshold}
              onChange={(e) =>
                setOptions({
                  ...options,
                  loopDetectionThreshold: parseFloat(e.target.value) || 0.9,
                })
              }
              disabled={isRunning}
              min={0}
              max={1}
              step={0.05}
              className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.backoffEnabled}
                onChange={(e) =>
                  setOptions({ ...options, backoffEnabled: e.target.checked })
                }
                disabled={isRunning}
                className="rounded border-input"
              />
              <span className="text-sm">Backoff Enabled</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={options.rollbackOnFailure}
                onChange={(e) =>
                  setOptions({ ...options, rollbackOnFailure: e.target.checked })
                }
                disabled={isRunning}
                className="rounded border-input"
              />
              <span className="text-sm">Rollback on Failure</span>
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.dryRun}
              onChange={(e) =>
                setOptions({ ...options, dryRun: e.target.checked })
              }
              disabled={isRunning}
              className="rounded border-input"
            />
            <span className="text-sm">Dry Run (Preview Only)</span>
          </label>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {isRunning ? (
          <button
            onClick={onStop}
            disabled={!isConnected}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
          >
            <Square className="h-4 w-4" />
            Stop Loop
          </button>
        ) : (
          <button
            onClick={handleStart}
            disabled={!isConnected}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Start Loop
          </button>
        )}
      </div>
    </div>
  );
}
