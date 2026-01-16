import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  LoopStatus,
  LoopStartOptions,
  CostTracker,
  IterationTelemetry,
  WSMessage,
} from '../types';

interface UseLoopOptions {
  send: (message: WSMessage) => void;
  isConnected: boolean;
}

interface UseLoopReturn {
  loopStatus: LoopStatus | null;
  costTracker: CostTracker | null;
  telemetryHistory: IterationTelemetry[];
  logs: string[];
  startLoop: (options: LoopStartOptions) => void;
  stopLoop: () => void;
  clearLogs: () => void;
  handleMessage: (message: WSMessage) => void;
}

const DEFAULT_LOOP_STATUS: LoopStatus = {
  running: false,
  mode: 'build',
  iteration: 0,
  maxIterations: 100,
  consecutiveFailures: 0,
  loopDetected: false,
};

const DEFAULT_COST_TRACKER: CostTracker = {
  totalTokensInput: 0,
  totalTokensOutput: 0,
  totalCost: 0,
  costLimit: 50,
  perIterationCosts: [],
};

export function useLoop({
  send,
  isConnected,
}: UseLoopOptions): UseLoopReturn {
  const [loopStatus, setLoopStatus] = useState<LoopStatus | null>(DEFAULT_LOOP_STATUS);
  const [costTracker, setCostTracker] = useState<CostTracker | null>(DEFAULT_COST_TRACKER);
  const [telemetryHistory, setTelemetryHistory] = useState<IterationTelemetry[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const logsRef = useRef<string[]>([]);

  // Keep logsRef in sync
  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'loop:status':
        setLoopStatus(message.payload as LoopStatus);
        break;

      case 'loop:output': {
        const output = message.payload as { content: string; stream: string };
        const timestamp = new Date().toLocaleTimeString();
        const prefix = output.stream === 'stderr' ? '[ERR]' : '[OUT]';
        const newLog = `${timestamp} ${prefix} ${output.content}`;

        setLogs((prev) => [...prev, newLog]);
        break;
      }

      case 'cost:update':
        setCostTracker(message.payload as CostTracker);
        break;

      case 'telemetry:update': {
        const telemetry = message.payload as IterationTelemetry;
        setTelemetryHistory((prev) => [...prev, telemetry]);
        break;
      }

      case 'telemetry:history':
        setTelemetryHistory(message.payload as IterationTelemetry[]);
        break;
    }
  }, []);

  const startLoop = useCallback(
    (options: LoopStartOptions) => {
      if (!isConnected) {
        console.warn('Cannot start loop: WebSocket not connected');
        return;
      }

      // Reset state
      setTelemetryHistory([]);
      setCostTracker(DEFAULT_COST_TRACKER);

      send({
        type: 'loop:start',
        payload: options,
      });
    },
    [send, isConnected]
  );

  const stopLoop = useCallback(() => {
    if (!isConnected) {
      console.warn('Cannot stop loop: WebSocket not connected');
      return;
    }

    send({ type: 'loop:stop' });
  }, [send, isConnected]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Request initial status when connected
  useEffect(() => {
    if (isConnected) {
      send({ type: 'loop:status' });
    }
  }, [isConnected, send]);

  return {
    loopStatus,
    costTracker,
    telemetryHistory,
    logs,
    startLoop,
    stopLoop,
    clearLogs,
    handleMessage,
  };
}
