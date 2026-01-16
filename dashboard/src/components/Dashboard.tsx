import { useCallback, useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useLoop } from '../hooks/useLoop';
import { useSetupWizard } from '../hooks/useSetupWizard';
import { LoopControls } from './LoopControls';
import { LoopStatus } from './LoopStatus';
import { TaskList } from './TaskList';
import { LogViewer } from './LogViewer';
import { CostMeter } from './CostMeter';
import { TelemetryPanel } from './TelemetryPanel';
import { HealthIndicator } from './HealthIndicator';
import { UnifiedSetupWizard } from './setup/UnifiedSetupWizard';
import type { WSMessage, Task } from '../types';
import { Wifi, WifiOff, RotateCcw } from 'lucide-react';

const WS_PORT = import.meta.env.VITE_WS_PORT || 3001;
const WS_URL = `ws://localhost:${WS_PORT}`;

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs' | 'telemetry' | 'setup'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  const handleMessage = useCallback((message: WSMessage) => {
    // Route messages to appropriate handlers
    loopHandlers.handleMessage(message);
    setupHandlers.handleMessage(message);

    // Handle task updates
    if (message.type === 'tasks:update') {
      setTasks(message.payload as Task[]);
    }
  }, []);

  const { isConnected, send, reconnect, error: wsError } = useWebSocket({
    url: WS_URL,
    onMessage: handleMessage,
  });

  const loopHandlers = useLoop({
    send,
    isConnected,
  });

  const setupHandlers = useSetupWizard({
    send,
    isConnected,
  });

  // Show setup wizard if not complete and missing Ralph files
  useEffect(() => {
    if (!setupHandlers.isComplete && setupHandlers.missingFiles.length > 0) {
      setShowSetupWizard(true);
    }
  }, [setupHandlers.isComplete, setupHandlers.missingFiles]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'logs', label: 'Logs' },
    { id: 'telemetry', label: 'Telemetry' },
    { id: 'setup', label: 'Setup' },
  ] as const;

  if (showSetupWizard && !setupHandlers.isComplete) {
    return (
      <UnifiedSetupWizard
        {...setupHandlers}
        onComplete={() => {
          setupHandlers.markComplete();
          setShowSetupWizard(false);
        }}
        onSkip={() => setShowSetupWizard(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-foreground">
                Ralph Wiggum V3
              </h1>
              <HealthIndicator
                projectConfig={setupHandlers.projectConfig}
                onClick={() => setActiveTab('setup')}
              />
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-2 text-green-500">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">{wsError || 'Disconnected'}</span>
                  <button
                    onClick={reconnect}
                    className="p-1 hover:bg-muted rounded"
                    title="Reconnect"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Controls & Status */}
            <div className="lg:col-span-1 space-y-6">
              <LoopControls
                loopStatus={loopHandlers.loopStatus}
                onStart={loopHandlers.startLoop}
                onStop={loopHandlers.stopLoop}
                isConnected={isConnected}
              />
              <LoopStatus loopStatus={loopHandlers.loopStatus} />
              <CostMeter costTracker={loopHandlers.costTracker} />
            </div>

            {/* Right Column - Tasks & Logs */}
            <div className="lg:col-span-2 space-y-6">
              <TaskList tasks={tasks} />
              <LogViewer
                logs={loopHandlers.logs}
                onClear={loopHandlers.clearLogs}
                maxHeight="400px"
              />
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <LogViewer
            logs={loopHandlers.logs}
            onClear={loopHandlers.clearLogs}
            maxHeight="calc(100vh - 200px)"
            showSearch
          />
        )}

        {activeTab === 'telemetry' && (
          <TelemetryPanel
            telemetryHistory={loopHandlers.telemetryHistory}
            costTracker={loopHandlers.costTracker}
          />
        )}

        {activeTab === 'setup' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Project Configuration</h2>
              {setupHandlers.projectConfig ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Mode</label>
                    <p className="font-medium capitalize">
                      {setupHandlers.projectConfig.mode}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Project Path
                    </label>
                    <p className="font-mono text-sm">
                      {setupHandlers.projectConfig.path}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      Detection Reason
                    </label>
                    <p className="text-sm">
                      {setupHandlers.projectConfig.detectionReason}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading...</p>
              )}
            </div>

            <button
              onClick={() => setShowSetupWizard(true)}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Run Setup Wizard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
