import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PRDVersion, PRDVersionHistory } from '@/types';
import {
  FileText,
  Plus,
  GitBranch,
  Calendar,
  ChevronRight,
  History,
} from 'lucide-react';

interface PRDVersionSelectorProps {
  versionHistory: PRDVersionHistory;
  onStartFresh: () => void;
  onCreateNewVersion: (previousVersions: number[]) => void;
  isLoading?: boolean;
}

export function PRDVersionSelector({
  versionHistory,
  onStartFresh,
  onCreateNewVersion,
  isLoading = false,
}: PRDVersionSelectorProps) {
  const [selectedVersions, setSelectedVersions] = useState<number[]>(() => {
    // Pre-select the latest version by default
    if (versionHistory.versions.length > 0) {
      return [versionHistory.latestVersion];
    }
    return [];
  });

  const hasVersions = versionHistory.versions.length > 0;
  const nextVersion = versionHistory.latestVersion + 1;

  const toggleVersion = (version: number) => {
    setSelectedVersions((prev) =>
      prev.includes(version)
        ? prev.filter((v) => v !== version)
        : [...prev, version]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // If no versions exist, show simple start fresh UI
  if (!hasVersions) {
    return (
      <Card className="border-2 border-dashed">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <CardTitle className="text-xl">Create Your First PRD</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Start an interactive interview to generate a comprehensive Product Requirements Document
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button
            size="lg"
            onClick={onStartFresh}
            disabled={isLoading}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Start PRD Interview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">PRD Versions</CardTitle>
          </div>
          <Badge variant="outline">{versionHistory.versions.length} version{versionHistory.versions.length !== 1 ? 's' : ''}</Badge>
        </div>
        <CardDescription>
          Select previous versions to use as context for your new PRD
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version list */}
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-2">
            {versionHistory.versions.map((version: PRDVersion) => (
              <div
                key={version.version}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${
                  selectedVersions.includes(version.version)
                    ? 'border-primary bg-primary/5'
                    : 'border-border'
                }`}
                onClick={() => toggleVersion(version.version)}
              >
                <Checkbox
                  checked={selectedVersions.includes(version.version)}
                  onCheckedChange={() => toggleVersion(version.version)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {version.version === 0 ? 'PRD.md' : `PRD_v${version.version}.md`}
                    </span>
                    {version.version === versionHistory.latestVersion && (
                      <Badge variant="secondary" className="text-xs">Latest</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {version.description}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(version.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Selected versions summary */}
        {selectedVersions.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
            <GitBranch className="w-4 h-4" />
            <span>
              {selectedVersions.length} version{selectedVersions.length !== 1 ? 's' : ''} selected as context
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onStartFresh}
            disabled={isLoading}
            className="flex-1"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start Fresh (v1)
          </Button>
          <Button
            onClick={() => onCreateNewVersion(selectedVersions)}
            disabled={isLoading}
            className="flex-1"
          >
            Create PRD v{nextVersion}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
