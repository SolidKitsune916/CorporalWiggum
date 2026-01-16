import type { ProjectConfig } from '../types';
import { FolderGit2, Folder, AlertCircle } from 'lucide-react';

interface HealthIndicatorProps {
  projectConfig: ProjectConfig | null;
  onClick?: () => void;
}

export function HealthIndicator({ projectConfig, onClick }: HealthIndicatorProps) {
  if (!projectConfig) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm">
        <span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Count Ralph files
  const ralphFiles = projectConfig.ralphFiles;
  const fileCount = [
    ralphFiles.agentsMd.exists,
    ralphFiles.claudeMd.exists,
    ralphFiles.implementationPlan.exists,
    ralphFiles.audienceJtbd.exists,
    ralphFiles.prd.exists,
  ].filter(Boolean).length;

  // Determine status
  const hasRequiredFiles = ralphFiles.agentsMd.exists || ralphFiles.claudeMd.exists;
  const allFilesPresent = fileCount === 5;

  const getStatusColor = () => {
    if (allFilesPresent) return 'bg-green-500';
    if (hasRequiredFiles) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusTooltip = () => {
    if (allFilesPresent) return 'All configuration files present';
    if (hasRequiredFiles) return 'Some configuration files missing';
    return 'Missing required configuration files';
  };

  // Truncate path for display
  const truncatePath = (path: string, maxLength: number = 30): string => {
    if (path.length <= maxLength) return path;
    const parts = path.split('/');
    if (parts.length <= 2) return '...' + path.slice(-maxLength);

    // Show first and last parts with ellipsis
    return `.../${parts.slice(-2).join('/')}`;
  };

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm transition-colors group"
      title={getStatusTooltip()}
    >
      {/* Mode Badge */}
      <span
        className={`px-1.5 py-0.5 text-xs rounded ${
          projectConfig.mode === 'embedded'
            ? 'bg-blue-500/10 text-blue-500'
            : 'bg-purple-500/10 text-purple-500'
        }`}
      >
        {projectConfig.mode === 'embedded' ? 'Embedded' : 'Standalone'}
      </span>

      {/* Path */}
      <span className="flex items-center gap-1 text-muted-foreground max-w-[200px] truncate">
        {projectConfig.git.isRepo ? (
          <FolderGit2 className="h-3 w-3 flex-shrink-0" />
        ) : (
          <Folder className="h-3 w-3 flex-shrink-0" />
        )}
        <span className="truncate">{truncatePath(projectConfig.path)}</span>
      </span>

      {/* File Count */}
      <span className="text-muted-foreground">
        ({fileCount}/5 files)
      </span>

      {/* Status Indicator */}
      <span
        className={`h-2 w-2 rounded-full ${getStatusColor()}`}
        title={getStatusTooltip()}
      />

      {/* Warning Icon */}
      {!hasRequiredFiles && (
        <AlertCircle className="h-3 w-3 text-red-500" />
      )}
    </button>
  );
}
