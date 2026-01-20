# Coding Conventions

**Analysis Date:** 2026-01-19

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `Dashboard.tsx`, `LoopControls.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useWebSocket.ts`, `useLauncher.ts`)
- Types: `index.ts` in `types/` directory for centralized type definitions
- UI components: lowercase with `.tsx` extension in `ui/` subdirectory (e.g., `button.tsx`, `card.tsx`)
- Server modules: camelCase with `.ts` extension (e.g., `loopController.ts`, `fileWatcher.ts`)
- Utilities: camelCase with `.ts` extension (e.g., `utils.ts`)

**Functions:**
- React components: PascalCase function declarations
- Hooks: camelCase with `use` prefix (e.g., `useWebSocket`, `useLauncher`)
- Event handlers: camelCase with `handle` prefix (e.g., `handleStart`, `handleTabChange`)
- Callbacks passed as props: camelCase with `on` prefix (e.g., `onStart`, `onStop`, `onChange`)
- Server methods: camelCase (e.g., `sendCommand`, `broadcast`, `start`, `stop`)

**Variables:**
- Local state: camelCase (e.g., `activeTab`, `showOnboarding`, `spawningProjectId`)
- Boolean state: typically prefixed with `is`, `has`, or `show` (e.g., `isLoading`, `hasAgentsMd`, `showSuccess`)
- Constants: UPPER_SNAKE_CASE for module-level constants (e.g., `DEFAULT_WS_PORT`, `HEARTBEAT_INTERVAL_MS`)
- Default values: prefixed with `DEFAULT_` (e.g., `DEFAULT_LOOP_STATUS`, `DEFAULT_TASKS`)

**Types:**
- Interfaces: PascalCase (e.g., `LoopStatus`, `TasksState`, `ProjectConfig`)
- Type aliases: PascalCase (e.g., `LoopMode`, `WorkflowMode`, `LogLevel`)
- Props interfaces: ComponentName + `Props` suffix (e.g., `DashboardProps`, `LoopControlsProps`)
- Return type interfaces: HookName + `Return` suffix (e.g., `UseWebSocketReturn`, `UseLauncherReturn`)

## Code Style

**Formatting:**
- No explicit Prettier config (uses defaults)
- 2-space indentation (inferred from codebase)
- Single quotes for imports
- Trailing commas in multiline structures
- Max line length: soft limit around 100-120 characters

**Linting:**
- ESLint 9.x with flat config at `dashboard/eslint.config.js`
- TypeScript ESLint for type-aware rules
- React Hooks plugin for hooks rules
- React Refresh plugin for Vite HMR

**Key ESLint Rules:**
```javascript
// From dashboard/eslint.config.js
extends: [
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
]
```

## Import Organization

**Order:**
1. React imports (`import { useState, useEffect } from 'react'`)
2. Third-party libraries (`import { toast } from 'sonner'`)
3. Internal components (using `@/` alias)
4. Types (using `import type` syntax)
5. Icons (from `lucide-react`)

**Path Aliases:**
- `@/` maps to `./src/` directory
- Configured in both `vite.config.ts` and `tsconfig.app.json`

**Example Pattern:**
```typescript
import { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { LoopStatus } from './LoopStatus';
import { TaskList } from './TaskList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { LoopStatus, LoopMode } from '@/types';
import { Play, Square, Settings2 } from 'lucide-react';
```

## Error Handling

**Frontend Patterns:**
- Toast notifications for user-facing errors via `sonner` library
- Error state in hooks (e.g., `error: string | null`)
- Loading states paired with error states (e.g., `isLoading`, `error`)
- Try-catch in async operations with error state updates

**Server Patterns:**
- Structured logging with `logger.error()` including context
- WebSocket error messages sent to client with `type: 'error'` or specific error types
- Graceful degradation (e.g., `try/catch` with fallback values)
- Explicit error messages in validation results (e.g., `LoopValidationResult`)

**Error State Pattern:**
```typescript
// Hook pattern
const [error, setError] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState(false);

// Clear error on new operation
setError(null);
setIsLoading(true);

// Catch and set error
try {
  await operation();
} catch (e) {
  setError(e instanceof Error ? e.message : 'Unknown error');
} finally {
  setIsLoading(false);
}
```

## Logging

**Framework:** Custom structured logger at `dashboard/server/lib/logger.ts`

**Patterns:**
- Use `logger.info()` for standard operations
- Use `logger.error()` for errors with context object
- Use `logger.debug()` for development/verbose logging
- Include relevant context as second parameter

**Example:**
```typescript
import { logger } from './lib/logger.js';

logger.info('Server started', { port: 3001 });
logger.error('Failed to connect', { error: err.message });
logger.debug('Processing message', { type: message.type });
```

## Comments

**When to Comment:**
- JSDoc-style comments for exported functions and interfaces
- Inline comments for complex logic or non-obvious behavior
- TODO comments for future improvements (use `TODO:` prefix)
- Section headers in large files using `// ============`

**JSDoc Pattern:**
```typescript
/**
 * useLauncher Hook - State management for Project Launcher
 * Manages projects, instances, and discovery operations
 */
export function useLauncher(url: string = defaultUrl): UseLauncherReturn {
```

**Interface Documentation:**
```typescript
interface LoopControllerOptions {
  projectId?: string;
  maxRuntimeSeconds?: number;
  costLimit?: number;
  completionPromise?: string;
}
```

## Function Design

**Size:**
- Prefer smaller, focused functions
- Large components (like `Dashboard.tsx` at ~743 lines) should be refactored when possible
- Extract repeated logic into custom hooks

**Parameters:**
- Use destructured objects for props
- Provide default values where sensible
- Required props first, optional props last

**Return Values:**
- Hooks return objects with named properties
- Components return JSX
- Server functions return typed results or void

**Example Pattern:**
```typescript
interface LoopControlsProps {
  loopStatus: LoopStatus;
  onStart: (options: { mode: LoopMode; maxIterations?: number; workScope?: string }) => void;
  onStop: () => void;
}

export function LoopControls({ loopStatus, onStart, onStop }: LoopControlsProps) {
```

## Module Design

**Exports:**
- Named exports preferred over default exports for components
- Default export for main App component and logger
- Re-export pattern in `index.ts` files for types

**Barrel Files:**
- `dashboard/src/types/index.ts` centralizes all type exports
- UI components are individually imported (no barrel)

## React Patterns

**Component Structure:**
1. Imports
2. Interface definitions (inline or imported)
3. Component function with destructured props
4. Hooks at top of component
5. Derived state (useMemo)
6. Effects (useEffect)
7. Event handlers
8. Conditional rendering logic
9. JSX return

**State Management:**
- Local state with `useState` for component-specific state
- Custom hooks for shared state (e.g., `useWebSocket`, `useLauncher`)
- WebSocket for real-time state synchronization
- `useMemo` for expensive computed values
- `useCallback` for stable function references

**Accessibility:**
- `AccessibilityProvider` wraps app for screen reader announcements
- ARIA attributes on interactive elements
- Skip-to-content link
- Focus visible styles in CSS
- Reduced motion support via media query

## UI Component Patterns

**shadcn/ui Style:**
- Radix UI primitives as base
- `class-variance-authority` (cva) for variants
- `tailwind-merge` via `cn()` utility for class composition
- `forwardRef` for ref forwarding
- Explicit `displayName` assignment

**Example:**
```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
```

## TypeScript Patterns

**Strict Mode:**
- `strict: true` in tsconfig
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

**Type Imports:**
- Use `import type` for type-only imports
- Centralized types in `src/types/index.ts`

**Nullable Handling:**
- Optional chaining (`?.`) for potentially undefined values
- Nullish coalescing (`??`) for default values
- Explicit null checks before operations

**Example:**
```typescript
const projectId = projectConfig?.projectId || projectConfig?.projectPath;
const hasPrdJson = projectConfig.hasPrdJson ?? false;
```

## Styling Patterns

**Tailwind CSS:**
- Utility-first approach
- Dark mode via `class` strategy
- Custom WIGGUM theme colors in `tailwind.config.js`
- CSS variables for dynamic theming

**cn() Utility:**
```typescript
import { cn } from "@/lib/utils"

// Combines clsx + tailwind-merge
className={cn("base-classes", conditional && "conditional-classes", className)}
```

**Theme Variables:**
```css
/* Light/dark mode via CSS variables */
--background: 240 7% 8%;    /* HSL format */
--primary: 180 100% 45%;    /* Cyan */
```

---

*Convention analysis: 2026-01-19*
