# ADR-003: Entity Framework Core for CRUD & Dapper for Complex Reporting & Audit

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Lead Technical Architect & Human Lead Developer

## Context
The POS system executes standard transactional CRUD operations (creating orders, updating inventory, registering payments) while also requiring high-volume audit query logging and complex financial shift/cut reports.

## Decision
- Use **Entity Framework Core 9 (EF Core)** for transactional domain entity operations, schema migrations, unit-of-work tracking, and relational integrity.
- Use **Dapper** specifically when justified for high-performance read queries, audit log analytical filtering, and heavy aggregation reports.

## Consequences
- **Positive**: Maintains productivity and data integrity via EF Core, while unlocking optimal SQL execution performance with Dapper when needed.
- **Negative**: Development team must manage DbContext mappings alongside explicit Dapper SQL parameter queries.
