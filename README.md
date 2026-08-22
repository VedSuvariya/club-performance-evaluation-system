# Club Performance Evaluation and Reporting System

An enterprise-grade web application designed for evaluating, tracking, and reporting on club performance, member profiles, and transfers. Built with safety, scalability, and strict code quality in mind.

---

## 🚀 Tech Stack

- **Frontend Framework**: [Next.js (App Router)](https://nextjs.org/)
- **Programming Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database / Backend**: [Supabase PostgreSQL](https://supabase.com/) & [Supabase Auth](https://supabase.com/docs/guides/auth)
- **Data Validation**: [Zod](https://zod.dev/)
- **Testing Suite**:
  - [Vitest](https://vitest.dev/) for unit and integration testing
  - [Playwright](https://playwright.dev/) for end-to-end (E2E) testing
- **Code Quality**: [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/)

---

## 🏗️ Architecture

This repository adopts a **Clean Modular-Monolith Architecture**. Code is structured into distinct, self-contained domain features alongside core libraries:

```text
src/
├── app/                  # Next.js App Router (pages, layout, routing)
├── components/           # Shared, reusable global UI components (shadcn/ui, buttons, tables)
├── features/             # Isolated domain features (modular business domains)
│   ├── authentication/   # Auth modules, sign-in/up logic, MFA
│   ├── task-management/  # Member tasks, assignments, status tracking
│   ├── evaluation/       # Performance evaluation forms, scoring models
│   ├── member-profile/   # Profile settings, medical sheets, career statistics
│   ├── club-transfer/    # Member transfer requests, approvals, history
│   └── reports/          # Data analysis, performance exports, charting
├── lib/                  # Shared core utilities and external service integrations
│   ├── auth/             # JWT utils, session parsing helpers
│   ├── database/         # Database clients, query wrappers, transactional helpers
│   ├── permissions/      # Role-based access control (RBAC) policies
│   ├── validation/       # Global zod schemas, form validation rules
│   └── utils/            # General helpers, classname mergers (cn)
└── types/                # Core TypeScript declarations and shared models
```

---

## 🛠️ Getting Started

### 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)

### ⚙️ Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/VedSuvariya/club-performance-evaluation-system.git
   cd club-performance-evaluation-system
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com/) and sign in.
   - Click "New project" and select/create an organization.
   - Set a project name (e.g., `club-performance-evaluation-system`) and database password.
   - Choose a region close to you and click "Create new project".
   - Once initialized, navigate to **Project Settings** -> **API**.
   - Copy the **Project URL** and the **Anon Key** (public).

4. **Configure Environment Variables**:
   - Copy the environment variables template:
     ```bash
     cp .env.example .env.local
     ```
   - Open `.env.local` and fill in your copied Supabase credentials:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```

5. **Start the Application**:
   - To launch the development server:
     ```bash
     npm run dev
     ```
   - Open `http://localhost:3000` in your browser.
---

## 🔑 Authentication & Access Control

The application implements secure email/password authentication using **Supabase Auth** integrated with Next.js Middleware and custom role checks.

### 👥 Available System Roles

1. `MEMBER`: Access limited to their own dashboard `/member`.
2. `DEPARTMENT_LEAD`: Evaluates members and manages club tasks under `/department-lead`.
3. `CLUB_PRESIDENT`: Reviews club-wide metrics and performance summaries under `/club-president`.
4. `STUDENT_WELFARE_COUNCIL`: Full administrative view across all clubs under `/swc`.

### 🛡️ Route Access Matrix

- `/member/*` -> Restricted to `MEMBER` role.
- `/department-lead/*` -> Restricted to `DEPARTMENT_LEAD` role.
- `/club-president/*` -> Restricted to `CLUB_PRESIDENT` role.
- `/swc/*` -> Restricted to `STUDENT_WELFARE_COUNCIL` role.
- Unauthenticated requests to role-based routes are automatically redirected to `/login`.
- Unauthorized requests are redirected to `/unauthorized`.

### 🧪 Creating a Test Account Manually

Since role selection is restricted from the UI, you can register and assign roles manually through the Supabase Dashboard:

1. Navigate to your Supabase Project Dashboard.
2. Go to **Authentication** -> **Users** -> click **Add User** -> **Create User**.
3. Supply an email and password, then click **Save**.
4. To set their role, navigate to **Table Editor** -> select the `users` table in the `public` schema.
5. Edit the newly created user profile row (which is automatically synced from Auth using the database trigger) and set the `role` field to one of: `MEMBER`, `DEPARTMENT_LEAD`, `CLUB_PRESIDENT`, or `STUDENT_WELFARE_COUNCIL`. Set their `full_name` as desired.
6. Sign in with these credentials on the application login page (`/login`).

---

## 🎨 UI & Design System

The application features a premium, responsive interface that supports both **Light Mode** and **Dark Mode**.

Key design highlights:
- **Responsive Layout**: Collapsible sidebars on desktops, compact icon menus on tablets, and drawer navigation sheets on mobile devices.
- **Theme Switcher**: Instant theme swapping with custom keyframe animations and zero-flash layout persistence.
- **Generic Dashboard Widgets**: Modular components like `StatCard`, `DataTable`, `ChartCard` (vector-drawn inline charts), and timelines.
- **Accessible Interactions**: Fully keyboard tabbable focus rings, standard ARIA landmarks, and compliance with native system reduced-motion configurations.

---

## 💻 Development Commands

| Command | Action |
|:---|:---|
| `npm run dev` | Runs the Next.js development server at `http://localhost:3000` |
| `npm run build` | Compiles the production build |
| `npm run start` | Runs the compiled production server |
| `npm run lint` | Runs ESLint rules for code syntax and standard checks |
| `npm run test` | Runs all Vitest unit and integration tests |
| `npm run test:watch` | Runs Vitest in watch mode |
| `npm run test:e2e` | Runs E2E tests using Playwright |

---

## 🤖 AI Coding Agents Guidelines

All AI assistants and agents working on this project must read and strictly adhere to the repository standards documented in [AGENTS.md](./AGENTS.md).
