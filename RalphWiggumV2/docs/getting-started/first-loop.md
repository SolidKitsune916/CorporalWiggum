# Your First Loop

This tutorial walks through running your first complete WIGGUM loop from start to finish.

## Scenario

We'll create a simple utility function and its tests to demonstrate the loop workflow.

## Preparation

### 1. Create the Implementation Plan

Create or update `IMPLEMENTATION_PLAN.md`:

```markdown
# Implementation Plan

## Phase 1: Utility Functions

### Task 1: String Utils
- [ ] Create `src/utils/strings.ts` with `capitalize` function
- [ ] Add unit tests for capitalize function
- [ ] Export from `src/utils/index.ts`
```

### 2. Configure AGENTS.md

Ensure your build commands are set:

```markdown
# AGENTS.md

## Validation Commands
- Test: `npm test`
- Lint: `npm run lint`
- Build: `npm run build`
```

### 3. Verify Dashboard Connection

Open the dashboard and confirm the connection is active.

## Running the Loop

### Step 1: Select Build Mode

In the Loop Controls panel:

- Mode: **Build**
- Max Iterations: **5** (more than enough for this task)

### Step 2: Start the Loop

Click **Start Build**. Watch the log viewer for progress:

```
[INFO] Starting loop in build mode
[INFO] Loading IMPLEMENTATION_PLAN.md
[INFO] Found 3 incomplete tasks
[INFO] Starting iteration 1
[INFO] Task: Create src/utils/strings.ts with capitalize function
```

### Step 3: Observe Implementation

The loop will:

1. Create `src/utils/strings.ts`:
```typescript
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
```

2. Run validation:
```
[INFO] Running: npm test
[SUCCESS] Tests passed
[INFO] Running: npm run lint
[SUCCESS] Lint passed
```

3. Commit changes:
```
[INFO] Committing: feat: Add capitalize function
```

4. Update the plan (marking task complete)

### Step 4: Continue to Next Task

The loop automatically proceeds to the next task:

```
[INFO] Starting iteration 2
[INFO] Task: Add unit tests for capitalize function
```

Creating test file:
```typescript
import { describe, it, expect } from 'vitest';
import { capitalize } from './strings';

describe('capitalize', () => {
  it('capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });
});
```

### Step 5: Loop Completion

After all tasks complete:

```
[INFO] Starting iteration 4
[INFO] No incomplete tasks remaining
[SUCCESS] Loop complete after 3 iterations
```

## Reviewing Results

### Git History

Check the commits created:

```bash
git log --oneline -5
```

```
abc1234 feat: Export utilities from index
def5678 feat: Add capitalize function tests
ghi9012 feat: Add capitalize function
```

### Updated Plan

The `IMPLEMENTATION_PLAN.md` now shows:

```markdown
### Task 1: String Utils
- [x] Create `src/utils/strings.ts` with `capitalize` function
- [x] Add unit tests for capitalize function
- [x] Export from `src/utils/index.ts`
```

## Handling Failures

If validation fails, the loop:

1. **Does not commit** the changes
2. **Logs the error** with details
3. **Retries** with adjustments
4. **Continues** to the next task if stuck

Example failure scenario:
```
[INFO] Running: npm test
[ERROR] Test failed: Expected 'hello' to be 'Hello'
[INFO] Analyzing failure...
[INFO] Retrying with fix...
```

## Next Steps

- [Loop Modes](/user-guide/loop-modes) - Learn about Plan modes
- [Safety Controls](/user-guide/safety-controls) - Set iteration limits
- [Troubleshooting](/troubleshooting/common-issues) - Handle common issues
