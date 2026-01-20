# Codebase Concerns

**Analysis Date:** 2026-01-19

## Tech Debt

**Unimplemented LLM Review Feature:**
- Issue: `createReview()` function is a placeholder that throws error
- Files: `src/lib/llm-review.ts`
- Impact: Feature Set 13 (LLM-as-Judge) cannot perform actual LLM evaluations; throws "LLM review not implemented"
- Fix approach: Implement actual API calls to OpenAI/Anthropic/Gemini with proper error handling and multimodal support

**External Repos State Management Incomplete:**
- Issue: TODO comment indicates external repos state should be moved to useWebSocket hook
- Files: `dashboard/src/components/Dashboard.tsx:242-244`
- Impact: State duplication risk, harder to maintain consistent state across components
- Fix approach: Migrate external repos state and message handling to `dashboard/src/hooks/useWebSocket.ts`

**Legacy PRD Migration Path:**
- Issue: System detects legacy unversioned PRD.md but only suggests migration
- Files: `dashboard/server/prdSessionManager.ts:296-312`
- Impact: Users with legacy PRDs must manually handle version migration
- Fix approach: Implement automated migration of legacy PRD.md to versioned system (prd-v1.md)

## Known Bugs

**None explicitly documented in code.**

Common patterns that could indicate latent bugs:
- Empty catch blocks with only logging in several locations
- Reconnection timeouts hardcoded at 2 seconds across multiple WebSocket hooks

## Security Considerations

**Path Traversal Protection:**
- Risk: Directory traversal attacks via docs:read endpoint
- Files: `dashboard/server/index.ts:386-398`
- Current mitigation: Validation in place - rejects absolute paths and verifies resolved path starts with project root
- Recommendations: Current protection is adequate; consider adding rate limiting

**GitHub Token Handling:**
- Risk: Token exposure in memory
- Files: `dashboard/src/components/setup/ExternalReposConfig.tsx`, `dashboard/server/externalRepos/mcpConfigManager.ts`
- Current mitigation: Token masked in UI, transmitted over WebSocket to server
- Recommendations: Tokens are stored in MCP config (~/.config/claude/mcp.json) - ensure file permissions are restrictive

**Environment Variable Fallback for Tokens:**
- Risk: Multiple environment variables checked for GitHub token
- Files: `dashboard/server/externalRepos/fetcher.ts:75`, `dashboard/server/externalRepos/mcpConfigManager.ts:29`
- Current mitigation: Standard practice, but GITHUB_TOKEN takes precedence
- Recommendations: Document the priority order clearly; prefer GITHUB_PERSONAL_ACCESS_TOKEN

## Performance Bottlenecks

**Large Server Index File:**
- Problem: Single monolithic WebSocket handler file
- Files: `dashboard/server/index.ts` (1883 lines)
- Cause: All WebSocket message handling in one giant switch statement
- Improvement path: Extract message handlers into separate modules by feature domain (launcher, external-repos, prd, etc.)

**Large Type Definition File:**
- Problem: All types in single file
- Files: `dashboard/src/types/index.ts` (1921 lines)
- Cause: Accumulation of types without modularization
- Improvement path: Split into domain-specific type files (launcher.types.ts, prd.types.ts, etc.)

**Large WebSocket Hook:**
- Problem: Single hook managing 50+ state variables
- Files: `dashboard/src/hooks/useWebSocket.ts` (1611 lines)
- Cause: All WebSocket state and handlers in one hook
- Improvement path: Split into feature-specific hooks (usePrdWebSocket, useLauncherWebSocket, etc.)

**Log Retention:**
- Problem: Frontend keeps last 500 logs in memory
- Files: `dashboard/src/hooks/useWebSocket.ts:425`
- Cause: Logs accumulate during long sessions
- Improvement path: Consider virtualized list or log rotation with on-demand loading

## Fragile Areas

**Instance Spawner Timeout Logic:**
- Files: `dashboard/server/instanceSpawner.ts:139-159`
- Why fragile: 45-second hardcoded timeout; complex startup detection with sleep loops
- Safe modification: Increase timeout, but root cause is spawn process timing
- Test coverage: No unit tests for spawner module

**WebSocket Reconnection Logic:**
- Files: `dashboard/src/hooks/useWebSocket.ts:361-370`, `dashboard/src/hooks/useLauncher.ts:126-129`
- Why fragile: Identical reconnection patterns duplicated; 2-second hardcoded timeout
- Safe modification: Extract to shared utility
- Test coverage: Only mock WebSocket tests, no real connection tests

**Session Recovery After Browser Refresh:**
- Files: `dashboard/server/index.ts:233-281`
- Why fragile: Depends on process.kill(pid, 0) working correctly across platforms
- Safe modification: Test thoroughly on Windows/Mac/Linux
- Test coverage: Basic integration test exists but doesn't cover edge cases

## Scaling Limits

**Single-Instance Architecture:**
- Current capacity: One dashboard server per project
- Limit: Each project requires its own spawned server instance
- Scaling path: Port allocation limited to range 3100-3199 (100 concurrent instances max)

**SQLite Database:**
- Current capacity: Single file database
- Limit: Concurrent writes may cause lock contention under heavy load
- Scaling path: Adequate for single-user tool; would need migration for multi-user

**WebSocket Broadcast Pattern:**
- Current capacity: Broadcasts to all connected clients
- Limit: No per-client filtering or message queuing
- Scaling path: Adequate for typical use; add client-specific channels if needed

## Dependencies at Risk

**No critical deprecated dependencies detected.**

General observations:
- Heavy reliance on `lucide-react` for icons (large bundle)
- OpenTelemetry packages duplicated across node_modules (version fragmentation)

## Missing Critical Features

**Unit Test Coverage Gap:**
- Problem: Only 1 integration test file and 1 E2E test file found
- Blocks: Confident refactoring of server-side code
- Files: `dashboard/tests/integration/ws-handlers.test.ts`, `dashboard/tests/e2e/dashboard.spec.ts`

**Error Boundary Missing:**
- Problem: No React error boundary components detected
- Blocks: Graceful error recovery in UI
- Priority: Medium - unhandled errors crash entire UI

## Test Coverage Gaps

**Server-Side Code:**
- What's not tested: Most of `dashboard/server/*.ts` files have no unit tests
- Files: `dashboard/server/loopController.ts`, `dashboard/server/instanceSpawner.ts`, `dashboard/server/prdGenerator.ts`, etc.
- Risk: Refactoring server code could introduce regressions
- Priority: High - critical business logic

**React Components:**
- What's not tested: No component unit tests found
- Files: `dashboard/src/components/*.tsx`
- Risk: UI behavior changes not caught automatically
- Priority: Medium

**Hook Logic:**
- What's not tested: Complex state management in hooks
- Files: `dashboard/src/hooks/useWebSocket.ts`, `dashboard/src/hooks/useLauncher.ts`
- Risk: WebSocket message handling regressions
- Priority: Medium

**E2E Test Brittleness:**
- What's not tested: Tests use `waitForTimeout` instead of proper wait conditions
- Files: `dashboard/tests/e2e/dashboard.spec.ts:15,38,67,101`
- Risk: Flaky tests in CI environments
- Priority: Low - tests exist but could be more robust

---

*Concerns audit: 2026-01-19*
