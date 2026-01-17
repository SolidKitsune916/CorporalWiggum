/**
 * SimpleModeChecklist - Setup checklist for Simple mode
 *
 * Shows when switching to Simple mode with missing required files.
 * Guides user through creating/generating missing files.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle,
  Circle,
  FileJson,
  Settings,
  ScrollText,
  Wand2,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { ProjectConfig, PrdJson } from '@/types';

interface SimpleModeChecklistProps {
  isOpen: boolean;
  onClose: () => void;
  projectConfig: ProjectConfig | null;
  // Actions for creating files
  onCreateAgents: () => void;
  onCreateProgress: () => void;
  // Actions for generating stories
  onGenerateStories: () => void;
  isGeneratingStories: boolean;
  storiesComplete: PrdJson | null;
  onSaveStories: (prdJson: PrdJson) => void;
  // Navigate to tabs
  onNavigateToGenerate: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  exists: boolean;
  action?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  alternativeAction?: {
    label: string;
    onClick: () => void;
  };
}

export function SimpleModeChecklist({
  isOpen,
  onClose,
  projectConfig,
  onCreateAgents,
  onCreateProgress,
  onGenerateStories,
  isGeneratingStories,
  storiesComplete,
  onSaveStories,
  onNavigateToGenerate,
}: SimpleModeChecklistProps) {
  const [creatingAgents, setCreatingAgents] = useState(false);
  const [creatingProgress, setCreatingProgress] = useState(false);

  const hasPrdJson = projectConfig?.hasPrdJson ?? false;
  const hasAgents = projectConfig?.hasAgentsMd ?? false;
  const hasProgress = projectConfig?.hasProgressTxt ?? false;
  const hasPrd = projectConfig?.hasPRD ?? false;

  const handleCreateAgents = async () => {
    setCreatingAgents(true);
    await onCreateAgents();
    setCreatingAgents(false);
  };

  const handleCreateProgress = async () => {
    setCreatingProgress(true);
    await onCreateProgress();
    setCreatingProgress(false);
  };

  const handleSaveStories = () => {
    if (storiesComplete) {
      onSaveStories(storiesComplete);
    }
  };

  // Build checklist items
  const items: ChecklistItem[] = [
    {
      id: 'prd-json',
      label: 'prd.json',
      description: 'User stories for Simple mode',
      icon: FileJson,
      exists: hasPrdJson,
      action: hasPrdJson
        ? undefined
        : storiesComplete
        ? {
            label: 'Save Generated Stories',
            onClick: handleSaveStories,
          }
        : hasPrd
        ? {
            label: isGeneratingStories ? 'Generating...' : 'Generate from PRD',
            onClick: onGenerateStories,
            disabled: isGeneratingStories,
            loading: isGeneratingStories,
          }
        : undefined,
      alternativeAction:
        !hasPrdJson && !hasPrd
          ? {
              label: 'Create PRD first',
              onClick: () => {
                onClose();
                onNavigateToGenerate();
              },
            }
          : undefined,
    },
    {
      id: 'agents',
      label: 'AGENTS.md',
      description: 'Build and test commands',
      icon: Settings,
      exists: hasAgents,
      action: hasAgents
        ? undefined
        : {
            label: creatingAgents ? 'Creating...' : 'Create from Template',
            onClick: handleCreateAgents,
            disabled: creatingAgents,
            loading: creatingAgents,
          },
    },
    {
      id: 'progress',
      label: 'progress.txt',
      description: 'Learnings and patterns',
      icon: ScrollText,
      exists: hasProgress,
      action: hasProgress
        ? undefined
        : {
            label: creatingProgress ? 'Creating...' : 'Create from Template',
            onClick: handleCreateProgress,
            disabled: creatingProgress,
            loading: creatingProgress,
          },
    },
  ];

  const allComplete = items.every((item) => item.exists);
  const completeCount = items.filter((item) => item.exists).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Simple Mode Setup
          </DialogTitle>
          <DialogDescription>
            {allComplete
              ? 'All required files are ready. You can now run Ralph in Simple mode.'
              : `${completeCount} of ${items.length} required files found. Create the missing files to run Simple mode.`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3 py-2">
            {items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Info about PRD requirement */}
        {!hasPrdJson && !hasPrd && (
          <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-700 dark:text-yellow-300">
                PRD.md needed first
              </p>
              <p className="text-yellow-600/80 dark:text-yellow-400/80 text-xs mt-0.5">
                To generate prd.json user stories, you need a PRD.md file. Use the PRD Generator
                in the Generate tab to create one.
              </p>
            </div>
          </div>
        )}

        {/* Generated stories preview */}
        {storiesComplete && !hasPrdJson && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  {storiesComplete.userStories.length} stories generated
                </span>
              </div>
              <Button size="sm" onClick={handleSaveStories} className="gap-1">
                Save prd.json
              </Button>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Files will be created in your project directory
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              {allComplete ? 'Done' : 'Close'}
            </Button>
            {allComplete && (
              <Button onClick={onClose} className="gap-1">
                Start Building
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component for checklist item row
interface ChecklistItemRowProps {
  item: ChecklistItem;
}

function ChecklistItemRow({ item }: ChecklistItemRowProps) {
  const Icon = item.icon;

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        item.exists
          ? 'bg-green-500/5 border-green-500/30'
          : 'bg-muted/50 border-border'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${
            item.exists
              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{item.label}</span>
            {item.exists ? (
              <Badge variant="success" className="gap-1 text-xs py-0">
                <CheckCircle className="h-3 w-3" />
                Found
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 text-xs py-0">
                <Circle className="h-3 w-3" />
                Missing
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
      </div>

      {/* Action buttons */}
      {!item.exists && (
        <div className="flex items-center gap-2">
          {item.alternativeAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={item.alternativeAction.onClick}
              className="text-xs"
            >
              {item.alternativeAction.label}
            </Button>
          )}
          {item.action && (
            <Button
              size="sm"
              onClick={item.action.onClick}
              disabled={item.action.disabled}
              className="text-xs gap-1"
            >
              {item.action.loading && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {item.action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
