# Loop Modes

R.A.L.P.H. supports several loop modes for different use cases.

## Build Mode

**Command:** `./loop.sh` or `./loop.sh <max_iterations>`

The primary mode for autonomous coding:

1. Reads `IMPLEMENTATION_PLAN.md` for tasks
2. Picks the highest-priority incomplete task
3. Implements the task fully
4. Runs validation (tests, typecheck, lint)
5. Commits changes if validation passes
6. Marks task complete
7. Repeats until all tasks done or max iterations reached

**Best for:**
- Implementing feature tasks
- Bug fixes
- Refactoring work

## Plan Mode

**Command:** `./loop.sh plan`

Generates implementation plans:

1. Reads project context (PRD, codebase)
2. Analyzes requirements
3. Creates detailed task list
4. Outputs to `IMPLEMENTATION_PLAN.md`

**Best for:**
- Starting new features
- Breaking down large changes
- Sprint planning

## Plan-SLC Mode

**Command:** `./loop.sh plan-slc`

SLC (Simple, Lovable, Complete) focused planning:

- Prioritizes user-facing value
- Creates minimal viable tasks
- Focuses on completeness over features

**Best for:**
- MVP development
- User-focused features
- Iterative delivery

## Plan-Work Mode

**Command:** `./loop.sh plan-work "description"`

Scoped planning for specific work:

```bash
./loop.sh plan-work "add dark mode toggle"
```

- Takes a description as input
- Generates focused task list
- Smaller scope than full plan mode

**Best for:**
- Single features
- Quick additions
- Focused changes

## Review Mode

**Command:** `./loop.sh review`

Analyzes code against documentation:

1. Reads `IMPLEMENTATION_PLAN.md` and codebase
2. Verifies claimed-complete tasks
3. Discovers technical debt (TODOs, FIXMEs)
4. Checks spec compliance
5. Outputs report to `REVIEW_REPORT.md`

**Variations:**
- `./loop.sh review` - Full review
- `./loop.sh review-quick` - TODOs/FIXMEs only
- `./loop.sh review-spec <spec.md>` - Against specific spec

**Best for:**
- Quality audits
- Pre-release checks
- Technical debt discovery

## Mode Selection

### From Dashboard

1. Go to **Dashboard** tab
2. Click the **Mode** dropdown in Loop Controls
3. Select desired mode
4. Click **Start**

### Mode Comparison

| Mode | Input | Output | Iterations |
|------|-------|--------|------------|
| Build | IMPLEMENTATION_PLAN.md | Code + Commits | Multiple |
| Plan | PRD + Codebase | IMPLEMENTATION_PLAN.md | 1-3 |
| Plan-SLC | PRD + Codebase | SLC-focused plan | 1-3 |
| Plan-Work | Description | Scoped plan | 1 |
| Review | Code + Docs | REVIEW_REPORT.md | 1 |

## Iteration Limits

Set via:
- CLI: `./loop.sh 10` (10 iterations)
- Dashboard: Max Iterations field
- `0` = unlimited (run until done)

**Recommendations:**
- Build mode: 5-20 iterations
- Plan modes: 1-3 iterations
- Review mode: 1 iteration
