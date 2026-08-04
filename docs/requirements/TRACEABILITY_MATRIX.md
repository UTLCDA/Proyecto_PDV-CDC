# TRACEABILITY MATRIX — Lambrín POS System (Phase 1 & Phase 2)

| Req ID | Phase | Module | Description | Story / Issue | Accept Criteria | Use Case / Endpoint | Screen / View | Entity / Table | Tests | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| REQ-001 | Phase 1 | Security | User login with email/username and password | US-001 | AC-001..004 | POST /api/v1/auth/login | `/login` | `Users`, `RefreshTokens` | Unit, Integration, E2E | IN PROGRESS |
| REQ-002 | Phase 1 | Security | Employee management (create, edit, disable) | US-002 | AC-005..008 | GET/POST /api/v1/employees | `/employees` | `Employees` | Unit, Integration | PLANNED |
| REQ-003 | Phase 1 | Security | Role & Granular Permissions | US-003 | AC-009..012 | GET/PUT /api/v1/roles | `/roles` | `Roles`, `Permissions` | Unit, Authorization | PLANNED |
| REQ-004 | Phase 1 | POS | Main POS panel with responsive checkout | US-004 | AC-013..018 | POST /api/v1/sales | `/pos` | `Sales`, `SaleItems` | Unit, Playwright E2E | PLANNED |
| REQ-005 | Phase 1 | POS | Advances & Layaways (Anticipos / Apartados) | US-005 | AC-019..023 | POST /api/v1/layaways | `/pos/layaway` | `Layaways`, `Payments` | Unit, Integration | PLANNED |
| REQ-006 | Phase 1 | Catalog | Customers management & wholesale pricing | US-006 | AC-024..027 | GET/POST /api/v1/customers | `/customers` | `Customers` | Unit, Component | PLANNED |
| REQ-007 | Phase 1 | Catalog | Product catalog with multi-level categories | US-007 | AC-028..032 | GET/POST /api/v1/products | `/products` | `Products`, `Categories` | Unit, Integration | PLANNED |
| REQ-008 | Phase 1 | Inventory| Stock levels & movements (Entries, Exits) | US-008 | AC-033..037 | POST /api/v1/inventory/movements | `/inventory` | `Stock`, `InventoryMovements` | Unit, Concurrency | PLANNED |
| REQ-009 | Phase 1 | Sales | Orders & Sales processing | US-009 | AC-038..042 | GET/POST /api/v1/orders | `/orders` | `Orders`, `OrderItems` | Unit, Integration | PLANNED |
| REQ-010 | Phase 1 | Sales | Returns & Refunds management | US-010 | AC-043..046 | POST /api/v1/returns | `/returns` | `Returns`, `ReturnItems` | Unit, Integration | PLANNED |
| REQ-011 | Phase 1 | Payments | Installments & Transaction receipts | US-011 | AC-047..050 | POST /api/v1/payments | `/payments` | `Payments` | Unit, PDF Test | PLANNED |
| REQ-012 | Phase 1 | Docs | Document support & template contracts | US-012 | AC-051..054 | GET/POST /api/v1/documents | `/documents` | `DocumentTemplates`, `CustomerFiles` | PDF Test | PLANNED |
| REQ-013 | Phase 1 | Sales | Promotions & Discounts approval | US-013 | AC-055..058 | POST /api/v1/discounts/approve | `/pos` | `Promotions`, `Discounts` | Unit, Auth Test | PLANNED |
| REQ-014 | Phase 1 | Sales | Quotes generation & conversion to order | US-014 | AC-059..062 | GET/POST /api/v1/quotes | `/quotes` | `Quotes`, `QuoteItems` | Unit, Integration | PLANNED |
| REQ-015 | Phase 1 | Shipping| Delivery tracking & shipping statuses | US-015 | AC-063..066 | GET/PUT /api/v1/deliveries | `/deliveries` | `Deliveries` | Unit, Integration | PLANNED |
| REQ-016 | Phase 1 | Audit | Immutability Bitácora activity log | US-016 | AC-067..070 | GET /api/v1/audit-logs | `/audit` | `AuditLogs` | Unit, Integration | PLANNED |
| REQ-017 | Phase 1 | Cash | Cash shift opening, closing, & cuts | US-017 | AC-071..075 | POST /api/v1/cash-shifts/cut | `/cash` | `CashShifts`, `CashTransactions` | Unit, Concurrency | PLANNED |
| REQ-018 | Phase 1 | Reports | PDF & Excel report exports | US-018 | AC-076..079 | GET /api/v1/reports/export | `/reports` | Views / Dapper Queries | Export Test | PLANNED |
| REQ-019 | Phase 1 | Hardware| USB Barcode scanner integration | US-019 | AC-080..082 | Frontend HID Listener | `/pos` | N/A | Component, E2E | PLANNED |
| REQ-020 | Phase 2 | Web Store| Public responsive catalog & store | US-020 | AC-083..087 | GET /api/v1/public/catalog | Public `/` | `Products`, `Categories` | E2E | PLANNED |
