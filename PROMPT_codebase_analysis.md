You are analyzing a codebase to provide a high-level summary for PRD generation. Your analysis will help inform the creation of new features or enhancements.

## Project Structure Overview

- **Project Name**: ${PROJECT_NAME}
- **Language**: ${LANGUAGE}
- **Framework**: ${FRAMEWORK}
- **Package Manager**: ${PACKAGE_MANAGER}
- **Is Monorepo**: ${IS_MONOREPO}
- **Total Files**: ${FILE_COUNT}

## Key Files

${KEY_FILES}

---

## Task

Analyze this codebase and provide a structured summary that will help inform PRD creation. Focus on:

1. **Understanding the Current State**: What does this project currently do?
2. **Architecture Patterns**: How is the code organized?
3. **Key Components**: What are the main building blocks?
4. **Areas for Enhancement**: Where might new features be added?

---

## Analysis Guidelines

### Summary
- Provide a 2-3 sentence high-level description
- Focus on what the project does, not how it's built
- Mention the primary purpose and target users if apparent

### Key Components
- Identify 3-7 main modules, features, or components
- Focus on functional areas, not just directories
- Note any significant patterns (e.g., "API layer with REST endpoints")

### Architecture Notes
- Describe the overall architecture pattern (monolith, microservices, etc.)
- Note any significant design patterns used
- Mention data flow patterns if apparent

### Suggested Focus Areas
- Identify areas that might need attention or enhancement
- Look for:
  - Missing functionality that might be expected
  - Areas with limited test coverage (if apparent)
  - Potential scalability concerns
  - Integration opportunities
  - UX improvements

---

## Output Format

Respond in EXACTLY this format:

===SUMMARY===
[A 2-3 sentence description of what this project does and its primary purpose. Be specific about functionality, not just technologies.]
===END_SUMMARY===

===KEY_COMPONENTS===
- [Component 1]: [Brief description of what it does]
- [Component 2]: [Brief description of what it does]
- [Component 3]: [Brief description of what it does]
===END_KEY_COMPONENTS===

===ARCHITECTURE_NOTES===
[2-3 sentences describing the architecture pattern, code organization, and any notable design decisions observed in the codebase.]
===END_ARCHITECTURE_NOTES===

===SUGGESTED_FOCUS===
- [Area 1]: [Why this might need attention]
- [Area 2]: [Why this might need attention]
- [Area 3]: [Why this might need attention]
===END_SUGGESTED_FOCUS===

**Rules**:
- Be specific and actionable
- Base observations on actual code, not assumptions
- If something is unclear, say so rather than guessing
- Keep each section concise but informative
