/**
 * StoriesGenerator - Converts PRD.md to prd.json user stories
 *
 * Reads the existing PRD.md and uses Claude CLI to extract user stories
 * in the prd.json format for Simple mode.
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ListChecks,
  Play,
  Square,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PrdJson, UserStory } from '@/types';

interface StoriesGeneratorProps {
  hasPrd: boolean;
  isGenerating: boolean;
  output: string;
  complete: PrdJson | null;
  error: string | null;
  onGenerate: () => void;
  onCancel: () => void;
  onSave: (prdJson: PrdJson) => void;
  onClear: () => void;
}

export function StoriesGenerator({
  hasPrd,
  isGenerating,
  output,
  complete,
  error,
  onGenerate,
  onCancel,
  onSave,
  onClear,
}: StoriesGeneratorProps) {
  const [showOutput, setShowOutput] = useState(false);
  // Initialize editedStories from complete prop - component is keyed by parent
  // to remount when complete changes, so we can safely use prop as initial value
  const [editedStories, setEditedStories] = useState<PrdJson | null>(complete);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputEndRef.current && output) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  const handleSave = () => {
    if (editedStories) {
      onSave(editedStories);
    }
  };

  const handleClear = () => {
    setEditedStories(null);
    onClear();
  };

  const handleRemoveStory = (storyId: string) => {
    if (editedStories) {
      setEditedStories({
        ...editedStories,
        userStories: editedStories.userStories.filter((s) => s.id !== storyId),
      });
    }
  };

  const handleTogglePasses = (storyId: string) => {
    if (editedStories) {
      setEditedStories({
        ...editedStories,
        userStories: editedStories.userStories.map((s) =>
          s.id === storyId ? { ...s, passes: !s.passes } : s
        ),
      });
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 2:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 3:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              Generate User Stories
            </CardTitle>
            <CardDescription>
              Convert your PRD.md into prd.json user stories for Simple mode
            </CardDescription>
          </div>
          {isGenerating ? (
            <Badge variant="default" className="gap-1 animate-pulse">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating
            </Badge>
          ) : editedStories ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Ready to Save
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <FileText className="h-3 w-3" />
              {hasPrd ? 'Ready' : 'Needs PRD.md'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info message when PRD.md doesn't exist */}
        {!hasPrd && !isGenerating && !editedStories && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            <p className="font-medium mb-2">PRD.md not found</p>
            <p>
              Create a PRD first using the PRD Generator in the Generate tab, or manually
              create a PRD.md file in your project directory.
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Output display (collapsible) */}
        {(isGenerating || output) && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOutput(!showOutput)}
              className="gap-1 h-7 px-2"
            >
              {showOutput ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              {showOutput ? 'Hide' : 'Show'} Claude Output
            </Button>
            {showOutput && (
              <ScrollArea className="h-[150px] rounded-md border bg-muted/30">
                <div className="p-3 font-mono text-xs whitespace-pre-wrap">
                  {output || 'Waiting for response...'}
                  <div ref={outputEndRef} />
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {/* Stories preview/editor */}
        {editedStories && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Generated Stories ({editedStories.userStories.length})
              </h4>
              <span className="text-xs text-muted-foreground">
                Branch: {editedStories.branchName}
              </span>
            </div>
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="p-3 space-y-3">
                {editedStories.userStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    priorityColor={getPriorityColor(story.priority)}
                    onRemove={() => handleRemoveStory(story.id)}
                    onTogglePasses={() => handleTogglePasses(story.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            {isGenerating
              ? 'Claude is extracting user stories from PRD.md...'
              : editedStories
              ? `${editedStories.userStories.length} stories ready to save`
              : 'Generates prd.json from your PRD.md'}
          </p>
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Button variant="destructive" onClick={onCancel} className="gap-2">
                <Square className="h-4 w-4" />
                Cancel
              </Button>
            ) : editedStories ? (
              <>
                <Button variant="outline" onClick={handleClear} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Discard
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save prd.json
                </Button>
              </>
            ) : (
              <Button
                onClick={onGenerate}
                disabled={!hasPrd}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Generate Stories
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component for individual story cards
interface StoryCardProps {
  story: UserStory;
  priorityColor: string;
  onRemove: () => void;
  onTogglePasses: () => void;
}

function StoryCard({ story, priorityColor, onRemove, onTogglePasses }: StoryCardProps) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {story.id}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${priorityColor}`}>
            P{story.priority}
          </span>
          <h5 className="font-medium text-sm truncate">{story.title}</h5>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onTogglePasses}
            className={`h-6 px-2 text-xs ${
              story.passes
                ? 'text-green-600 hover:text-green-700'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {story.passes ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Pass
              </>
            ) : (
              'Pending'
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1 ml-4">
        {story.acceptanceCriteria.map((criterion, i) => (
          <li key={i} className="list-disc">{criterion}</li>
        ))}
      </ul>
      {story.notes && (
        <p className="text-xs text-muted-foreground italic">Note: {story.notes}</p>
      )}
    </div>
  );
}
