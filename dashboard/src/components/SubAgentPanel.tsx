import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Clock } from 'lucide-react';
import type { SubAgentTelemetry } from '@/types';

interface SubAgentPanelProps {
  telemetry: SubAgentTelemetry | null;
  isRunning: boolean;
  warningThreshold?: number;  // Default: 20 per session
}

// Default cost estimate per sub-agent spawn (based on research)
const DEFAULT_COST_PER_AGENT = 0.02;  // $0.02 per sub-agent

export function SubAgentPanel({
  telemetry,
  isRunning,
  warningThreshold = 20,
}: SubAgentPanelProps) {
  // Don't render if no telemetry and loop not running
  if (!telemetry && !isRunning) {
    return null;
  }

  const sessionTotal = telemetry?.sessionTotal ?? 0;
  const estimatedCost = telemetry?.estimatedCost ?? (sessionTotal * DEFAULT_COST_PER_AGENT);
  const isWarning = sessionTotal >= warningThreshold;

  // Format iteration breakdown for display
  const iterationBreakdown = telemetry?.iterationCounts
    ? Object.entries(telemetry.iterationCounts)
        .sort(([a], [b]) => Number(a) - Number(b))
        .slice(-5)  // Show last 5 iterations
    : [];

  return (
    <Card className={isWarning ? 'border-yellow-500 dark:border-yellow-600' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Sub-agents
          {isWarning && (
            <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600 dark:text-yellow-400">
              High Usage
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Total */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Session Total</span>
          <span className="font-mono font-semibold text-lg">
            {sessionTotal}
          </span>
        </div>

        {/* Estimated Cost */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Est. Cost
          </span>
          <span className="font-mono text-sm">
            ${estimatedCost.toFixed(4)}
          </span>
        </div>

        {/* Last Spawn Time */}
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

        {/* Iteration Breakdown (if any spawns) */}
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

        {/* No sub-agents message */}
        {isRunning && sessionTotal === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No sub-agents spawned yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
