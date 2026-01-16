import { useState } from 'react';
import type { ProjectConfig } from '../../types';
import { FolderGit2, Folder, Edit3, CheckCircle, Info } from 'lucide-react';

interface ProjectPathInfoProps {
  projectConfig: ProjectConfig | null;
  onOverride: (path: string) => void;
  isLoading: boolean;
}

export function ProjectPathInfo({
  projectConfig,
  onOverride,
  isLoading,
}: ProjectPathInfoProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newPath, setNewPath] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleOverride = () => {
    if (newPath.trim()) {
      onOverride(newPath.trim());
      setIsEditing(false);
    }
  };

  if (!projectConfig) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Project Path</h2>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Project Path</h2>
        <p className="text-muted-foreground">
          Confirm the target project directory
        </p>
      </div>

      {/* Current Path Display */}
      <div className="p-4 border border-border rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {projectConfig.git.isRepo ? (
              <FolderGit2 className="h-5 w-5 text-blue-500" />
            ) : (
              <Folder className="h-5 w-5 text-muted-foreground" />
            )}
            <span
              className={`px-2 py-0.5 text-xs rounded ${
                projectConfig.mode === 'embedded'
                  ? 'bg-blue-500/10 text-blue-500'
                  : 'bg-purple-500/10 text-purple-500'
              }`}
            >
              {projectConfig.mode === 'embedded' ? 'Embedded' : 'Standalone'}
            </span>
          </div>
          {!isEditing && (
            <button
              onClick={() => {
                setNewPath(projectConfig.path);
                setIsEditing(true);
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <Edit3 className="h-4 w-4" />
              Override
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder="/path/to/your/project"
              className="w-full px-3 py-2 bg-background border border-input rounded-md font-mono text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleOverride}
                disabled={isLoading || !newPath.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {isLoading ? 'Applying...' : 'Apply'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="font-mono text-sm bg-muted p-2 rounded break-all">
            {projectConfig.path}
          </p>
        )}

        {/* Detection Reason */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Info className="h-4 w-4" />
          {showDetails ? 'Hide details' : 'Why this path?'}
        </button>

        {showDetails && (
          <div className="p-3 bg-muted/50 rounded text-sm space-y-2">
            <p>
              <strong>Detection Reason:</strong>
            </p>
            <p className="text-muted-foreground">
              {projectConfig.detectionReason}
            </p>
            {projectConfig.git.isRepo && (
              <p className="text-muted-foreground">
                Git branch: <code>{projectConfig.git.branch}</code>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ralph Files Status */}
      <div className="p-4 border border-border rounded-lg">
        <h3 className="font-medium mb-3">Ralph Configuration Files</h3>
        <div className="space-y-2">
          <FileStatusRow
            name="AGENTS.md"
            exists={projectConfig.ralphFiles.agentsMd.exists}
            required
          />
          <FileStatusRow
            name="CLAUDE.md"
            exists={projectConfig.ralphFiles.claudeMd.exists}
          />
          <FileStatusRow
            name="IMPLEMENTATION_PLAN.md"
            exists={projectConfig.ralphFiles.implementationPlan.exists}
          />
          <FileStatusRow
            name="AUDIENCE_JTBD.md"
            exists={projectConfig.ralphFiles.audienceJtbd.exists}
          />
          <FileStatusRow
            name="PRD.md"
            exists={projectConfig.ralphFiles.prd.exists}
          />
        </div>
      </div>
    </div>
  );
}

function FileStatusRow({
  name,
  exists,
  required,
}: {
  name: string;
  exists: boolean;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${exists ? 'bg-green-500' : 'bg-red-500'}`}
        />
        <span className="text-sm">{name}</span>
        {required && (
          <span className="text-xs text-muted-foreground">(recommended)</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {exists ? 'Found' : 'Missing'}
      </span>
    </div>
  );
}
