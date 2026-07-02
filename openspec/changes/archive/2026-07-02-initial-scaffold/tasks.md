# Tasks: Initial Scaffold

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 2500–3500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Foundation) → PR 2 (Core Impl) → PR 3 (Presentation & Integration) |
| Delivery strategy | ask-always → resolved: stacked-to-main |
| Chain strategy | stacked-to-main |

Decision needed before apply: Resolved — stacked-to-main
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation — project init, schema, domain layer, seed, backup, logging, auth config | PR 1 | Base: main; ~20 files, independently buildable |
| 2 | Core implementation — repo impls, use cases, concurrency control | PR 2 | Base: PR 1 branch; ~15 files, depends on domain layer |
| 3 | Presentation & integration — Server Actions, DTOs, pages, middleware | PR 3 | Base: PR 2 branch; ~15 files, depends on use cases |

## Phase 1: Foundation

- [x] 1.1 Initialize Next.js project with TypeScript, App Router, and install deps (Prisma, Auth.js, Pino, bcrypt, Vitest) in `package.json`
- [x] 1.2 Create `vitest.config.ts` with path aliases and test structure
- [x] 1.3 Create `prisma/schema.prisma` with all models (Proveedor, Lote+version, Cliente, Venta, GastoFijo, Usuario), enums, Decimal fields, UUID IDs
- [x] 1.4 Create `src/domain/enums.ts` — TipoProducto, TipoCliente, EstadoLote, RolUsuario
- [x] 1.5 Create `src/domain/value-objects/Dinero.ts` — Decimal wrapper with arithmetic ops
- [x] 1.6 Create `src/domain/value-objects/Kilogramo.ts` — positive-number wrapper
- [x] 1.7 Create `src/domain/entities/Proveedor.ts`
- [x] 1.8 Create `src/domain/entities/Lote.ts` — cost calc, status transition, version field
- [x] 1.9 Create `src/domain/entities/Cliente.ts` — type enum, pricing rules
- [x] 1.10 Create `src/domain/entities/Venta.ts` — immutable, financial calc
- [x] 1.11 Create `src/domain/entities/GastoFijo.ts` — amount validation
- [x] 1.12 Create `src/domain/entities/Usuario.ts` — email, passwordHash, role
- [x] 1.13 Create all repository ports in `src/domain/ports/` (LoteRepository, VentaRepository, ClienteRepository, GastoFijoRepository, ProveedorRepository, UsuarioRepository)
- [x] 1.14 Create `src/infrastructure/db.ts` — Prisma client singleton with WAL mode
- [x] 1.15 Create `src/infrastructure/pino-logger.ts` — Pino file transport to `logs/app.log`
- [x] 1.16 Create `src/infrastructure/auth.ts` — Auth.js Credentials provider + bcrypt config
- [x] 1.17 Create `prisma/seed.ts` — upsert admin user + two base products (idempotent)
- [x] 1.18 Create `scripts/backup.ts` — copy dev.db to `/backups/backup-dev-{date}.db`
- [x] 1.19 Add `seed` and `backup` npm scripts to `package.json`
- [x] 1.20 Run `npx prisma db push` and verify schema creates all tables

## Phase 2: Core Implementation

- [x] 2.1 Create `src/infrastructure/repositories/PrismaProveedorRepo.ts`
- [x] 2.2 Create `src/infrastructure/repositories/PrismaLoteRepo.ts` — optimistic locking with version field
- [x] 2.3 Create `src/infrastructure/repositories/PrismaClienteRepo.ts`
- [x] 2.4 Create `src/infrastructure/repositories/PrismaVentaRepo.ts` — `$transaction` for atomic sale + stock deduction with retry
- [x] 2.5 Create `src/infrastructure/repositories/PrismaGastoFijoRepo.ts`
- [x] 2.6 Create `src/infrastructure/repositories/PrismaUsuarioRepo.ts`
- [x] 2.7 Create `src/application/use-cases/AutenticarUsuario.ts` — verify credentials, return session user
- [x] 2.8 Create `src/application/use-cases/CrearLote.ts` — create with cost calc
- [x] 2.9 Create `src/application/use-cases/RegistrarVenta.ts` — atomic registration, price resolution, concurrency retry
- [x] 2.10 Create `src/application/use-cases/GestionarClientes.ts` — CRUD + pricing
- [x] 2.11 Create `src/application/use-cases/GestionarGastos.ts` — CRUD + monthly aggregation
- [x] 2.12 Create `src/application/use-cases/ObtenerMetricas.ts` — revenue, costs, profit, inventory, top clients

## Phase 3: Presentation & Integration

- [x] 3.1 Create `src/presentation/dtos/` — request/response DTOs for all use cases
- [x] 3.2 Create `src/presentation/actions/auth.ts` — login/logout Server Actions
- [x] 3.3 Create `src/presentation/actions/lotes.ts` — Lote CRUD Server Action
- [x] 3.4 Create `src/presentation/actions/ventas.ts` — Venta registration Server Action (session guard)
- [x] 3.5 Create `src/presentation/actions/clientes.ts` — Cliente CRUD Server Action
- [x] 3.6 Create `src/presentation/actions/gastos.ts` — GastoFijo CRUD Server Action
- [x] 3.7 Create `src/presentation/actions/dashboard.ts` — metrics Server Action
- [x] 3.8 Create `src/app/api/auth/[...nextauth]/route.ts` — Auth.js catch-all route (verified existing, no changes needed)
- [x] 3.9 Create `src/middleware.ts` — protect routes except /login and /api/auth
- [x] 3.10 Create `src/app/login/page.tsx` — login form with credentials
- [x] 3.11 Create `src/app/page.tsx` — dashboard page (thin)
- [x] 3.12 Create `src/app/lotes/page.tsx` — lotes list page
- [x] 3.13 Create `src/app/ventas/page.tsx` — ventas list page
- [x] 3.14 Create `src/app/clientes/page.tsx` — clientes list page
- [x] 3.15 Create `src/app/gastos/page.tsx` — gastos page

## Phase 4: Testing & Verification

- [x] 4.1 Domain unit tests — Lote cost calc, status transitions, Venta immutability, Cliente pricing, GastoFijo validation, Kilogramo/Dinero
- [x] 4.2 Use case unit tests — CrearLote, RegistrarVenta (mock repos), ObtenerMetricas, AutenticarUsuario
- [x] 4.3 Concurrency unit test — optimistic locking rejection + retry on version mismatch
- [x] 4.4 Auth unit tests — wrong password, unknown email, valid login
- [x] 4.5 Integration tests — Prisma repo implementations against test SQLite DB
- [x] 4.6 Script tests — seed idempotency (run twice → same state), backup creation
- [x] 4.7 E2E verification — login → protected route → Server Action → dashboard renders
- [x] 4.8 Verify dependency rule — `src/domain/` has zero imports from outer layers