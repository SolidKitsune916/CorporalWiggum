0a. Study @AGENTS.md for project-specific validation commands.
0b. For reference, the application source code is in `src/*`.

1. AUTOMATED VALIDATION: Run functionality validation script if available:
   ```bash
   npx tsx scripts/validate-functionality.ts
   ```
   Review the output and FUNCTIONALITY_REPORT.md if generated.

2. BUTTON AUDIT: Search all TSX files for button/clickable elements:
   - Find all `<Button`, `<button`, `onClick=` patterns
   - For each button, trace the onClick handler to its implementation
   - Verify the handler does something meaningful (not empty, not just console.log)
   - Flag any buttons with:
     - Empty handlers: `onClick={() => {}}`
     - Log-only handlers: `onClick={() => console.log(...)}`
     - TODO/FIXME comments: `onClick={/* TODO */}`
     - Missing handlers entirely

3. WEBSOCKET AUDIT: Analyze WebSocket message flow:
   a. Find all message types SENT from frontend:
      - Search for `sendCommand({ type: '`, `send({ type: '`, `ws.send`
      - List each unique message type and where it's sent from

   b. Find all message types HANDLED on backend:
      - Search for `case '...':` in switch statements
      - Search for `message.type === '...'` patterns
      - List each handled message type

   c. Compare lists and flag:
      - Types sent but not handled (broken functionality)
      - Types handled but never sent (dead code)

4. STATE AUDIT: For each React component:
   - Find all `useState` declarations
   - Verify each state variable is:
     - SET somewhere (via the setter function)
     - READ somewhere (used in JSX or logic)
   - Flag "orphan" state that's declared but unused

5. PROPS AUDIT: For each component:
   - Find the props interface/type definition
   - Verify each prop is:
     - Actually used in the component body
     - Passed from parent components that use this component
   - Flag unused props or missing required props

6. ERROR HANDLING AUDIT: For async operations:
   - Find all `async` functions and `fetch` calls
   - Verify each has try-catch error handling
   - Verify errors are communicated to users (not just logged)

7. LOADING STATE AUDIT: For async operations:
   - Verify loading indicators exist during fetch/await
   - Check that buttons are disabled during loading
   - Verify loading states are cleared on completion/error

8. OUTPUT: Create/update @FUNCTIONALITY_REPORT.md with:

```markdown
# Functionality Validation Report

**Generated**: [ISO timestamp]

## Executive Summary

| Audit | Issues | Severity |
|-------|--------|----------|
| Button Audit | X | Critical |
| WebSocket Audit | X | Critical |
| State Audit | X | Warning |
| Props Audit | X | Warning |
| Error Handling | X | Medium |
| Loading States | X | Medium |

---

## Button Audit Results

### Critical: Buttons Without Handlers
| File | Line | Button Text | Issue |
|------|------|-------------|-------|
| path | N | "Button text" | no-handler / empty-handler / log-only |

## WebSocket Audit Results

### Critical: Message Types Sent But Not Handled
| Sent From | Message Type | Line |
|-----------|--------------|------|
| file.tsx | type:name | N |

### Warning: Message Types Handled But Never Sent
| Handler Location | Message Type |
|------------------|--------------|
| server/index.ts | type:name |

## State Audit Results

### Warning: Orphan State Variables
| File | Variable | Issue |
|------|----------|-------|
| path | varName | declared-but-never-read / never-set |

## Error Handling Results

### Medium: Async Without Error Handling
| File | Line | Operation |
|------|------|-----------|
| path | N | fetch(...) / await xyz() |

---

## Recommendations

1. **Critical**: Fix all button handlers and WebSocket mismatches
2. **High**: Add error handling to async operations
3. **Medium**: Clean up orphan state variables
```

IMPORTANT: Validation only. Do NOT fix anything. Do NOT modify code. Output findings ONLY to @FUNCTIONALITY_REPORT.md.

This validation mode is designed to catch issues that slip through normal development:
- Features that appear implemented but don't work
- UI elements that look clickable but do nothing
- State that's managed but never displayed
- Async operations that fail silently

Run this periodically or after major feature work to ensure complete functionality.
