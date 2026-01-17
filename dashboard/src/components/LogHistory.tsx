import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LogSession } from '@/types';
import {
  History,
  RefreshCw,
  Trash2,
  Eye,
  FileText,
  Clock,
  HardDrive,
  Loader2,
  X,
  Zap,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface LogHistoryProps {
  sessions: LogSession[];
  isLoading: boolean;
  error: string | null;
  onListLogs: () => void;
  onReadLog: (filename: string) => void;
  onDeleteLog: (filename: string) => void;
  onCleanupLogs: (keepDays: number) => void;
  logContent: { filename: string; content: string } | null;
  logContentLoading: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function LogHistory({
  sessions,
  isLoading,
  error,
  onListLogs,
  onReadLog,
  onDeleteLog,
  onCleanupLogs,
  logContent,
  logContentLoading,
}: LogHistoryProps) {
  const [viewingLog, setViewingLog] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [cleanupDays, setCleanupDays] = useState(7);
  const [showCleanup, setShowCleanup] = useState(false);

  // Load logs on mount
  useEffect(() => {
    onListLogs();
  }, [onListLogs]);

  // Handle view log
  const handleView = useCallback((filename: string) => {
    setViewingLog(filename);
    onReadLog(filename);
  }, [onReadLog]);

  // Handle delete with confirmation
  const handleDelete = useCallback((filename: string) => {
    if (confirmDelete === filename) {
      onDeleteLog(filename);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(filename);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  }, [confirmDelete, onDeleteLog]);

  // Handle cleanup
  const handleCleanup = useCallback(() => {
    onCleanupLogs(cleanupDays);
    setShowCleanup(false);
  }, [cleanupDays, onCleanupLogs]);

  // Calculate totals
  const totalSize = sessions.reduce((sum, s) => sum + s.size, 0);
  const activeSession = sessions.find((s) => s.isActive);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Log History
              </CardTitle>
              <CardDescription>
                View and manage logs from previous Ralph sessions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCleanup(!showCleanup)}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Cleanup
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onListLogs}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cleanup panel */}
          {showCleanup && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="cleanup-days">Delete logs older than:</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cleanup-days"
                    type="number"
                    value={cleanupDays}
                    onChange={(e) => setCleanupDays(parseInt(e.target.value) || 7)}
                    min={1}
                    max={365}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {sessions.filter((s) => {
                    const cutoff = new Date();
                    cutoff.setDate(cutoff.getDate() - cleanupDays);
                    return new Date(s.date) < cutoff && !s.isActive;
                  }).length} logs will be deleted
                </span>
                <Button size="sm" onClick={handleCleanup}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clean Up
                </Button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Summary stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-4 w-4" />
              {formatFileSize(totalSize)} total
            </span>
            {activeSession && (
              <Badge variant="secondary" className="gap-1">
                <Zap className="h-3 w-3" />
                Active: {activeSession.filename}
              </Badge>
            )}
          </div>

          {/* Session list */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {isLoading && sessions.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading sessions...
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No session logs found</p>
                  <p className="text-xs">Logs will appear here after running Ralph</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.filename}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      session.isActive ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileText className={`h-4 w-4 shrink-0 ${
                        session.isActive ? 'text-primary' : 'text-muted-foreground'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm truncate">
                            {session.filename}
                          </span>
                          {session.isActive && (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(session.date)}
                          </span>
                          <span>{formatFileSize(session.size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(session.filename)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!session.isActive && (
                        <Button
                          variant={confirmDelete === session.filename ? 'destructive' : 'ghost'}
                          size="sm"
                          onClick={() => handleDelete(session.filename)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Log viewer modal */}
      {viewingLog && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setViewingLog(null)}
        >
          <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h2 className="font-semibold font-mono">{viewingLog}</h2>
                  {logContent?.filename === viewingLog && (
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(logContent.content.length)}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewingLog(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                {logContentLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : logContent?.filename === viewingLog ? (
                  <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                    {logContent.content || 'Empty log file'}
                  </pre>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Failed to load log content
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-end p-4 border-t bg-muted/30 shrink-0">
              <Button variant="outline" onClick={() => setViewingLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
