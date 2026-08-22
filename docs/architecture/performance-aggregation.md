# Performance Aggregation Architecture

This document describes the design and implementation details of the performance aggregation system for the Club Performance Evaluation and Reporting System.

## Architectural Objectives

1. **Security & Data Isolation**: Access boundaries are strictly enforced. Department Leads can only fetch performance aggregates for members belonging to their authorized club.
2. **Server-Side Authority**: Performance statistics are calculated dynamically at the database/repository layer from raw transactional tables (`tasks`, `task_completions`, `evaluations`). No aggregates are duplicated as mutable fields on `profiles` or `memberships` tables to avoid synchronization anomalies.
3. **Optimized Queries**: Aggregations are calculated using single-pass queries with standard SQL operations, avoiding N+1 queries.

---

## Calculations Logic

### 1. Completion Rate
* **Formula**:
  $$\text{Completion Rate} = \left( \frac{\text{Approved Completions}}{\text{Total Assigned Tasks}} \right) \times 100$$
* **Edge Case Handling**: If $\text{Total Assigned Tasks} = 0$, the Completion Rate is default defined to $0\%$.

### 2. Average Rating
* **Formula**:
  $$\text{Average Rating} = \frac{\sum \text{Evaluation Ratings}}{\text{Total Evaluated Tasks}}$$
* **Scale**: Ratings are stored on a 1–5 integer scale. The average rating is stored as a floating point number.
* **Edge Case Handling**: If $\text{Total Evaluated Tasks} = 0$, the Average Rating returns $0$ (or renders as "N/A" on the UI).

### 3. Performance Trend Points
* **Definition**: A historical sequence of evaluations sorted chronologically.
* **Requirements**:
  * Minimum of $2$ evaluations is required to render a trend chart.
  * If $\text{Evaluations} < 2$, the UI renders the designated empty state: `"More evaluations are needed to show a performance trend."`

---

## Data Boundary Isolation

Queries enforce boundaries via inner joins between `memberships` and the corresponding target tables:

```sql
SELECT ...
FROM memberships m
JOIN tasks t ON t.club_id = m.club_id
JOIN task_completions tc ON tc.task_id = t.id AND tc.member_id = m.member_id
JOIN evaluations e ON e.completion_id = tc.id
WHERE m.club_id = :clubId AND m.member_id = :memberId
```

This prevents cross-club data leaks, satisfying all RBAC policy requirements.
