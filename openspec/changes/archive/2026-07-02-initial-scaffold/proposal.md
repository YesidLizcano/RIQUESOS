# Proposal: Initial Scaffold

## Intent

Scaffold the entire backoffice application for a cheese distributor. Greenfield project — no source code exists yet. Must establish project structure, domain models, database schema, Server Actions, and basic UI pages so the team can start building features immediately.

## Scope

### In Scope
- Next.js project initialization (App Router, TypeScript)
- Prisma schema with all 5 models (Proveedor, Lote, Cliente, Venta, GastoFijo)
- Domain layer: entities, value objects (Dinero, Kilogramo, TipoProducto, TipoCliente, EstadoLote), and repository ports
- Application layer: use cases (CrearLote, RegistrarVenta, ObtenerMetricas, GestionarClientes, GestionarGastos, GestionarProveedores)
- Infrastructure layer: Prisma repository implementations + DB client singleton
- Presentation layer: Server Actions as controllers + DTOs
- Thin App Router pages (Dashboard, Lotes, Ventas, Clientes, Gastos)
- Vitest setup with domain/use-case test structure
- SQLite WAL mode configuration

### Out of Scope
- Authentication/authorization
- Email notifications
- Reporting/PDF exports
- Mobile responsiveness polish
- Deployment automation (Docker, CI/CD)
- UI component library setup

## Capabilities

### New Capabilities
- `lote-management`: Batch creation, cost calculation (base + freight + slicing + packaging), stock tracking, status transitions (ACTIVO → AGOTADO)
- `cliente-management`: Client CRUD, pricing rules by type (MAYORISTA with per-product pricing, MINORISTA with standard pricing)
- `venta-management`: Atomic sale registration with stock validation, revenue/cost/profit calculation, lot deduction
- `gasto-fijo-management`: Fixed monthly expense CRUD (electricity, rent, etc.)
- `dashboard-metrics`: Aggregated metrics — revenue, costs, profit margins, inventory levels, top clients

### Modified Capabilities
- None (greenfield — no existing capabilities)

## Approach

Clean Architecture with Server Actions (Approach 1 from exploration). Domain layer has zero framework/DB imports. Server Actions act as controllers in the Interface Adapters layer. Prisma stays in Infrastructure. Each layer independently testable. Use Prisma `Decimal` for all monetary fields, `@default(uuid())` for IDs, and `$transaction` for atomic sale registration.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/domain/` | New | Entities, value objects, enums, repository ports |
| `src/application/` | New | Use cases orchestrating domain logic |
| `src/infrastructure/` | New | Prisma repo implementations, DB client |
| `src/presentation/` | New | Server Actions + DTOs |
| `src/app/` | New | Thin App Router pages |
| `prisma/schema.prisma` | New | Full database schema |
| `package.json` | New | Project config with Next.js, Prisma, Vitest |
| `vitest.config.ts` | New | Test runner setup |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Float precision for monetary values | High | Use Prisma Decimal type everywhere; Dinero value object wraps Decimal |
| Server Actions become fat controllers | Medium | Enforce thin Actions — delegate to use cases; code review gate |
| SQLite concurrent writes under multi-user LAN | Low | Enable WAL mode; Prisma handles connection pooling |
| Over-engineering with too many layers for 5 features | Medium | Keep layers thin; avoid premature abstraction |

## Rollback Plan

Delete the entire scaffold and start fresh. Greenfield — no data or users to migrate. Git history preserves all iterations.

## Dependencies

- Node.js 18+ runtime
- Prisma CLI for schema generation and migrations
- Next.js 14+ with App Router support

## Success Criteria

- [ ] `npm run dev` starts the app without errors
- [ ] `npx prisma db push` creates all 5 tables with correct schema
- [ ] Domain entities pass all Vitest tests with zero DB imports
- [ ] Server Actions can create a Lote and register a Venta end-to-end
- [ ] Dashboard page renders metric placeholders
- [ ] Dependency Rule holds: `src/domain/` has no imports from outer layers