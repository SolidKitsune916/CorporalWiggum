import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { CodebaseAnalysis } from '@/types';
import {
  Code,
  FileText,
  TestTube2,
  Server,
  Lightbulb,
  RefreshCw,
  CheckCircle,
  Layers,
  Target,
} from 'lucide-react';

interface CodebaseAnalysisCardProps {
  analysis: CodebaseAnalysis | null;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export function CodebaseAnalysisCard({
  analysis,
  isAnalyzing,
  onAnalyze,
}: CodebaseAnalysisCardProps) {
  // Loading state
  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            <CardTitle className="text-sm font-medium">Analyzing Codebase...</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No analysis yet
  if (!analysis) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Codebase Analysis</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </div>
          <CardDescription className="text-xs">
            Run analysis to help Claude understand your existing codebase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            className="w-full"
          >
            <Code className="w-4 h-4 mr-2" />
            Analyze Codebase
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show analysis results
  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <CardTitle className="text-sm font-medium">Codebase Analysis</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAnalyze}
            className="h-6 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Re-analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tech stack badges */}
        <div className="flex flex-wrap gap-1.5">
          {analysis.techStack.map((tech, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {tech}
            </Badge>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            <span>{analysis.fileCount} files</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TestTube2 className={`w-3.5 h-3.5 ${analysis.hasTests ? 'text-green-500' : ''}`} />
            <span>{analysis.hasTests ? 'Has tests' : 'No tests'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Server className={`w-3.5 h-3.5 ${analysis.hasApi ? 'text-blue-500' : ''}`} />
            <span>{analysis.hasApi ? 'Has API' : 'No API'}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Layers className="w-3.5 h-3.5" />
            Summary
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Key components */}
        {analysis.keyComponents.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Layers className="w-3.5 h-3.5" />
              Key Components
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5 pl-4">
              {analysis.keyComponents.slice(0, 5).map((component, i) => (
                <li key={i} className="list-disc">{component}</li>
              ))}
              {analysis.keyComponents.length > 5 && (
                <li className="list-none text-muted-foreground/60">
                  +{analysis.keyComponents.length - 5} more...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Suggested focus */}
        {analysis.suggestedFocus.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500">
              <Target className="w-3.5 h-3.5" />
              Suggested Focus Areas
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5 pl-4">
              {analysis.suggestedFocus.slice(0, 3).map((focus, i) => (
                <li key={i} className="list-disc">{focus}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Architecture notes (collapsed/tooltip) */}
        {analysis.architectureNotes && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="font-medium">Architecture:</span>
              <span className="truncate">{analysis.architectureNotes}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
