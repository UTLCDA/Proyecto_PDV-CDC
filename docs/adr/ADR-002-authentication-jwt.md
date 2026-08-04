# ADR-002: Authentication Strategy via ASP.NET Core Identity & JWT + Refresh Tokens

- **Status**: Approved
- **Date**: 2026-08-02
- **Deciders**: Lead Technical Architect & Human Lead Developer

## Context
The POS system requires multi-role access control (Administrators, Store Managers, Sellers, Cashiers) with granular permissions per module and operation (Consult, Create, Edit, Delete, Approve, Export).

## Decision
Use **ASP.NET Core Identity** for user password hashing, security stamp validation, and user management, combined with stateless **JSON Web Tokens (JWT)** and **Refresh Tokens** stored securely.

Key Rules:
- Short-lived Access Tokens (e.g. 15-60 minutes).
- Refresh Tokens stored in HTTP-Only, Secure, SameSite cookies or secure body payloads with database rotation.
- Custom claims for User ID, Role, and Permission Bitmask.
- Absolute prohibition of storing plain text passwords or secrets in the repository.

## Consequences
- **Positive**: Stateless API authorization, secure credential management, OWASP compliance.
- **Negative**: Requires token refresh rotation logic on the frontend.
