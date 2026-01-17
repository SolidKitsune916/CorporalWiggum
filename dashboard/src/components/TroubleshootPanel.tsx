import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Wrench,
  Terminal,
  Clipboard,
  Trash2,
  Loader2,
  AlertCircle,
  Lightbulb,
  Play,
  Square,
  CheckCircle,
} from 'lucide-react';

interface TroubleshootPanelProps {
  onLaunchTroubleshoot: (errorLog: string) => void;
  onCancelTroubleshoot: () => void;
  onClearOutput: () => void;
  isRunning: boolean;
  output: string;
  error: string | null;
}

export function TroubleshootPanel({
  onLaunchTroubleshoot,
  onCancelTroubleshoot,
  onClearOutput,
  isRunning,
  output,
  error,
}: TroubleshootPanelProps) {
  const [errorLog, setErrorLog] = useState('');
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when output changes
  useEffect(() => {
    if (outputEndRef.current && output) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setErrorLog(text);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  }, []);

  // Clear the textarea
  const handleClear = useCallback(() => {
    setErrorLog('');
  }, []);

  // Launch troubleshoot session
  const handleLaunch = useCallback(() => {
    if (errorLog.trim()) {
      onLaunchTroubleshoot(errorLog.trim());
    }
  }, [errorLog, onLaunchTroubleshoot]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Troubleshoot with Claude
            </CardTitle>
            <CardDescription>
              Paste error logs and run Claude CLI to debug and fix issues automatically
            </CardDescription>
          </div>
          {isRunning ? (
            <Badge variant="default" className="gap-1 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running
            </Badge>
          ) : output ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Complete
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Terminal className="h-3 w-3" />
              Ready
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tips section - only show when not running and no output */}
        {!isRunning && !output && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Tips for effective troubleshooting
            </div>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6 list-disc">
              <li>Include the full error message and stack trace</li>
              <li>Include relevant context (what command was run, what you expected)</li>
              <li>The more context you provide, the better Claude can help</li>
            </ul>
          </div>
        )}

        {/* Error log textarea - show when not running and no output */}
        {!isRunning && !output && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Error Log / Stack Trace</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePaste}
                  className="gap-1 h-7"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                  Paste
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={!errorLog}
                  className="gap-1 h-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[200px] rounded-md border">
              <textarea
                value={errorLog}
                onChange={(e) => setErrorLog(e.target.value)}
                placeholder="Paste your error log, stack trace, or describe the issue here...

Example:
Error: Cannot find module './utils'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1077:15)
    at Module._load (node:internal/modules/cjs/loader:922:27)
    ..."
                className="w-full h-[200px] p-3 bg-transparent resize-none font-mono text-sm focus:outline-none"
                spellCheck={false}
              />
            </ScrollArea>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{errorLog.length} characters</span>
              <span>{errorLog.split('\n').length} lines</span>
            </div>
          </div>
        )}

        {/* Output display - show when running or has output */}
        {(isRunning || output) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Claude Output</label>
              {!isRunning && output && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearOutput();
                    setErrorLog('');
                  }}
                  className="gap-1 h-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear & Start Over
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px] rounded-md border bg-muted/30">
              <div className="p-3 font-mono text-sm whitespace-pre-wrap">
                {output || (
                  <span className="text-muted-foreground">
                    Waiting for Claude response...
                  </span>
                )}
                <div ref={outputEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {isRunning
              ? 'Claude is analyzing and fixing the issue...'
              : output
              ? 'Troubleshooting complete'
              : 'Runs Claude CLI with --dangerously-skip-permissions'}
          </p>
          {isRunning ? (
            <Button
              variant="destructive"
              onClick={onCancelTroubleshoot}
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Cancel
            </Button>
          ) : !output ? (
            <Button
              onClick={handleLaunch}
              disabled={!errorLog.trim()}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Run Troubleshoot
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
