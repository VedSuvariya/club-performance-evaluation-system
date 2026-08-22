# Department Lead Workflow Architecture

This document describes the architecture, security isolation principles, database repository design, and UI layouts implemented to support the **Department Lead** roles within the Club Performance Evaluation and Reporting System.

---

## 🏗️ 1. Core Workflow Overview

The Department Lead workflow manages club-level operational duties. A user with the role of `DEPARTMENT_LEAD` can:
1. View their club overview dashboard with live member counts, active assignments, and pending completions.
2. List all active members belonging to their club and view individual member performance metrics.
3. Publish new tasks for their club.
4. Assign tasks to one or more members of their club.
5. Review completed tasks submitted by members in a secure evaluation queue.

---

## 🔒 2. Security Architecture & Club Isolation

Strict role-based access control (RBAC) and row-level data boundaries are enforced at the server-action and repository levels:

### A. Implicit Context Resolution
To prevent **ID-tampering** and **broken object-level authorization (BOLA)**, all queries implicitly resolve the active club by inspecting the authenticated session's user ID:
* The client is never trusted to supply a `clubId` parameter.
* The server resolves the club via the relationship: `clubs.department_lead_id === authenticated_user_id`.
* If a department lead is not assigned to any club, they are barred from performing database CRUD.

### B. Action Boundaries
All mutations (task creation, assignment) perform server-side checks:
* Task creation assigns the resolved `clubId` to the task record.
* Task assignment verifies that both the target task and all target member IDs belong to the resolved `clubId`. If there is a mismatch, the operation throws an error and rolls back.
* Prevention of duplicate assignments filters out members already assigned to the target task.

---

## 🗄️ 3. Repository Layer Design

Data access helpers are centralized in `src/lib/database/department-lead.ts`:

* **`getLeadClub(leadUserId: string)`**: Returns the club managed by the user.
* **`getClubMembersWithStats(clubId: string)`**: Resolves all active club memberships, mapping member user details and counting active/completed/pending assignments.
* **`createTaskForClub(clubId: string, leadUserId: string, ...)`**: Securely inserts a new task.
* **`assignTaskToMembers(clubId: string, taskId: string, memberIds: string[])`**: Atomic transaction ensuring that only members of `clubId` are assigned.
* **`getClubCompletions(clubId: string)`**: Fetches all submissions from members of the club, returning notes, task metadata, and completion timestamps.

---

## 💻 4. UI Layout & Dynamic Views

The UI is constructed using our unified CSS variables design system:

* **Dashboard Page (`/department-lead/page.tsx`)**: Displays live metrics cards, completion performance trend graphs, quick action links, and a table of the 5 most recent member submissions.
* **Members Listing (`/department-lead/members/page.tsx`)**: Lists all department members with their task performance metrics (Completed vs Pending assignments).
* **Member Profiles (`/department-lead/members/[memberId]/page.tsx`)**: Deep-dive profile view for checking a single member's task completions and notes.
* **Task Management (`/department-lead/tasks/page.tsx`)**: Contains form inputs and modals to create tasks and assign them to members.
* **Review Queue (`/department-lead/evaluations/page.tsx`)**: Allows reviewing completed work notes, with evaluation features locked until Step 8.
