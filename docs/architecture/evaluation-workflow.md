# Member Work Evaluation Workflow Architecture

This document describes the design, flow, security constraints, and data integrity safeguards implemented for the Member Work Evaluation workflow in the Club Performance Evaluation and Reporting System.

## Evaluation Lifecycle Flowchart

```mermaid
graph TD
    A[Member Submits Task Completion] --> B[Task Completion Stored in DB]
    B --> C[Lead Reviews Pending Queue]
    C --> D{Enforces Club Boundaries?}
    D -- No / Tampered URL -- > E[Render Unauthorized Access]
    D -- Yes / Authorized --> F[Render Evaluation Detail & Form]
    F --> G[Lead Fills 1-5 Rating & Comments]
    G --> H[Lead Confirms Submission Modal]
    H --> I[Execute submitEvaluationAction Server Action]
    I --> J{Validates Role & Club Match?}
    J -- Failed --> K[Abort & Return Error State]
    J -- Passed --> L[Insert Evaluation Record]
    L --> M[Enforce evaluator_not_member DB Check]
    M --> N[Revalidate Cache & Render Evaluation Result]
```

---

## Core Security & Business Rules

### 1. Implicit Evaluator Identification
The evaluator's identity is **never** accepted as an argument from the client interface or request parameters. The system resolves it implicitly from the server session:
- Retrieves authenticated user profile via `requireRole('DEPARTMENT_LEAD')`.
- Binds the resolved `profile.id` directly as `evaluator_id` during data insert.

### 2. Deep Club Isolation (Cross-Club Tamper Prevention)
To prevent ID tampering (e.g. leads modifying task or member UUIDs in browser URLs), every data fetch and evaluation submission performs a secure server-side joint lookup:
- Verifies that the task belongs to the evaluator's managed club (`tasks.club_id === club.id`).
- Verifies that the member is actively enrolled in the evaluator's managed club (`memberships.club_id === club.id` and `memberships.status === 'ACTIVE'`).
- If any check fails, the repository returns `null` or throws `UNAUTHORIZED_TASK`/`UNAUTHORIZED_MEMBER`.

### 3. Self-Evaluation Prevention
Members must never evaluate themselves. This is enforced at two levels:
- **Server Action**: Checks if `evaluatorId === memberId` and aborts with `SELF_EVALUATION_FORBIDDEN`.
- **Database Schema**: Enforced via check constraint `evaluator_not_member` (`CHECK (evaluator_id <> member_id)`).

### 4. Double-Submission / Race Condition Protection
Each completed work can only be evaluated once.
- Enforced via unique constraint on evaluations `(task_id, member_id)`.
- Server actions catch unique constraint violations (PostgreSQL error code `23505`) and propagate a user-friendly error: *"This work has already been evaluated."*

### 5. Historical Record Immutability
Evaluations are treated as permanent, immutable performance records. Once submitted:
- No Update/Edit or Delete actions are exposed or supported.
- The UI warns leads using a confirmation dialog before final submission.
- Once evaluated, detail pages render readonly evaluation metrics and comments.
