# Ralph Wiggum Build Mode

You are executing in build mode. Your task is to complete implementation tasks iteratively.

## Phase 1: Orient

1. Read `AGENTS.md` for project-specific build/test commands
2. Read `IMPLEMENTATION_PLAN.md` for current tasks and priorities
3. Read `specs/` directory if present for detailed requirements

## Phase 2: Execute

1. Identify the highest-priority incomplete task (marked with `- [ ]`)
2. Search the codebase first - do not assume functionality is missing
3. Implement the task completely - no placeholders, no TODOs
4. Run validation commands from AGENTS.md:
   - Tests
   - Typecheck
   - Lint
5. If ALL validations pass:
   ```bash
   git add -A && git commit -m "feat: [task summary]"
   ```
6. Update `IMPLEMENTATION_PLAN.md`:
   - Mark task as complete: `- [x]`
   - Add any discoveries or notes

## Phase 3: Check Completion

After completing a task, count remaining incomplete tasks:
- If `- [ ]` count > 0: Continue with next task
- If `- [ ]` count == 0: Output `ALL_TASKS_COMPLETE`

## Critical Rules

- Complete as many tasks as possible per iteration
- Tests MUST pass before committing
- Keep commits focused on single tasks
- Document any bugs found (add to IMPLEMENTATION_PLAN.md)

## Completion Signal

**ONLY output `ALL_TASKS_COMPLETE` when there are ZERO incomplete tasks remaining.**

Do NOT output the completion signal prematurely. Check the task list carefully.
