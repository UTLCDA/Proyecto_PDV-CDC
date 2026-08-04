# ADR-004: Frontend Stack with Vite, React 18, TypeScript, Vanilla CSS Design System, and i18next

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Lead Technical Architect & Human Lead Developer

## Context
The POS user interface must run smoothly on Desktop PCs, Tablets, and Mobile devices, supporting quick barcode scanning, fast checkout flows, and dual language UI (Spanish and Simplified Chinese).

## Decision
- **Core Stack**: React 18, TypeScript, Vite.
- **Styling**: Vanilla CSS with custom Design Tokens (CSS Variables) supporting modern dark-mode glassmorphism aesthetics, responsive layouts, and micro-interactions without heavy external UI dependencies.
- **State & Data Fetching**: TanStack Query (React Query) for server state caching.
- **Internationalization**: `i18next` with dictionary files (`es.json`, `zh.json`).
- **Testing**: Vitest + React Testing Library for unit/component tests; Playwright for E2E critical path tests.

## Consequences
- **Positive**: High performance, zero CSS library bloat, full control over design system and responsive behavior.
- **Negative**: Requires building clean, reusable core components (Buttons, Inputs, Modals, Tables, Cards).
