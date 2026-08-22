# Shared Visual Design System

This document outlines the design language, token parameters, component strategy, and accessibility guidelines for the **Club Performance Evaluation & Reporting System**.

---

## 🎨 Design Philosophy

Our design system is built to resemble a high-end, premium productivity SaaS platform. We prioritize clarity, legibility, and information density over excessive visual decorations. 

Key principles:
1. **Purposeful Visual Cues**: Shadows, borders, and gradients highlight hierarchy rather than acting as raw decoration.
2. **Strict Dark/Light Balance**: The application supports full responsive light and dark themes using semantic Tailwind variables.
3. **Motion with Intent**: CSS micro-animations provide feedback (e.g. menu button hovers and dropdown transitions) while adhering to user system preferences.

---

## 🔑 Theme Tokens & CSS Variables

The system relies on CSS custom properties configured in `@theme inline` under `src/app/globals.css`. 

| Token | Light Theme | Dark Theme | Purpose |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Standard application body color. |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Core text coloring. |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Dashboard card block background. |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` | Primary brand highlights. |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Borders for grids and tables. |
| `--radius` | `0.625rem` | `0.625rem` | Rounded border radius scale base. |

---

## 📐 Typography Scale

The system utilizes the modern `Geist` variable sans-serif font family.

- **Display / Page Title**: `font-bold text-2xl tracking-tight sm:text-3xl`
- **Section Title**: `font-semibold text-lg sm:text-xl`
- **Card Title**: `font-semibold text-base`
- **Body Text**: `text-sm text-slate-600 dark:text-slate-400`
- **Metadata / Caption**: `text-xs text-slate-400`

---

## 🧱 Component Strategy

To maintain encapsulation, shared components are stored in `src/components/dashboard/` and `src/components/feedback/`. These receive configuration props and render strictly semantic HTML.

1. **StatCard**: Metric summaries featuring positive (green) and negative (red) progress indicators and icons.
2. **DataTable**: Generic horizontal table built with custom accessibility tags.
3. **ChartCard**: Pure SVG elements simulating lines, grid alignments, and area charts dynamically with CSS custom gradients.
4. **FeedbackStates**: Standardized `LoadingState` (skeleton grids), `EmptyState` (inbox logs), and `ErrorState` panels.

---

## 📱 Responsive & Mobile Layout Strategy

We implement custom layouts across four primary device sizes:
- **Desktop (>= 1024px)**: Full expanded collapsible sidebar navigation and multi-column statistic panels.
- **Tablet (>= 768px)**: Compacted icon-only sidebar navigation.
- **Mobile (< 768px)**: Hidden desktop sidebar, replaced with a drawer navigation sheet triggered via the Top Bar hamburger menu. Tables transition to scrollable sections.

---

## ♿ Accessibility & Focus States

- **Keyboard navigation**: Major controls (sidebar items, theme toggles, profile dropdowns, and button tags) use native `<button>` and `<a>` elements to ensure keyboard tabbing works out-of-the-box.
- **Contrast ratio**: Standard text and badges comply with WCAG AA guidelines for high readability in both themes.
- **Focus Rings**: Interactive links use `--ring` outline highlighting when tabbed: `focus-visible:ring-2 focus-visible:ring-indigo-600`.
- **Aria attributes**: Icons and drawers contain appropriate `aria-label`, `aria-expanded`, and `aria-hidden` attributes.

---

## 🎬 Animation & System Motion

- Elements scale or shift gently on hover (`transition hover:-translate-y-0.5 hover:shadow-md`).
- Skeletons use clean CSS keyframe pulse animations.
- **Reduced Motion**: All animations are optimized with default tailwind transitions. For users with native OS `prefers-reduced-motion: reduce`, animations are skipped or slowed using:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
