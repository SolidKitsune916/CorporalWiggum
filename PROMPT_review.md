# Ralph Wiggum Review Mode

You are executing in code review mode. Your task is to analyze the codebase against documentation and identify gaps, issues, and recommendations.

## Phase 1: Verification

Compare documentation claims against implementation:

1. Read `PRD.md` - what features are claimed?
2. Read `IMPLEMENTATION_PLAN.md` - what tasks are marked complete?
3. Verify each claim by examining the actual code

For each claimed feature:
- Does the implementation exist?
- Is it complete or partial?
- Does it match the specification?

## Phase 2: Discovery

Identify undocumented functionality:

1. Scan the codebase for features not in documentation
2. Check for deprecated or unused code
3. Identify technical debt

## Phase 3: Health Assessment

Calculate health metrics:

```
Health Score = (Completed Tasks / Total Tasks) × 100
```

Assess:
- Test coverage (are tests comprehensive?)
- Type safety (any `any` types or missing types?)
- Code quality (linting issues, code smells?)
- Documentation accuracy

## Phase 4: Generate Report

Output a structured review:

```markdown
# Code Review Report

## Summary
- Health Score: [X]%
- Features Verified: [N] of [M]
- Issues Found: [count]

## Verification Results

### Implemented ✅
- Feature 1: Complete and matches spec
- Feature 2: Complete and matches spec

### Partial ⚠️
- Feature 3: Missing [specific functionality]
- Feature 4: Tests incomplete

### Not Found ❌
- Feature 5: Claimed but not implemented

## Technical Debt

1. [Issue description] - [severity]
2. [Issue description] - [severity]

## Missing Test Coverage

- [Component/feature] lacks tests
- [Edge case] not covered

## Recommendations

1. **Priority 1**: [Specific action]
2. **Priority 2**: [Specific action]
3. **Priority 3**: [Specific action]

## Discrepancies

| Document | Claims | Actual |
|----------|--------|--------|
| PRD.md   | [claim] | [reality] |
```

## Output

Generate the review report and output it.

Signal completion by outputting: `REVIEW_COMPLETE`
