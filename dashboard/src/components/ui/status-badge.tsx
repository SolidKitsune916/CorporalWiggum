/* eslint-disable react-refresh/only-export-components -- companion hook pattern for stateful UI */
import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActionStatus = 'idle' | 'success' | 'error';

interface StatusBadgeProps {
  status: ActionStatus;
  className?: string;
  showDuration?: number; // How long to show the badge before calling onReset (ms)
  onReset?: () => void;
}

/**
 * StatusBadge - Shows a checkmark or X icon for action feedback
 *
 * Usage with useActionStatus hook (recommended):
 * const saveStatus = useActionStatus();
 * <Button onClick={() => { save(); saveStatus.setSuccess(); }}>Save</Button>
 * <StatusBadge status={saveStatus.status} />
 *
 * Usage with manual state:
 * const [status, setStatus] = useState<ActionStatus>('idle');
 * <StatusBadge status={status} onReset={() => setStatus('idle')} />
 */
export function StatusBadge({
  status,
  className,
  showDuration = 3000,
  onReset
}: StatusBadgeProps) {
  // Only run timeout for onReset callback if provided
  useEffect(() => {
    if (status !== 'idle' && onReset) {
      const timer = setTimeout(() => onReset(), showDuration);
      return () => clearTimeout(timer);
    }
  }, [status, showDuration, onReset]);

  // Derive visibility directly from status prop - no local state needed
  if (status === 'idle') {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200',
        status === 'success' && 'text-green-600 dark:text-green-400',
        status === 'error' && 'text-red-600 dark:text-red-400',
        className
      )}
    >
      {status === 'success' ? (
        <Check className="h-4 w-4" />
      ) : (
        <X className="h-4 w-4" />
      )}
    </span>
  );
}

/**
 * Hook to manage action status with automatic reset
 */
export function useActionStatus(duration = 3000) {
  const [status, setStatus] = useState<ActionStatus>('idle');

  useEffect(() => {
    if (status !== 'idle') {
      const timer = setTimeout(() => {
        setStatus('idle');
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [status, duration]);

  return {
    status,
    setSuccess: () => setStatus('success'),
    setError: () => setStatus('error'),
    reset: () => setStatus('idle'),
  };
}
