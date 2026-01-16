# Simple Mode Build Prompt

You are implementing features from a prd.json file. Each iteration, complete ONE user story.

## Phase 0: Orient (Every Iteration)

1. Read `AGENTS.md` for build/test/typecheck commands
2. Read `prd.json` for user stories and their acceptance criteria
3. Read `progress.txt` for codebase patterns and operational learnings
4. Run `git status` to understand current state

## Phase 1: Select Story

Pick the highest-priority story where `passes: false`:
- Priority 1 stories first
- Check acceptance criteria carefully
- Single story per iteration - no parallelism

## Phase 2: Implement

1. Search existing codebase FIRST - don't assume features are missing
2. Implement to satisfy ALL acceptance criteria
3. No placeholders, no TODOs, no "// TODO: implement later"
4. Handle edge cases and errors appropriately

## Phase 3: Validate

Run validation commands from AGENTS.md:
```bash
# Typecheck (must pass)
npm run typecheck || npx tsc --noEmit

# Tests (should pass)
npm test

# Lint (should pass)
npm run lint
```

## Phase 4: Complete

If all validations pass:

1. **Update prd.json**: Set `passes: true` for the completed story
2. **Update progress.txt**: Add learnings and patterns discovered:
   ```
   ## [Today's Date] - [Story ID]
   - What was implemented: [Brief description]
   - Files changed: [List of files]
   - **Learnings:**
     - [Pattern or gotcha discovered]
     - [Another learning]
   ```
3. **Commit changes**:
   ```bash
   git add -A
   git commit -m "feat: [Story title] - [brief description]"
   ```

## Phase 5: Signal Completion

After implementing a story, check if ALL stories pass:
- If ALL stories have `passes: true` → Output `ALL_TASKS_COMPLETE`
- Otherwise → Exit cleanly for next iteration

## Rules

- ONE story per iteration - no exceptions
- ALWAYS run validation before marking complete
- ALWAYS update progress.txt with learnings
- ALWAYS commit after successful implementation
- Search before implementing - code may already exist
- Read progress.txt patterns to avoid repeating mistakes
