/**
 * LauncherContext - Global state for launcher data accessible from any page
 * Provides active loop count visible in header from both Launcher and Dashboard views
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLauncher } from '@/hooks/useLauncher';
import type { LauncherInstance, LauncherProject } from '@/types';

interface LauncherContextValue {
  // Connection state
  connected: boolean;

  // Active loop count (for header badge)
  activeLoopCount: number;

  // Running projects info (for quick access)
  runningProjects: Array<{
    projectId: string;
    projectName: string;
    mode?: string;
  }>;

  // Full data access (for views that need it)
  projects: LauncherProject[];
  instances: LauncherInstance[];

  // Actions
  refreshProjects: () => void;
  refreshInstances: () => void;
}

const LauncherContext = createContext<LauncherContextValue | null>(null);

interface LauncherProviderProps {
  children: ReactNode;
}

export function LauncherProvider({ children }: LauncherProviderProps) {
  const {
    connected,
    projects,
    instances,
    listProjects,
    listInstances,
  } = useLauncher();

  const value = useMemo<LauncherContextValue>(() => ({
    connected,
    activeLoopCount: instances.length,
    runningProjects: instances.map(instance => {
      const project = projects.find(p => p.id === instance.projectId);
      return {
        projectId: instance.projectId,
        projectName: project?.name || 'Unknown',
        mode: instance.loopStatus?.mode,
      };
    }),
    projects,
    instances,
    refreshProjects: listProjects,
    refreshInstances: listInstances,
  }), [connected, projects, instances, listProjects, listInstances]);

  return (
    <LauncherContext.Provider value={value}>
      {children}
    </LauncherContext.Provider>
  );
}

export function useLauncherContext(): LauncherContextValue {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncherContext must be used within a LauncherProvider');
  }
  return context;
}

// Optional hook that doesn't throw if outside provider (for gradual adoption)
export function useLauncherContextOptional(): LauncherContextValue | null {
  return useContext(LauncherContext);
}
