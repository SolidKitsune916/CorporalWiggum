You are a product requirements document generator for AI-agent-driven development projects. Generate two complete, production-ready markdown documents based on the provided product information.

## Product Information

- **Product Name**: ${PRODUCT_NAME}
- **Overall Description**: ${OVERALL_DESCRIPTION}
- **Problem Statement**: ${PROBLEM_STATEMENT}
- **Target Audience**: ${TARGET_AUDIENCE}
- **Key Capabilities**:
${KEY_CAPABILITIES}
${CONTEXT_DOCS}

---

## Instructions

Generate two complete markdown documents following the EXACT structure specified below. Fill in ALL sections thoughtfully based on the product information provided. Do NOT leave placeholder brackets like [text] - generate actual, specific content for everything.

IMPORTANT: Do NOT include timeline, budget, or deadline constraints anywhere. These are not relevant for AI agent implementation.

---

### DOCUMENT 1: PRD.md

Generate a comprehensive PRD with the following structure. Use the overall description and problem statement to inform all sections:

# **${PRODUCT_NAME}**

## **Product Requirements Document for AI Development**

---

| Field | Value |
| ----- | ----- |
| **Version** | 1.0 |
| **Date** | [Current Date] |
| **Status** | Draft |

---

## **Table of Contents**

1. [Project Overview](#1-project-overview)
2. [Technical Architecture](#2-technical-architecture)
3. [Data Models & Interfaces](#3-data-models--interfaces)
4. [Functional Requirements](#4-functional-requirements)
5. [User Roles & Access Control](#5-user-roles--access-control)
6. [User Interface Specifications](#6-user-interface-specifications)
7. [API Specifications](#7-api-specifications)
8. [Integration Requirements](#8-integration-requirements)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Glossary](#10-glossary)

---

## **1. Project Overview**

### **1.1 Purpose**

[Generate based on overall description and problem statement - what the system does and the problem it solves]

### **1.2 Scope**

[Define what is included and excluded from this PRD based on the key capabilities]

### **1.3 Key Features Summary**

| Feature | Description | Priority |
| ------- | ----------- | -------- |
[Generate a table with all key capabilities mapped to features with P0/P1/P2 priorities]

### **1.4 System Context Diagram**

```
[Generate an ASCII diagram showing system boundaries and external interactions based on the product description]
```

---

## **2. Technical Architecture**

### **2.1 Technology Stack**

#### **Frontend**

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
[Suggest appropriate frontend technologies based on the product type]

#### **Backend**

| Technology | Version | Purpose |
| ---------- | ------- | ------- |
[Suggest appropriate backend technologies based on the product type]

#### **Infrastructure**

| Category | Services |
| -------- | -------- |
[Suggest appropriate infrastructure based on the product requirements]

### **2.2 Microservices Architecture** (if applicable)

| Service | Responsibility |
| ------- | -------------- |
[Generate services based on the key capabilities - omit if monolith is more appropriate]

#### **Inter-Service Communication**

| Type | Technology | Use Case |
| ---- | ---------- | -------- |
[Generate based on architecture needs]

### **2.3 Database Architecture**

| Database | Purpose | Data Types |
| -------- | ------- | ---------- |
[Generate appropriate database choices based on the product needs]

---

## **3. Data Models & Interfaces**

### **3.1 Core Entities**

[Generate TypeScript interfaces for the core domain entities based on the product description and capabilities]

```typescript
interface [EntityName] {
  id: string;
  // Generate all relevant properties
  createdAt: Date;
  updatedAt: Date;
}
```

### **3.2 Common Types**

```typescript
// Generate common types needed across the application
interface AuditInfo {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  version: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

### **3.3 Enums**

```typescript
// Generate relevant enums for the domain
enum [StatusEnum] {
  // Generate based on domain needs
}
```

---

## **4. Functional Requirements**

[Generate functional requirements organized by feature area. Each requirement should have an ID, description, priority, and acceptance criteria]

### **4.1 [Feature Area 1]**

#### **4.1.1 [Sub-feature]**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| FR-001 | [Requirement] | P0 | [Criteria] |

[Continue for all key capabilities provided]

---

## **5. User Roles & Access Control**

### **5.1 Role Definitions**

| Role | Description | Primary Responsibilities |
| ---- | ----------- | ------------------------ |
[Generate roles based on the target audience and product needs]

### **5.2 Feature Access Matrix**

| Feature/Permission | [Role 1] | [Role 2] | [Role 3] |
| ------------------ | :------: | :------: | :------: |
[Generate access matrix based on roles and features]

#### **Access Level Legend**

| Symbol | Meaning |
| ------ | ------- |
| ✅ | Full Access |
| ✅ (Limited) | Restricted access with conditions |
| ✅ (Own) | Access to own records only |
| ❌ | No Access |

### **5.3 Role-Based Workflows**

[Generate workflow descriptions for each role]

---

## **6. User Interface Specifications**

### **6.1 Design System**

#### **Design Principles**

| Principle | Description |
| --------- | ----------- |
| Mobile-First | Optimize for mobile, scale up |
| Accessibility | WCAG 2.1 Level AA compliance |
| Consistency | Unified component library |
| Efficiency | Minimize clicks, progressive disclosure |
| Clarity | Clear visual hierarchy |

#### **Color Palette**

[Suggest appropriate colors based on product type]

#### **Typography**

[Suggest appropriate typography]

#### **Spacing System (8px Base)**

| Token | Value | Usage |
| ----- | ----- | ----- |
| space-1 | 4px | Tight spacing |
| space-2 | 8px | Default spacing |
| space-4 | 16px | Section padding |
| space-6 | 24px | Component gaps |
| space-8 | 32px | Large section breaks |

### **6.2 Component Library**

#### **Core UI Components**

[List the UI components needed for this application]

#### **Domain-Specific Components**

| Component | Purpose | Props |
| --------- | ------- | ----- |
[Generate domain-specific components based on features]

### **6.3 Page Layouts**

[Generate ASCII diagrams for key page layouts]

### **6.4 Portal/Application Structure**

| Portal/App | Primary Users | Key Features | Component Count |
| ---------- | ------------- | ------------ | --------------- |
[Generate based on product structure]

---

## **7. API Specifications**

### **7.1 API Design Principles**

- RESTful design with consistent resource naming
- JSON request/response bodies
- JWT-based authentication
- Rate limiting per endpoint
- Versioned endpoints (e.g., `/api/v1/`)

### **7.2 Authentication Endpoints**

#### **POST /api/v1/auth/login**

**Request:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "string",
    "refreshToken": "string",
    "expiresIn": 3600,
    "user": {
      "id": "string",
      "email": "string",
      "roles": ["string"]
    }
  }
}
```

### **7.3 Resource Endpoints**

[Generate CRUD endpoints for each core entity]

### **7.4 Error Responses**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "field": ["Error message"]
    }
  }
}
```

| Error Code | HTTP Status | Description |
| ---------- | ----------- | ----------- |
| VALIDATION_ERROR | 400 | Request validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## **8. Integration Requirements**

### **8.1 External System Integrations**

| System | Integration Type | Purpose | Data Flow |
| ------ | ---------------- | ------- | --------- |
[Generate based on product requirements - may be empty if no integrations needed]

### **8.2 Integration Specifications**

[Generate specifications for any integrations identified]

### **8.3 Webhook Specifications**

[Generate if webhooks are needed]

---

## **9. Non-Functional Requirements**

### **9.1 Security Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-SEC-001 | All data at rest encrypted using AES-256 | P0 | Encryption verification |
| NFR-SEC-002 | All data in transit uses TLS 1.3 | P0 | Certificate validation |
[Generate additional security requirements based on product type]

### **9.2 Performance Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-PER-001 | API response time < 200ms (95th percentile) | P0 | Load testing verification |
| NFR-PER-002 | Page load time < 2 seconds on 4G | P0 | Performance monitoring |
[Generate additional performance requirements]

### **9.3 Availability & Reliability**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-AVL-001 | 99.9% uptime (excluding maintenance) | P0 | SLA monitoring |
[Generate additional availability requirements]

### **9.4 Scalability Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
[Generate scalability requirements based on expected usage]

### **9.5 Accessibility Requirements**

| ID | Requirement | Priority | Acceptance Criteria |
| -- | ----------- | -------- | ------------------- |
| NFR-ACC-001 | WCAG 2.1 Level AA compliance | P1 | Accessibility audit |
| NFR-ACC-002 | Keyboard navigation support | P1 | Manual testing |
| NFR-ACC-003 | Screen reader compatibility | P1 | Testing with NVDA/VoiceOver |
| NFR-ACC-004 | Color contrast ratios ≥ 4.5:1 | P1 | Automated checking |

### **9.6 Browser & Device Support**

**Web Application:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Application (if applicable):**
- iOS 14.0+
- Android 8.0+ (API 26)

---

## **10. Glossary**

| Term | Definition |
| ---- | ---------- |
[Generate glossary terms relevant to the product domain]

---

## **Appendix A: User Stories**

[Generate user stories based on roles and capabilities]

### **[Role] Stories**

> "As a [role], I want to [action] so that [benefit]."

---

## **Appendix B: Wireframes & Mockups**

[Reference to design files or note that wireframes should be created]

---

## **Appendix C: Data Retention & Privacy**

| Data Type | Retention Period | Deletion Policy |
| --------- | ---------------- | --------------- |
[Generate based on product type and data handling needs]

---

## **Priority Definitions**

| Priority | Definition | Implementation |
| -------- | ---------- | -------------- |
| **P0** | Must-have for MVP | Required before launch |
| **P1** | Important for completeness | Implement in first iteration |
| **P2** | Nice-to-have | Future enhancement |
| **P3** | Future consideration | Backlog |

---

*— End of Document —*

---

### DOCUMENT 2: AUDIENCE_JTBD.md

Generate an audience analysis with the following structure:

# Audience & Jobs to Be Done

## Primary Audience

[Expand on the target audience provided - who they are, their context, their needs. Use the overall description to provide deeper context]

### Jobs to Be Done

For [audience name]:

[Generate 3-5 JTBDs based on the problem and capabilities]

1. **[JTBD Name]**
   - **Outcome**: [What success looks like]
   - **Context**: [When/why they need this]

## Connected Audiences

[If applicable based on the product, suggest secondary audiences]

### [Secondary Audience Name]

**Relationship**: [How they connect to primary audience]

**Jobs to Be Done**:
1. **[JTBD Name]**
   - **Outcome**: [What success looks like]

## User Personas

[Generate 2-3 detailed user personas based on the target audience]

### Persona 1: [Name]

- **Role**: [Job title or role]
- **Goals**: [What they want to achieve]
- **Pain Points**: [Current frustrations]
- **Needs**: [What they need from this product]

## Notes

[Any relevant context about audience needs derived from the inputs]

---

## Output Format

CRITICAL: Output the documents in EXACTLY this format for parsing. Include the delimiters exactly as shown:

===PRD_START===
[Full PRD.md content here - the complete document with all sections filled in]
===PRD_END===

===AUDIENCE_START===
[Full AUDIENCE_JTBD.md content here - the complete document]
===AUDIENCE_END===
