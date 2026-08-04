# OPEN QUESTIONS & TEMPORARY ASSUMPTIONS

## Open Questions Log

| ID | Module / Area | Question / Ambiguity | Temporary Assumption | Responsible | Impact | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| OQ-001 | Infrastructure | Database server hosting for production (Azure SQL vs On-Premise SQL Server). | Local SQL Server Express / Developer Edition for local development; EF Core migrations agnostic. | Lead Developer | Low (Connection string configuration) | OPEN |
| OQ-002 | Document Support | Electronic contract PDF templates specific legal wording for Lambrín sales. | Provide 3 editable base Markdown/HTML templates for Layaway, Sale Contract, and Receipt. | Business Owner | Medium (Document module) | OPEN |
| OQ-003 | Shipping | Integration with external parcel providers (e.g. Fedex/DHL) vs internal truck delivery. | Internal delivery status tracking (Pending, In Transit, Delivered, Cancelled) for Phase 1. | Lead Developer | Medium (Shipping module) | OPEN |
| OQ-004 | Product Pricing | Decimal precision requirements for product dimensions vs currency. | Currency using `decimal(18,2)`, dimensions (meters, sq meters) using `decimal(18,4)`. | Lead Developer | Low (Database Schema) | OPEN |
