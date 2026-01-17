import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge, useActionStatus } from '@/components/ui/status-badge';
import {
  FileText,
  Code,
  Eye,
  Edit,
  Save,
  X,
  Loader2,
  FileJson,
  BookOpen,
  Users,
  Settings,
  ListChecks,
  ScrollText,
} from 'lucide-react';

interface FileEditorProps {
  onReadFile: (filename: string) => void;
  onWriteFile: (filename: string, content: string) => void;
  fileContent: { file: string; content: string } | null;
  isLoading: boolean;
}

// Supported files configuration
const SUPPORTED_FILES = [
  { id: 'prd.json', name: 'User Stories', icon: ListChecks, type: 'json' as const },
  { id: 'IMPLEMENTATION_PLAN.md', name: 'Implementation Plan', icon: FileText, type: 'markdown' as const },
  { id: 'PRD.md', name: 'PRD', icon: BookOpen, type: 'markdown' as const },
  { id: 'AUDIENCE_JTBD.md', name: 'Audience', icon: Users, type: 'markdown' as const },
  { id: 'AGENTS.md', name: 'Agents', icon: Settings, type: 'markdown' as const },
  { id: 'CLAUDE.md', name: 'Claude', icon: Code, type: 'markdown' as const },
  { id: 'progress.txt', name: 'Progress', icon: ScrollText, type: 'text' as const },
  { id: 'README.md', name: 'README', icon: FileText, type: 'markdown' as const },
] as const;

type FileType = 'json' | 'markdown' | 'text';

export function FileEditor({
  onReadFile,
  onWriteFile,
  fileContent,
  isLoading,
}: FileEditorProps) {
  const [activeFile, setActiveFile] = useState<string>(SUPPORTED_FILES[0].id);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveStatus = useActionStatus();

  // Load file when active file changes
  useEffect(() => {
    onReadFile(activeFile);
    setEditMode(false);
    setHasChanges(false);
  }, [activeFile, onReadFile]);

  // Update edited content when file content loads
  useEffect(() => {
    if (fileContent?.file === activeFile) {
      setEditedContent(fileContent.content || '');
      setHasChanges(false);
    }
  }, [fileContent, activeFile]);

  // Handle content changes
  const handleContentChange = useCallback((value: string) => {
    setEditedContent(value);
    setHasChanges(value !== (fileContent?.content || ''));
  }, [fileContent]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      onWriteFile(activeFile, editedContent);
      setHasChanges(false);
      saveStatus.setSuccess();
      // Small delay to show feedback
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      saveStatus.setError();
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedContent(fileContent?.content || '');
    setHasChanges(false);
    setEditMode(false);
  };

  // Get current file config
  const currentFileConfig = SUPPORTED_FILES.find((f) => f.id === activeFile);
  const fileType: FileType = currentFileConfig?.type || 'text';

  // Render view mode content
  const renderViewContent = () => {
    const content = fileContent?.file === activeFile ? fileContent.content : '';

    if (!content) {
      return (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            'File not found or empty'
          )}
        </div>
      );
    }

    if (fileType === 'json') {
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="rounded-lg bg-muted/50 p-4 text-sm overflow-x-auto">
            <code>{JSON.stringify(parsed, null, 2)}</code>
          </pre>
        );
      } catch {
        return (
          <pre className="rounded-lg bg-muted/50 p-4 text-sm overflow-x-auto">
            <code>{content}</code>
          </pre>
        );
      }
    }

    if (fileType === 'markdown') {
      // Simple markdown rendering - split by headers and format
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {content.split('\n').map((line, i) => {
            if (line.startsWith('# ')) {
              return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-lg font-semibold mt-3 mb-2">{line.slice(3)}</h2>;
            }
            if (line.startsWith('### ')) {
              return <h3 key={i} className="text-base font-medium mt-2 mb-1">{line.slice(4)}</h3>;
            }
            if (line.startsWith('- ')) {
              return <li key={i} className="ml-4">{line.slice(2)}</li>;
            }
            if (line.startsWith('```')) {
              return null; // Skip code fence markers
            }
            if (line.trim() === '') {
              return <br key={i} />;
            }
            return <p key={i} className="my-1">{line}</p>;
          })}
        </div>
      );
    }

    // Plain text
    return (
      <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileJson className="h-5 w-5" />
            File Editor
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="secondary" className="text-xs">
                Unsaved changes
              </Badge>
            )}
            {editMode ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save
                </Button>
                <StatusBadge status={saveStatus.status} />
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
                disabled={isLoading || !fileContent?.content}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeFile} onValueChange={setActiveFile}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            {SUPPORTED_FILES.map((file) => {
              const Icon = file.icon;
              return (
                <TabsTrigger
                  key={file.id}
                  value={file.id}
                  className="gap-1.5 text-xs"
                  disabled={hasChanges && activeFile !== file.id}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {file.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SUPPORTED_FILES.map((file) => (
            <TabsContent key={file.id} value={file.id} className="mt-0">
              <div className="rounded-lg border">
                <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {file.id}
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Edit className="h-3 w-3" />
                        Editing
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Eye className="h-3 w-3" />
                        Viewing
                      </Badge>
                    )}
                  </div>
                </div>

                <ScrollArea className="h-[400px]">
                  <div className="p-4">
                    {editMode ? (
                      <textarea
                        value={editedContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="h-[360px] w-full resize-none rounded-md border bg-background p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        spellCheck={false}
                      />
                    ) : (
                      renderViewContent()
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
