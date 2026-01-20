import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { SubAgentTelemetry } from '@/types';

interface SessionSummary {
  total: number;
  estimatedCost: number;
  iterations: number;
  peakIteration?: { iteration: number; count: number };
}

interface SubAgentPanelProps {
  telemetry: SubAgentTelemetry | null;
  isRunning: boolean;
  warningThreshold?: number;
  sessionSummary?: SessionSummary | null;
}

const DEFAULT_COST_PER_AGENT = 0.02;

export function SubAgentPanel({
  telemetry,
  isRunning,
  warningThreshold = 20,
  sessionSummary,
}: SubAgentPanelProps) {
  // Show session summary after loop completes
  const showSummary = !isRunning && sessionSummary && sessionSummary.total > 0;

  // Show live telemetry during running loop
  const showLiveTelemetry = isRunning && telemetry;

  // Don't render if nothing to show
  if (!showLiveTelemetry && !showSummary) {
    return null;
  }

  // Session summary view (after loop completes)
  if (showSummary) {
    return (
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Session Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Sub-agents</span>
            <span className="font-mono font-semibold">{sessionSummary.total}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Est. Cost
            </span>
            <span className="font-mono text-sm">
              ${sessionSummary.estimatedCost.toFixed(4)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Iterations</span>
            <span className="font-mono text-sm">{sessionSummary.iterations}</span>
          </div>

          {sessionSummary.peakIteration && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Peak</span>
              <Badge variant="secondary" className="font-mono text-xs">
                Iter #{sessionSummary.peakIteration.iteration}: {sessionSummary.peakIteration.count}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Live telemetry view (during running loop)
  const sessionTotal = telemetry?.sessionTotal ?? 0;
  const estimatedCost = telemetry?.estimatedCost ?? (sessionTotal * DEFAULT_COST_PER_AGENT);
  const isWarning = sessionTotal >= warningThreshold;

  const iterationBreakdown = telemetry?.iterationCounts
    ? Object.entries(telemetry.iterationCounts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .slice(-5)
    : [];

  return (
    <Card className={isWarning ? 'border-yellow-500 dark:border-yellow-600' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Sub-agents
          {isWarning && (
            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              High Usage
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Session Total</span>
          <span className="font-mono font-semibold text-lg">{sessionTotal}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Est. Cost
          </span>
          <span className="font-mono text-sm">${estimatedCost.toFixed(4)}</span>
        </div>

        {telemetry?.lastSpawnAt && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last Spawn
            </span>
            <span className="text-sm">
              {new Date(telemetry.lastSpawnAt).toLocaleTimeString()}
            </span>
          </div>
        )}

        {iterationBreakdown.length > 0 && (
          <div className="pt-2 border-t">
            <span className="text-xs text-muted-foreground">Recent Iterations</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {iterationBreakdown.map(([iter, count]) => (
                <Badge
                  key={iter}
                  variant={Number(count) >= 5 ? 'destructive' : 'secondary'}
                  className="font-mono text-xs"
                >
                  #{iter}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {isRunning && sessionTotal === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No sub-agents spawned yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
