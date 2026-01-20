/**
 * GlobalHeader - Shared header component for Launcher and Dashboard views
 * Shows branding, connection status, and active loop count badge
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Play, Home, LayoutDashboard } from 'lucide-react';
import { useLauncherContext } from '@/contexts/LauncherContext';

interface GlobalHeaderProps {
  // Which view we're on (determines which nav button to show)
  currentView: 'launcher' | 'dashboard';
  // Optional: Custom content for the right side (e.g., Dashboard-specific badges)
  rightContent?: React.ReactNode;
}

export function GlobalHeader({ currentView, rightContent }: GlobalHeaderProps) {
  const { connected, activeLoopCount } = useLauncherContext();

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo and title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden bg-primary/10">
              <img
                src="/logo.png"
                alt="Corporal Wiggum Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                <span className="text-primary">Corporal Wiggum</span>
                {currentView === 'launcher' && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">Launcher</span>
                )}
                {currentView === 'dashboard' && (
                  <span className="text-muted-foreground font-normal text-sm ml-2">Codename: R.A.L.P.H.</span>
                )}
              </h1>
              {currentView === 'dashboard' && (
                <p className="text-sm text-muted-foreground italic">
                  Recursive Autonomous Loop for Programming Heuristically
                </p>
              )}
              {currentView === 'launcher' && (
                <p className="text-sm text-muted-foreground">
                  Manage your R.A.L.P.H. projects
                </p>
              )}
            </div>
          </div>

          {/* Right: Status badges and navigation */}
          <div className="flex items-center gap-4">
            {/* View-specific content */}
            {rightContent}

            {/* Navigation button */}
            {currentView === 'launcher' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '?mode=launcher'}
                className="gap-2"
                aria-label="Go to project launcher"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                Launcher
              </Button>
            )}

            {/* Active loops badge - LAUN-04 */}
            {activeLoopCount > 0 && (
              <Badge variant="default" className="gap-1">
                <Play className="h-3 w-3" />
                {activeLoopCount} Running
              </Badge>
            )}

            {/* Connection status */}
            <Badge variant={connected ? 'success' : 'destructive'} className="gap-1">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}
