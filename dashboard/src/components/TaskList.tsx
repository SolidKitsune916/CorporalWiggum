import type { Task } from '../types';
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: number) => {
    const colors: Record<number, string> = {
      1: 'bg-red-500/10 text-red-500',
      2: 'bg-yellow-500/10 text-yellow-500',
      3: 'bg-blue-500/10 text-blue-500',
    };
    return (
      <span
        className={`px-1.5 py-0.5 text-xs rounded ${colors[priority] || 'bg-muted text-muted-foreground'}`}
      >
        P{priority}
      </span>
    );
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Tasks</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount} / {totalCount} complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No tasks loaded. Run the loop to load tasks from IMPLEMENTATION_PLAN.md
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-start gap-2 p-2 rounded ${
                task.status === 'in_progress'
                  ? 'bg-blue-500/5 border border-blue-500/20'
                  : task.status === 'completed'
                    ? 'bg-green-500/5'
                    : task.status === 'failed'
                      ? 'bg-red-500/5'
                      : 'bg-muted/50'
              }`}
            >
              <div className="mt-0.5">{getStatusIcon(task.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm ${
                      task.status === 'completed'
                        ? 'line-through text-muted-foreground'
                        : ''
                    }`}
                  >
                    {task.title}
                  </span>
                  {getPriorityBadge(task.priority)}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
