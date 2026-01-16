import { Zap, Rocket } from 'lucide-react';
import type { WorkflowMode } from '@/types';

interface WorkflowModeToggleProps {
  mode: WorkflowMode;
  onToggle: (mode: WorkflowMode) => void;
  size?: 'sm' | 'md';
}

export function WorkflowModeToggle({ mode, onToggle, size = 'sm' }: WorkflowModeToggleProps) {
  const isSmall = size === 'sm';
  
  return (
    <div className={`flex items-center gap-1 p-1 bg-muted rounded-full ${isSmall ? 'text-xs' : 'text-sm'}`}>
      <button
        onClick={() => onToggle('simple')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
          mode === 'simple'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Simple Mode - Uses prd.json with user stories"
      >
        <Zap className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className="font-medium">Simple</span>
      </button>
      <button
        onClick={() => onToggle('advanced')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
          mode === 'advanced'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        title="Advanced Mode - Uses IMPLEMENTATION_PLAN.md and specs"
      >
        <Rocket className={isSmall ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className="font-medium">Advanced</span>
      </button>
    </div>
  );
}
