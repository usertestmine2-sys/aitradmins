# Architecture Decision Records (AAOS)

## ADR 001: Single Brain + Single Event Bus Architecture (2026)
**Status**: Accepted

We use a single centralized Brain (AI decision core) and single Event Bus for all trading, risk, portfolio and AI society events. This eliminates duplicate services and ensures Single Source of Truth.

## ADR 002: Append-Only Event Sourcing with PostgreSQL
**Status**: Accepted

All state changes are recorded in immutable audit/ledger tables. Current state is derived via event replay. No updates or deletes on core ledger.

## ADR 003: Hexagonal + CQRS + Repository Pattern
**Status**: Accepted

Domain logic isolated. Commands and Queries separated. All DB access through repositories with dependency injection.

## ADR 004: Performance Hardening Decisions (Phase G.3)
- Dynamic imports for heavy dashboard sections
- React.memo + useMemo for all metric cards and charts
- Drizzle prepared statements + connection pooling
- Recharts with responsive containers and limited data points
- Security headers via Next.js headers config
- Zod for all input validation

These optimizations were applied only to the verified existing modules without introducing new business logic or architecture changes.

All decisions preserve the constitutional rules of AAOS.
