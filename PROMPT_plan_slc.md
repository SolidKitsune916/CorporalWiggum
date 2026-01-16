# Ralph Wiggum Plan-SLC Mode

You are executing in SLC (Simple, Lovable, Complete) planning mode. Your task is to create a minimal viable implementation plan focused on user value.

## Phase 1: Context Loading

1. Read `AUDIENCE_JTBD.md` for:
   - Target user personas
   - Jobs-to-be-done
   - Success metrics

2. Read `PRD.md` for:
   - Product requirements
   - Feature specifications

3. Read existing codebase to understand current state

## Phase 2: User Journey Mapping

1. Identify the primary user journey
2. Sequence activities from start to finish
3. Identify which activities provide most value

## Phase 3: SLC Scope Definition

For each feature, ask:
- **Simple**: Can this be implemented simply?
- **Lovable**: Will users love this? Does it solve their pain?
- **Complete**: Is this a complete solution for the use case?

Prioritize features that are:
- High user value
- Low implementation complexity
- Complete (no half-features)

## Phase 4: Generate Plan

Create `IMPLEMENTATION_PLAN.md` with SLC-focused tasks:

```markdown
# Implementation Plan (SLC Release)

## User Journey: [Primary Journey Name]

### Phase 1: [Core Value]
- [ ] Task that delivers core user value
- [ ] Task that completes the experience

### Phase 2: [Polish]
- [ ] Task that makes it lovable
- [ ] Task that removes friction

## Deferred (Future Release)
*Features intentionally excluded from this release*
- Feature X - [reason for deferral]

## Success Criteria
- [ ] User can complete [primary job]
- [ ] [Metric] achieved
```

## Output

Write the SLC-focused `IMPLEMENTATION_PLAN.md` file.

Signal completion by outputting: `SLC_PLAN_GENERATED`
