import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Square, Search, Zap, Server } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PortProcess } from '@/types';

interface PortsTabProps {
  portProcesses: PortProcess[];
  portsLoading: boolean;
  portsError: string | null;
  onScanPorts: () => void;
  onKillPort: (pid: number) => void;
}

// Ports commonly used by Ralph Wiggum
const RALPH_PORTS = [3001, 3002, 5173, 5174, 5175];

export function PortsTab({
  portProcesses,
  portsLoading,
  portsError,
  onScanPorts,
  onKillPort,
}: PortsTabProps) {
  const [filter, setFilter] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [confirmKill, setConfirmKill] = useState<number | null>(null);

  // Initial scan and auto-refresh
  useEffect(() => {
    onScanPorts();
  }, [onScanPorts]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      onScanPorts();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, onScanPorts]);

  // Filter processes
  const filteredProcesses = portProcesses.filter((proc) => {
    if (!filter) return true;
    const searchLower = filter.toLowerCase();
    return (
      proc.name.toLowerCase().includes(searchLower) ||
      proc.port.toString().includes(searchLower) ||
      proc.pid.toString().includes(searchLower) ||
      proc.user.toLowerCase().includes(searchLower)
    );
  });

  // Handle kill with confirmation
  const handleKillClick = useCallback((pid: number) => {
    if (confirmKill === pid) {
      onKillPort(pid);
      setConfirmKill(null);
    } else {
      setConfirmKill(pid);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setConfirmKill(null), 3000);
    }
  }, [confirmKill, onKillPort]);

  // Check if port is Ralph-related
  const isRalphPort = (port: number) => RALPH_PORTS.includes(port);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Port Management
            </CardTitle>
            <CardDescription>
              View and manage processes using network ports
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh
              </Label>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onScanPorts}
              disabled={portsLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${portsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by port, process name, or PID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Error display */}
        {portsError && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {portsError}
          </div>
        )}

        {/* Ports table */}
        <ScrollArea className="h-[400px]">
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Port</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Process</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">PID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Protocol</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">State</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">User</th>
                  <th className="px-4 py-2 text-right text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {portsLoading ? 'Scanning ports...' : 'No processes found'}
                    </td>
                  </tr>
                ) : (
                  filteredProcesses.map((proc) => (
                    <tr
                      key={`${proc.pid}-${proc.port}`}
                      className={`border-t hover:bg-muted/30 ${
                        isRalphPort(proc.port) ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{proc.port}</span>
                          {isRalphPort(proc.port) && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Zap className="h-3 w-3" />
                              Ralph
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-sm">{proc.name}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {proc.pid}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs">
                          {proc.protocol}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={proc.state === 'LISTEN' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {proc.state}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-sm text-muted-foreground">{proc.user}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant={confirmKill === proc.pid ? 'destructive' : 'ghost'}
                          size="sm"
                          onClick={() => handleKillClick(proc.pid)}
                          className="gap-1"
                        >
                          <Square className="h-3 w-3" />
                          {confirmKill === proc.pid ? 'Confirm?' : 'Stop'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ScrollArea>

        {/* Summary */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredProcesses.length} process{filteredProcesses.length !== 1 ? 'es' : ''} shown
            {filter && ` (filtered from ${portProcesses.length})`}
          </span>
          <span>
            Ralph ports: {RALPH_PORTS.filter((p) => 
              portProcesses.some((proc) => proc.port === p)
            ).join(', ') || 'None active'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
