/**
 * LauncherHome - Main launcher view for managing multiple projects
 * Displays project cards and provides actions for managing projects/instances
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useLauncher } from '@/hooks/useLauncher';
import { ProjectCard } from './ProjectCard';
import { AddProjectDialog } from './AddProjectDialog';
import { GlobalHeader } from './GlobalHeader';
import { Button } from '@/components/ui/button';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  FolderOpen,
  Loader2,
  CheckCircle,
  X,
} from 'lucide-react';

export function LauncherHome() {
  const {
    projects,
    projectsLoading,
    discoveredProjects,
    discovering,
    browseResult,
    browsing,
    lastInitResult,
    error,
    listProjects,
    addProject,
    removeProject,
    initializeProject,
    spawnInstance,
    stopInstance,
    discoverProjects,
    browseDirectory,
    clearError,
    clearInitResult,
    getInstanceForProject,
    isInstanceRunning,
  } = useLauncher();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [spawningProjectId, setSpawningProjectId] = useState<string | null>(null);
  const [initializingProjectId, setInitializingProjectId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  // Track spawning state per project to prevent double-spawns
  const spawningRef = useRef<Set<string>>(new Set());

  // Derive success message from lastInitResult - no setState needed
  const successMessage = useMemo(() => {
    if (!lastInitResult || lastInitResult.created.length === 0) return null;
    const project = projects.find(p => p.id === lastInitResult.projectId);
    const projectName = project?.name || 'Project';
    return `Created ${lastInitResult.created.join(', ')} in ${projectName}`;
  }, [lastInitResult, projects]);

  // Handle side effects when init completes: clear initializing state and auto-hide message
  useEffect(() => {
    if (lastInitResult && lastInitResult.created.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: respond to external result
      setInitializingProjectId(null);
      setShowSuccess(true);
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccess(false);
        clearInitResult();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastInitResult, clearInitResult]);

  const handleOpenDashboard = async (projectId: string) => {
    // Prevent double-spawns
    if (spawningRef.current.has(projectId) || isInstanceRunning(projectId)) {
      return;
    }

    spawningRef.current.add(projectId);
    setSpawningProjectId(projectId);
    
    try {
      spawnInstance(projectId);
      // The instance spawner will open the browser tab when ready
      // We wait a bit and then clear the spawning state
      setTimeout(() => {
        setSpawningProjectId(null);
        spawningRef.current.delete(projectId);
        const instance = getInstanceForProject(projectId);
        if (instance) {
          const currentPort = window.location.port || '5173';
          window.open(`http://localhost:${currentPort}?backend=${instance.backendPort}`, '_blank');
        }
      }, 3000);
    } catch {
      spawningRef.current.delete(projectId);
      setSpawningProjectId(null);
    }
  };

  const handleStartInstance = async (projectId: string) => {
    // Prevent double-spawns - check if already spawning or running
    if (spawningRef.current.has(projectId) || isInstanceRunning(projectId)) {
      console.log(`[Launcher] Skipping spawn for ${projectId} - already spawning or running`);
      return;
    }

    spawningRef.current.add(projectId);
    setSpawningProjectId(projectId);

    try {
      spawnInstance(projectId);
      // Clear spawning state after a delay (will be cleared earlier if instance spawns successfully)
      setTimeout(() => {
        setSpawningProjectId(null);
        spawningRef.current.delete(projectId);
      }, 5000);
    } catch {
      spawningRef.current.delete(projectId);
      setSpawningProjectId(null);
    }
  };

  const handleStopInstance = (projectId: string) => {
    stopInstance(projectId);
  };

  const handleRemoveProject = (projectId: string) => {
    if (confirm('Are you sure you want to remove this project from the launcher?')) {
      removeProject(projectId);
    }
  };

  const handleAddProject = (path: string) => {
    addProject(path);
    setIsAddDialogOpen(false);
  };

  const handleInitialize = (projectId: string) => {
    setInitializingProjectId(projectId);
    initializeProject(projectId);
  };

  const totalCount = projects.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <GlobalHeader
        currentView="launcher"
        rightContent={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={listProjects}
              disabled={projectsLoading}
            >
              {projectsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/15 border-b border-destructive/30">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner (for init results) */}
      {showSuccess && successMessage && (
        <div className="bg-green-500/15 border-b border-green-500/30">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">{successMessage}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setShowSuccess(false); clearInitResult(); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {totalCount === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Add your first project to start managing WIGGUM loops across
              multiple codebases.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Project
            </Button>
          </div>
        ) : (
          /* Project Grid */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => {
              const instance = getInstanceForProject(project.id);
              const isSpawning = spawningProjectId === project.id;
              const isProjectInitializing = initializingProjectId === project.id;

              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  instance={instance}
                  isSpawning={isSpawning}
                  isInitializing={isProjectInitializing}
                  onOpenDashboard={handleOpenDashboard}
                  onStartInstance={handleStartInstance}
                  onStopInstance={handleStopInstance}
                  onRemoveProject={handleRemoveProject}
                  onInitialize={handleInitialize}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Add Project Dialog */}
      <AddProjectDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAddProject={handleAddProject}
        discoveredProjects={discoveredProjects}
        isDiscovering={discovering}
        onDiscover={discoverProjects}
        browseResult={browseResult}
        isBrowsing={browsing}
        onBrowse={browseDirectory}
      />
    </div>
  );
}
