# Authorization & RBAC Architecture

This document describes the design and implementation of the Role-Based Access Control (RBAC) model for the **Club Performance Evaluation and Reporting System**.

---

## 🛡️ Access Control Design

The system enforces authorization strictly on the **server-side** to prevent privilege escalation. Front-end elements are hidden or shown as a convenience to the user, but access is validated during routing and data fetching.

```text
               [ CLIENT REQUEST ]
                       │
                       ▼
            [ Next.js Middleware ] ──(Invalid Role/Session)──► Redirect /unauthorized
                       │
               (Valid Role Path)
                       ▼
            [ Protected Route Layout ]
                       │
            (Loads Server Component)
                       │
                       ▼
            [ Permissions Check API ] ──(Check Fails)──► Throw error / Deny
                       │
               (Require Checks Pass)
                       ▼
              [ Business Action ]
```

---

## 👥 System Roles & Permissions Matrix

The system maps exactly four roles, each resolving to explicit dashboards and action parameters:

| Role | Target Route | Allowed Operations |
| :--- | :--- | :--- |
| **MEMBER** | `/member/*` | Track own tasks, view own evaluations, request club transfers. |
| **DEPARTMENT_LEAD** | `/department-lead/*` | Manage tasks, evaluate and rate assigned members' completions. |
| **CLUB_PRESIDENT** | `/club-president/*` | View club analytics, oversee members, approve transfers. |
| **STUDENT_WELFARE_COUNCIL** | `/swc/*` | Global system read/write, audit clubs, view system reports. |

---

## 🚀 Route Protection Architecture

Authorization is enforced at two distinct server-side checkpoints:

### 1. Route-Level Guards (Next.js Middleware)
The middleware file (`src/middleware.ts`) intercepts requests to protected prefixes and matches them against the user's database-resolved role:
- `/member/*` matches role `MEMBER`
- `/department-lead/*` matches role `DEPARTMENT_LEAD`
- `/club-president/*` matches role `CLUB_PRESIDENT`
- `/swc/*` matches role `STUDENT_WELFARE_COUNCIL`

If a user navigates to an area outside their role, they are redirected to `/unauthorized` or `/login`.

### 2. Action/Data-Level Guards (`src/lib/permissions/index.ts`)
Within Server Components, Route Handlers, and Server Actions, developer-friendly helpers enforce permissions:

*   **`getCurrentUser()`**: Returns the memoized user profile (caching results to avoid redundant database calls during a single render request).
*   **`isAuthenticated()`**: Asserts that a user has a valid active session.
*   **`hasRole(role)`**: Returns `true` if the user matches the target role.
*   **`requireRole(role)`**: Throws an error (`'UNAUTHORIZED'`) if the user doesn't have the specified role, triggering error boundaries or server-side redirects.
*   **`requireAnyRole(roles)`**: Allows action if the user has any of the specified roles.

---

## ⚠️ Important Architectural Rules

1. **Self-Evaluation Prevention**:
   The business logic layer utilizes the database constraint `evaluator_id <> member_id` combined with server-side helper logic. A `MEMBER` is strictly forbidden from writing evaluation records. Only the active `DEPARTMENT_LEAD` of the club matching the task is allowed to write a rating.
2. **Profile Integrity**:
   Roles are resolved strictly by checking `public.users` in the database. Role parameters received from client headers, cookies, or token metadata claims are never trusted blindly, securing the system against token manipulation.
