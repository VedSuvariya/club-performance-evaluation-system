<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🤖 Club Performance Evaluation & Reporting System Agent Rules

Welcome coding agent! To maintain high code quality and strict modularity in this codebase, you must adhere to the following rules:

---

## 🏗️ 1. Architecture: Modular Monolith
- **Domain Modularity**: Business logic must be organized under `src/features/[feature-name]/`.
- **Allowed Feature Folders**:
  - `authentication/`
  - `task-management/`
  - `evaluation/`
  - `member-profile/`
  - `club-transfer/`
  - `reports/`
- **Feature Encapsulation**: A feature folder should house its own components, hooks, api-handlers, schemas, and types. Do not let domain-specific files leak into generic global directories.
- **Global Libraries**: Shared cross-cutting concerns (e.g. database client, global validation schemas, RBAC middleware) belong in `src/lib/` or `src/components/`.
- **Data Flow Layering Constraints**: UI components must never access the database/Supabase layer directly. All database access must adhere to the following sequence:
  ```text
  UI Component (Client/Server)
  └── Feature / Server Action / Route API
      └── Business Logic (Services/Actions)
          └── Database Layer (Repository helpers)
              └── Supabase Client Instance
  ```
  Do not bypass any layer. Supabase-specific client code must remain isolated in the `src/lib/database` layer.

---

## 🔒 2. Security and Environment
- **No Secrets**: Never hardcode api-keys, database connection strings, or service keys.
- **Environment Template**: Update `.env.example` when adding new environment configurations. Do not commit `.env`, `.env.local`, or any populated secret files.
- **Supabase Integration**: In the Supabase integration phase, strictly use official client libraries and secure environment variables via Next.js server actions / routes.

---

## 🧪 3. Testing Requirements
- **Co-location / Test Dir**: Put Unit/Integration tests under `tests/unit/` or `tests/integration/` (or co-locate them if appropriate, but the default test runner looks at `tests/unit/` and `tests/integration/`).
- **E2E Testing**: E2E scenarios must be placed in `tests/e2e/` and run using Playwright.
- **Config**: Do not modify test runner configs (`vitest.config.ts` or `playwright.config.ts`) without approval.

---

## 📐 4. Code Quality & Formatting
- **Strict TypeScript**: Never use `any` unless absolutely necessary (with disabling comment explaining why). Enable strict checks, check for `undefined`/`null`, and avoid casting assertions.
- **ESLint & Prettier**: Keep code clean. Ensure `npm run lint` passes and formatting matches the rules in `.prettierrc`.
