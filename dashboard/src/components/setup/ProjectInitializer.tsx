import { useState } from 'react';
import { FileText, CheckCircle, Circle, Download } from 'lucide-react';

interface ProjectInitializerProps {
  missingFiles: string[];
  onInitialize: (files: string[]) => void;
  isLoading: boolean;
}

const FILE_DESCRIPTIONS: Record<string, string> = {
  'AGENTS.md': 'Project configuration with build/test commands',
  'CLAUDE.md': 'AI instructions and workflow guidelines',
  'IMPLEMENTATION_PLAN.md': 'Task tracking with prioritized checklist',
  'AUDIENCE_JTBD.md': 'Target audience and jobs-to-be-done definition',
  'PRD.md': 'Product requirements document',
};

export function ProjectInitializer({
  missingFiles,
  onInitialize,
  isLoading,
}: ProjectInitializerProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    new Set(missingFiles)
  );

  const toggleFile = (file: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(file)) {
      newSelected.delete(file);
    } else {
      newSelected.add(file);
    }
    setSelectedFiles(newSelected);
  };

  const handleInitialize = () => {
    const files = Array.from(selectedFiles);
    if (files.length > 0) {
      onInitialize(files);
    }
  };

  if (missingFiles.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold mb-2">Project Initialization</h2>
          <p className="text-muted-foreground">
            Initialize Ralph configuration files in your project
          </p>
        </div>

        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-500 mb-2">
            All Set!
          </h3>
          <p className="text-muted-foreground">
            All recommended Ralph configuration files are already present in your
            project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold mb-2">Project Initialization</h2>
        <p className="text-muted-foreground">
          Create missing Ralph configuration files in your project
        </p>
      </div>

      <div className="space-y-2">
        {missingFiles.map((file) => (
          <button
            key={file}
            onClick={() => toggleFile(file)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              selectedFiles.has(file)
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground'
            }`}
          >
            <div className="mt-0.5">
              {selectedFiles.has(file) ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{file}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {FILE_DESCRIPTIONS[file] || 'Configuration file'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedFiles(new Set(missingFiles))}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Select all
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={() => setSelectedFiles(new Set())}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Deselect all
        </button>
      </div>

      {/* Action Button */}
      <button
        onClick={handleInitialize}
        disabled={selectedFiles.size === 0 || isLoading}
        className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        {isLoading
          ? 'Creating files...'
          : `Create ${selectedFiles.size} file${selectedFiles.size !== 1 ? 's' : ''}`}
      </button>

      <p className="text-xs text-center text-muted-foreground">
        Files will be created from templates. You can edit them afterward.
      </p>
    </div>
  );
}
