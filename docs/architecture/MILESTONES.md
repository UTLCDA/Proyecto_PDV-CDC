# ROADMAP & MILESTONES — Lambrín POS & Platform

## Phase 1: Internal POS System

| Milestone | Target Scope | Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **M0** | Government & Architecture Setup | Repository layout, AGENTS.md, TRACEABILITY_MATRIX, ADRs 001-005, compilable .NET 9 + React Vite skeleton, CI pipeline. | COMPLETED |
| **M1** | Security & Identity | User/Employee CRUD, RBAC Permission Bitmask, JWT + Refresh Tokens, Login screen, Bitácora baseline middleware. | PLANNED |
| **M2** | Catalogs & Inventory | Product multi-level categories, Lambrín unit pricing, Customers directory, Stock entries/exits, Concurrency handling. | PLANNED |
| **M3** | POS Checkout & USB Scanner | POS Panel UI, USB Barcode Scanner listener, Cart calculations, Advance/Layaway sales, Manual price override auth. | PLANNED |
| **M4** | Commercial Operations & Docs | Quotes to Orders, Installments (Abonos), Returns, Delivery Tracking, Editable Contract PDF templates. | PLANNED |
| **M5** | Cash Shift & Reports | Cash Register shift opening/closing, Shift cut, Dapper reporting queries, PDF/Excel report exports. | PLANNED |
| **M6** | Phase 1 Release | Playwright E2E testing, security audit, user manual, final human approval for production deployment. | PLANNED |

---

## Phase 2: Public E-Commerce & Customer Service Platform

| Milestone | Target Scope | Key Deliverables | Status |
| :--- | :--- | :--- | :--- |
| **M7** | Public E-Commerce Portal | Responsive public store, product catalog search/filters, shopping cart, customer registration. | PLANNED |
| **M8** | Web Order & Inventory Integration| Unified POS & Web inventory synchronization, online delivery tracking, payment gateway readiness. | PLANNED |
| **M9** | Customer Service & Ticketing | Support ticket creation, message threads, file attachments, response templates, SLA reporting. | PLANNED |
