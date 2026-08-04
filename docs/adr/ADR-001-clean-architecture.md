# ADR-001: Clean Architecture Monolith with Modular Layering

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Lead Technical Architect & Human Lead Developer

## Context
The project requires an extensible, maintainable, and high-performance Point of Sale (POS) and inventory management system for Lambrín products. The initial implementation must deliver Phase 1 (Internal POS System) within a targeted timeline, while preparing for Phase 2 (E-commerce & Customer Support).

## Decision
We adopt a **Clean Architecture Monolith with Modular Layering**:
- `/src/backend/Pos.Domain`: Contains core business logic, domain entities, value objects, domain events, enums, and repository interfaces. Has **zero** external dependencies.
- `/src/backend/Pos.Application`: Implements use cases, CQRS commands/queries where beneficial, DTOs, FluentValidation rules, and service abstractions.
- `/src/backend/Pos.Infrastructure`: Contains Entity Framework Core `DbContext`, Dapper query handlers, Serilog logging, file storage abstractions, and external service integrations.
- `/src/backend/Pos.Api`: ASP.NET Core .NET 9 Web API controllers, custom middleware (exception handling, audit correlation ID), Swagger/OpenAPI setup, and dependency injection registration.

## Consequences
- **Positive**: Clear separation of concerns, high testability of domain and application logic without database dependencies, straightforward modular structure.
- **Negative**: Requires discipline to enforce layer boundaries and prevent leaking infrastructure concerns into domain.
