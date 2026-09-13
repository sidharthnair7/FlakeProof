# Reliant Design System (DESIGN.md)

This document establishes the visual design language, token architecture, and UX guidelines for **Reliant** — an autonomous AI agent engine for detecting and resolving order-dependent flaky tests. The aesthetic is modeled on best-in-class developer platforms (Linear, Vercel, Supabase) with reference to Refero Styles and Realtime Colors.

---

## 1. Color Palette (Realtime Colors Source)

The palette is engineered starting from a warm, high-legibility light theme with disciplined contrast, reserving saturated color exclusively for semantic CI states.

### Core Foundation
- **Background Base**: `#FAFAF9` (Tailwind Stone-50 warm canvas, prevents clinical stark white fatigue).
- **Surface / Card**: `#FFFFFF` with `rgba(255, 255, 255, 0.85)` backdrop blur glassmorphism.
- **Surface Subtle**: `#F5F5F4` (Stone-100) for nested containers, table headers, and inactive tabs.
- **Borders**:
  - Default: `#E5E7EB` (Gray-200, crisp 1px dev-tool hairline).
  - Subtle: `#F1F2F4` (Inner card dividers).
  - Strong / Active: `#D1D5DB` (Hovered inputs, focused cards).
- **Text Hierarchy**:
  - Primary: `#111827` (Gray-900, 95% contrast for code and headlines).
  - Secondary: `#4B5563` (Gray-600, descriptions, agent activity, timestamps).
  - Muted: `#9CA3AF` (Gray-400, meta markers, shortcut hints, subtle borders).

### Brand Accent
- **Deep Ink Navy**:
  - Primary `#0B132B` (Rich navy dark, authoritative and technical).
  - Hover `#1C2541` (Slight lift on buttons and primary pills).
  - Active `#070C1E` (Depressed button state).

### Semantic Status Tokens
Secondary accents are strictly constrained to avoid visual noise in complex test execution data:
- **Order-Dependent / Victim / State Leak (Amber)**:
  - Base: `#B45309` (Amber-700)
  - Background Tint: `#FEF3C7` (Amber-100)
  - Subtle Glow: `rgba(180, 83, 9, 0.15)`
  - Usage: Tests with dirty global leaks, order-dependent permutations, failing runs.
- **Isolated / Async Race / Hermetic Patch / Green (Teal)**:
  - Base: `#0F766E` (Teal-700)
  - Background Tint: `#CCFBF1` (Teal-100)
  - Subtle Glow: `rgba(15, 118, 110, 0.15)`
  - Usage: Pinpointed polluter pairs, clean isolated sandbox runs, auto-synthesized PRs.

---

## 2. Typography & Fonts

- **Sans-Serif (Interface & Editorial)**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `'Segoe UI'`, `sans-serif`.
  - Tight tracking on titles (`tracking-tight`), crisp letterforms for dense dashboard matrices.
- **Monospace (Code & Test Identifiers)**: `'JetBrains Mono'`, `'Fira Code'`, `ui-monospace`.
  - Used for file paths (`tests/e2e/checkout_order.spec.ts`), seeds (`#849204`), state diffs, and execution order graphs.

### Type Scale
- `text-xs` (11px / 12px): Badge labels, seed tags, commit SHAs, latency numbers.
- `text-sm` (13px / 14px): Dashboard table items, card descriptions, activity log rows.
- `text-base` (15px / 16px): Body text, primary button labels, tooltips.
- `text-lg` / `text-xl` (18px - 20px): Section headings, modal titles.
- `text-3xl` - `text-5xl` (32px - 48px): Hero headlines and high-impact stat figures.

---

## 3. Elevation & Surfaces

- **Card Level 0 (Flat)**: Hairline border (`1px solid #E5E7EB`), transparent or `#FFFFFF`.
- **Card Level 1 (Default Card)**: `#FFFFFF`, `box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04)`.
- **Card Level 2 (Hover / Active)**: `box-shadow: 0 10px 25px -5px rgba(11, 19, 43, 0.08)`, subtle Y translate `-2px`.
- **Modals & Flyouts**: Backdrop blur `backdrop-blur-md bg-white/95`, border `#E5E7EB`, shadow `0 20px 40px -15px rgba(11, 19, 43, 0.15)`.

---

## 4. Animation & Motion Guidelines

1. **Motion (`motion/react`)**:
   - **Kanban Card Transitions**: `layoutId` physics so test cards smoothly slide across columns (`Detected` -> `Investigating` -> `Isolated` -> `Resolved`) with spring config `{ type: "spring", stiffness: 350, damping: 28 }`.
   - **Agent Status Dots**: Subtle continuous breathing ring (`scale: [1, 1.4, 1]`, `opacity: [0.8, 0, 0.8]`).
   - **Hero Background Beams**: Dual gradient beams traversing geometric SVG lines without blocking text legibility.
2. **GSAP**:
   - **Hero Headline Reveal**: Staggered word/character reveal with subtle `y: 24`, `opacity: 0`, ease `power3.out`.
   - **Scroll-Triggered Reveals**: Feature cards and metric strips gently fade and translate upward as they hit viewport threshold.

---

## 5. Component Conventions (KokonutUI + unlumen UI)

- **Buttons**: Pill or slightly rounded (`rounded-lg`), subtle inner border highlight, dark ink navy for primary CTA, subtle stone surface for secondary.
- **Badges**: Monospace or uppercase tracking, rounded-full, 6px semantic dot indicator on the left.
- **Data Density**: High-density dev-tool layout; no excessive padding or empty whitespace. Information should feel authoritative, actionable, and deterministic.
