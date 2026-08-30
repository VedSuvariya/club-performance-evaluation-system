# Performance Aggregation Architecture

This document describes the design, implementation details, formulas, and security isolation rules of the performance aggregation system for the **Club Performance Evaluation and Reporting System**.

---

## 📊 Performance Metrics

The system calculates the following performance metrics dynamically from transactional database tables:

1. **Total Assigned Tasks**: The count of tasks assigned to the member.
2. **Total Completed Tasks**: The count of assigned tasks where the member has submitted completion evidence.
3. **Total Evaluated Tasks**: The count of tasks where a Department Lead has submitted a rating.
4. **Pending Evaluations**: Tasks that are completed but have not yet been evaluated by a lead.
5. **Completion Rate**: The percentage of assigned tasks that are completed.
6. **Average Rating**: The arithmetic mean of all applicable evaluation scores.
7. **Performance Trend**: Chronologically sorted rating data points for visual timeline rendering.

---

## 📐 Calculation Logic & Formulas

### 1. Completion Rate
* **Formula**:
  $$\text{Completion Rate} = \left( \frac{\text{Total Completed Tasks}}{\text{Total Assigned Tasks}} \right) \times 100$$
* **Edge Case Handling**: If $\text{Total Assigned Tasks} = 0$, the Completion Rate defaults to $0\%$.

### 2. Average Rating
* **Formula**:
  $$\text{Average Rating} = \frac{\sum \text{Evaluation Ratings}}{\text{Total Evaluated Tasks}}$$
* **Scale**: Ratings are stored on a 1–5 integer scale. The average rating is calculated as a float and rounded to 2 decimal places for presentation (e.g. `4.33`).
* **Edge Case Handling**: If $\text{Total Evaluated Tasks} = 0$, the Average Rating returns $0$ and displays as `"N/A"`.
* **Exclusions**: Incomplete tasks, unevaluated tasks, deleted records, and tasks belonging to other users are strictly excluded.

### 3. Rating Interpretation Labels
Numeric ratings are qualitatively interpreted using the following ranges:
* **1.0 – 1.9**: Needs Significant Improvement
* **2.0 – 2.9**: Needs Improvement
* **3.0 – 3.9**: Meets Expectations
* **4.0 – 4.4**: Very Good
* **4.5 – 5.0**: Excellent

---

## 📈 Performance Trend Calculation

* **Definition**: A historical sequence of evaluations sorted chronologically by the evaluation creation time (`created_at`).
* **Trend Points**: Each point contains the evaluation date (`created_at`), the rating, and the task title.
* **Insufficient Data Handling**:
  * Rendering a trend chart requires at least **2** evaluations.
  * If the member has fewer than 2 evaluations, the UI renders a clear empty state: `"More evaluations are needed to show a performance trend."`

---

## 🗄️ Query Design & Persistence Strategy

### Dynamic Aggregations (No Persisted Snapshots)
To ensure data consistency and prevent synchronization anomalies, no aggregate statistics are duplicated or cached as mutable fields in any database table. Instead, aggregates are computed dynamically:
- For list views (e.g. Department Lead member list), queries fetch tasks and batch-retrieve assignments, completions, and evaluations to compute aggregations in-memory, avoiding N+1 queries.
- SQL grouping, `COUNT`, and `AVG` queries are used where supported by the client.

### SQL Join Representation
To retrieve a member's performance details isolated to a specific club, queries enforce boundaries via SQL joins matching the database schema:

```sql
SELECT 
  COUNT(DISTINCT ta.id) AS assigned_count,
  COUNT(DISTINCT tc.id) AS completed_count,
  COUNT(DISTINCT e.id) AS evaluated_count,
  AVG(e.rating) AS average_rating
FROM memberships m
JOIN tasks t ON t.club_id = m.club_id
LEFT JOIN task_assignments ta ON ta.task_id = t.id AND ta.user_id = m.user_id
LEFT JOIN task_completions tc ON tc.task_id = t.id AND tc.user_id = m.user_id
LEFT JOIN evaluations e ON e.task_id = t.id AND e.member_id = m.user_id
WHERE m.club_id = :clubId 
  AND m.user_id = :memberId
  AND m.status = 'ACTIVE';
```

---

## 🔄 Historical Data & Club Transfer Strategy

* **Permanent Association**: Performance history must remain attached to the member.
* **Club Transfer Independence**: When a member transfers to a different club, their previous evaluation history must NOT disappear or be overwritten.
* **Technical Implementation**:
  - The `memberships` table preserves historical records by setting `status = 'INACTIVE'` and filling the `left_at` timestamp rather than deleting the row.
  - The `evaluations` table stores the member's user ID (`member_id`), which remains linked to their primary user account.
  - Evaluated tasks maintain references to the `club_id` where the task was created, preserving the historical club context.

---

## 🔒 Security & Data Isolation Model

Access control and privilege boundaries are strictly enforced server-side:

1. **Identity Resolution**: The user's ID is resolved from the server-side authentication session (`requireRole`), never trusted from client-provided request arguments.
2. **Horizontal Privilege Prevention**:
   * A member can only request/view their own performance dashboard data (`memberId` matches the session user ID).
   * A member is forbidden from calling Department Lead queries or viewing another member's summary.
3. **Club Isolation**:
   * A Department Lead can only access performance details for members belonging to their authorized club.
   * This is verified server-side by checking that the member has an active membership record in the lead's club (`clubId` resolved from `getLeadClub(leadId)`).
