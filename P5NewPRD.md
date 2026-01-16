plate option in the dashboard
Recommended Approach: Single Comprehensive Document
Based on analysis of the codebase and your preferences:

Single document output (no separate AUDIENCE_JTBD.md) - your template already includes User Roles section
Markdown only for TypeScript interfaces - kept as documentation, not extracted to files
New template option in the dashboard UI to choose between "Standard PRD" and "Comprehensive PRD"
Implementation Steps
Step 1: Create Comprehensive PRD Prompt Template
File: RalphWiggumV2/PROMPT_prd_comprehensive.md (new file)

Create a new prompt file that:

Takes the same inputs as current PRD generator (productName, problemStatement, targetAudience, keyCapabilities, contextDocs)
Outputs your full 10-section template structure
Uses single delimiter format: ===COMPREHENSIVE_PRD_START=== ... ===COMPREHENSIVE_PRD_END===
Includes instructions for Claude to fill all sections:
Project Overview
Technical Architecture
Data Models & Interfaces
Functional Requirements
User Roles & Access Control
User Interface Specifications
API Specifications
Integration Requirements
Non-Functional Requirements
Glossary
Step 2: Update PRD Generator Backend
File: RalphWiggumV2/dashboard/server/prdGenerator.ts

Changes:

Add comprehensive?: boolean option to PRDGeneratorOptions interface (line 12-19)
Update generatePRD() method to:
Load PROMPT_prd_comprehensive.md when options.comprehensive === true
Handle single-document output parsing for comprehensive mode
Update parseDocuments() method to handle new delimiter format
Return { prd: string; audience: string } where audience is empty string for comprehensive mode (maintains backward compatibility)
Step 3: Update PRD Generator UI Component
File: RalphWiggumV2/dashboard/src/components/PRDGenerator.tsx

Changes:

Add template selector radio buttons:
"Standard PRD" (current behavior)
"Comprehensive PRD" (new template)
Update handleGenerate() to pass comprehensive: true when selected
Update output tabs - show single "PRD.md" tab for comprehensive mode instead of dual tabs
Update help section to explain both template options
Step 4: Update WebSocket Handler
File: RalphWiggumV2/dashboard/server/index.ts

Changes:

Update prd:generate message handler to pass comprehensive option to PRDGenerator
Ensure file save logic handles single-file output (only save PRD.md, skip AUDIENCE_JTBD.md for comprehensive mode)
Step 5: Update Types
File: RalphWiggumV2/dashboard/src/types/index.ts

Add:


interface PRDGenerateOptions {
  productName: string;
  problemStatement: string;
  targetAudience: string;
  keyCapabilities: string[];
  contextDocs?: string[];
  docsOnly?: boolean;
  comprehensive?: boolean;  // NEW
}
Files to Modify
File	Action	Purpose
PROMPT_prd_comprehensive.md	Create	New comprehensive template prompt
dashboard/server/prdGenerator.ts	Modify	Add comprehensive mode support
dashboard/src/components/PRDGenerator.tsx	Modify	Add template selector UI
dashboard/server/index.ts	Modify	Handle comprehensive option in WebSocket
dashboard/src/types/index.ts	Modify	Add comprehensive option type
Template Content Mapping
Your PRD template sections will map to inputs as follows:

Template Section	Source
1. Project Overview	productName, problemStatement
2. Technical Architecture	Inferred from capabilities + contextDocs
3. Data Models & Interfaces	Derived from capabilities
4. Functional Requirements	Derived from keyCapabilities
5. User Roles & Access Control	Derived from targetAudience
6. User Interface Specifications	Derived from capabilities
7. API Specifications	Derived from capabilities
8. Integration Requirements	Inferred from contextDocs
9. Non-Functional Requirements	Standard defaults + context
10. Glossary	Auto-generated from content
Verification Plan
Unit Test: Generate comprehensive PRD with sample inputs, verify all 10 sections are present
UI Test:
Select "Comprehensive PRD" option
Fill in form fields
Click Generate
Verify single PRD.md output (no AUDIENCE tab)
File Save Test: Click "Insert File" and verify only PRD.md is saved (not AUDIENCE_JTBD.md)
Integration Test: Use generated PRD with Plan Generator to ensure it's consumed correctly
Context Test: Verify contextDocs are included in generation when selected
Notes
The comprehensive template is ~400 lines of structure - Claude will expand this to 800-1500 lines of content
This is still context-efficient (~6K tokens, ~3% of Claude's context window)
Existing "Standard PRD" mode remains unchanged for simpler projects
No migration of P0-P4 files needed - they are implementation plans, not PRD templates