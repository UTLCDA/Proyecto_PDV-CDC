# ADR-005: Append-Only Immutable Functional Audit Log (Bitácora)

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Lead Technical Architect & Human Lead Developer

## Context
Business requirements mandate a 100% traceable activity log (`Bitácora`) that records every user action (price modifications, order edits, file uploads, product edits, and logins) with exact date/time (YYYY-MM-DD HH:mm:ss), user ID, before/after values, and correlation ID. Audit logs must never be updated or deleted by any user or administrator.

## Decision
- Implement an **Append-Only Immutable Audit Log System**.
- `AuditLog` database table contains `Id`, `CorrelationId`, `UserId`, `Action`, `EntityName`, `EntityId`, `OldValuesJson`, `NewValuesJson`, `TimestampUtc`, `IpAddress`, `Reason`.
- The Web API exposes **zero** `UPDATE` or `DELETE` endpoints for audit records.
- Database permissions restrict `UPDATE` and `DELETE` SQL operations on the `AuditLogs` table.

## Consequences
- **Positive**: Complete compliance with security audit trail requirements, tamper-proof record keeping.
- **Negative**: Audit table size grows continuously; requires indexed partitioning strategies over time.
