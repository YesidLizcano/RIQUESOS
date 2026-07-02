# Design: Initial Scaffold

## Technical Approach

Clean Architecture with Server Actions. Domain layer has zero framework/DB imports. Server Actions act as thin controllers in the Interface Adapters layer. Prisma stays in Infrastructure. Use Prisma `Decimal` for monetary fields, `@default(uuid())` for String IDs, and `$transaction` for atomic sale registration. Auth.js with Credentials provider protects routes/actions via Next.js Middleware. Pino logs critical events to local file. Each layer is independently testable.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Layer structure | 4-layer Clean Arch (Domain → Application → Infrastructure → Presentation) | Flat Next.js, 3-layer DDD | Separation enables independent testing; domain stays pure |
| Monetary values | Prisma `Decimal` type + JS `Prisma.Decimal` | Float/Number, BigNumber.js | Float loses precision on AR$ sums; Decimal is native to Prisma and exact |
| Delivery mechanism | Server Actions (thin controllers) | API Routes, tRPC | Server Actions = colocated with UI, fewer files, Next-native; spec requires no external API consumers |
| DB engine | SQLite WAL mode | PostgreSQL, MySQL | PRD mandates local LAN, zero infra cost; WAL handles concurrent reads on LAN |
| Entity IDs | String UUID via `@default(uuid())` | Auto-increment Int, CUID | UUIDs are opaque, no enumeration risk; Prisma `@default(uuid())` is built-in |
| Testing | Vitest (domain-first priority) | Jest, no tests | Vitest is ESM-native, fast; domain layer tests run with zero DB/framework deps |
| Value objects | Dinero, Kilogramo, TipoProducto, TipoCliente, EstadoLote as domain primitives | Raw primitives everywhere | Encapsulate validation; prevent invalid states (e.g. negative Kg, wrong enum) |
| **Authentication** | **Auth.js Credentials provider (email + password) + JWT strategy + Next.js Middleware** | Database sessions, Clerk, custom auth | Credentials provider requires JWT (no database adapter for SQLite); Middleware protects routes/actions; bcrypt for password hashing; no external auth service needed for LAN app |
| **Concurrency control** | **Prisma `$transaction` (interactive) + optimistic locking (version field on Lote)** | Pessimistic locking, application-level mutex | Interactive `$transaction` ensures sequential execution; version field on Lote detects stale writes; SQLite lacks row-level locks so optimistic approach fits |
| **Data seeding** | **`prisma/seed.ts` — clear + upsert admin user + base products** | Manual SQL, migration seed | Idempotent upserts; integrated with `npx prisma db seed`; TypeScript type-safe |
| **Logging** | **Pino → `logs/app.log` (Infrastructure layer)** | Console-only, Winston, pino-pretty | Pino is fastest Node logger; local file output for LAN deployment (no cloud console); structured JSON logs for grep-ability |
| **Backup** | **Node.js script `scripts/backup.ts` → `/backups/backup-dev-{date}.db`** | Cron + shell, SQLite VACUUM INTO | Simple `fs.copyFile`; npm script for convenience; timestamped filenames; idempotent same-day overwrite |

## Data Flow — Authenticated Venta Registration

```
Client UI ──POST Form──→ Middleware (auth check)
                              │
                    ┌─ No session → Redirect /login
                    └─ Valid session ↓
                     Server Action (registrarVenta)
                              │
                              ▼
                     RegistrarVentaUseCase
                     ├─ validate(clienteId, loteId, cantidad)
                     ├─ resolvePrecio(cliente, productoTipo)
                     ├─ calculateFinancials(cantidad, precio, costoReal)
                     └─ ventaRepo.save(venta) + loteRepo.deductStock(loteId, cantidad)
                              │
                              ▼
                     PrismaVentaRepo.$transaction([
                       lote.findUnique → version check,
                       lote.update WHERE version=expected AND stock>=qty,
                       venta.create
                     ])
                     │ retry on version conflict (max 3)
                              │
                              ▼
                     Pino logger → logs/app.log
                              │
                              ▼
                     SQLite (WAL mode)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Create | Full schema: Proveedor, Lote (+version field), Cliente, Venta, GastoFijo, Usuario. Decimal for money, UUID IDs, enums |
| `src/domain/entities/Usuario.ts` | Create | User entity for auth (email, passwordHash, role) |
| `src/domain/entities/Lote.ts` | Create | Lote entity with cost calculation, status transition, version field |
| `src/domain/entities/Cliente.ts` | Create | Cliente entity with type enum and pricing rules |
| `src/domain/entities/Venta.ts` | Create | Venta entity (immutable after creation) |
| `src/domain/entities/GastoFijo.ts` | Create | GastoFijo entity with amount validation |
| `src/domain/entities/Proveedor.ts` | Create | Proveedor entity |
| `src/domain/value-objects/Dinero.ts` | Create | Decimal wrapper for monetary values |
| `src/domain/value-objects/Kilogramo.ts` | Create | Positive number wrapper for weights |
| `src/domain/enums.ts` | Create | TipoProducto, TipoCliente, EstadoLote, RolUsuario enums |
| `src/domain/ports/UsuarioRepository.ts` | Create | User repo port: findByEmail, save |
| `src/domain/ports/LoteRepository.ts` | Create | Repository port interface |
| `src/domain/ports/ClienteRepository.ts` | Create | Repository port interface |
| `src/domain/ports/VentaRepository.ts` | Create | Repository port interface |
| `src/domain/ports/GastoFijoRepository.ts` | Create | Repository port interface |
| `src/domain/ports/ProveedorRepository.ts` | Create | Repository port interface |
| `src/application/use-cases/AutenticarUsuario.ts` | Create | Auth use case: verify credentials, return session user |
| `src/application/use-cases/CrearLote.ts` | Create | Use case: create Lote with cost calc |
| `src/application/use-cases/RegistrarVenta.ts` | Create | Use case: atomic sale registration with version check |
| `src/application/use-cases/GestionarClientes.ts` | Create | Use case: client CRUD |
| `src/application/use-cases/GestionarGastos.ts` | Create | Use case: GastoFijo CRUD + aggregation |
| `src/application/use-cases/ObtenerMetricas.ts` | Create | Use case: dashboard metrics |
| `src/infrastructure/db.ts` | Create | Prisma client singleton |
| `src/infrastructure/auth.ts` | Create | Auth.js configuration: Credentials provider, bcrypt compare, session strategy |
| `src/infrastructure/pino-logger.ts` | Create | Pino logger setup: file transport to logs/app.log, auto-create logs/ dir |
| `src/infrastructure/repositories/PrismaUsuarioRepo.ts` | Create | Prisma impl of UsuarioRepository port |
| `src/infrastructure/repositories/PrismaLoteRepo.ts` | Create | Prisma impl with optimistic locking (version field) |
| `src/infrastructure/repositories/PrismaClienteRepo.ts` | Create | Prisma impl of ClienteRepository port |
| `src/infrastructure/repositories/PrismaVentaRepo.ts` | Create | Prisma impl with $transaction for atomic sale + stock deduction |
| `src/infrastructure/repositories/PrismaGastoFijoRepo.ts` | Create | Prisma impl of GastoFijoRepository port |
| `src/infrastructure/repositories/PrismaProveedorRepo.ts` | Create | Prisma impl of ProveedorRepository port |
| `src/presentation/dtos/` | Create | Request/response DTOs for each use case |
| `src/presentation/actions/auth.ts` | Create | Auth Server Actions: login, logout |
| `src/presentation/actions/lotes.ts` | Create | Server Action: thin controller for Lote ops |
| `src/presentation/actions/clientes.ts` | Create | Server Action: thin controller for Cliente ops |
| `src/presentation/actions/ventas.ts` | Create | Server Action: thin controller for Venta ops (session guard) |
| `src/presentation/actions/gastos.ts` | Create | Server Action: thin controller for GastoFijo ops |
| `src/presentation/actions/dashboard.ts` | Create | Server Action: thin controller for metrics |
| `src/app/api/auth/[...nextauth]/route.ts` | Create | Auth.js catch-all API route |
| `src/app/login/page.tsx` | Create | Login page with credentials form |
| `src/middleware.ts` | Create | Next.js middleware: protect all routes except /login and /api/auth; guard Server Actions |
| `src/app/page.tsx` | Create | Dashboard page (thin) |
| `src/app/lotes/page.tsx` | Create | Lotes list page (thin) |
| `src/app/ventas/page.tsx` | Create | Ventas list page (thin) |
| `src/app/clientes/page.tsx` | Create | Clientes list page (thin) |
| `src/app/gastos/page.tsx` | Create | Gastos page (thin) |
| `prisma/seed.ts` | Create | Seed script: upsert admin user (admin@riquesos.com) + two base products |
| `scripts/backup.ts` | Create | Backup script: copy dev.db → /backups/backup-dev-{date}.db |
| `vitest.config.ts` | Create | Vitest configuration |
| `package.json` | Create | Project config: Next.js, Prisma, Vitest, Auth.js, Pino, bcrypt; scripts for seed + backup |

## Interfaces / Contracts

### Repository Port — LoteRepository

```typescript
interface LoteRepository {
  findById(id: string): Promise<Lote | null>;
  findActive(): Promise<Lote[]>;
  findByProveedor(proveedorId: string): Promise<Lote[]>;
  save(lote: Lote): Promise<Lote>;
  deductStock(id: string, cantidadKg: Decimal, expectedVersion: number): Promise<Lote>;
}
```

### Repository Port — VentaRepository

```typescript
interface VentaRepository {
  save(venta: Venta): Promise<Venta>;
  findByDateRange(inicio: Date, fin: Date): Promise<Venta[]>;
  findByCliente(clienteId: string): Promise<Venta[]>;
  sumIngresosByPeriod(inicio: Date, fin: Date): Promise<Decimal>;
  sumCostosByPeriod(inicio: Date, fin: Date): Promise<Decimal>;
}
```

### Repository Port — UsuarioRepository

```typescript
interface UsuarioRepository {
  findByEmail(email: string): Promise<Usuario | null>;
  save(usuario: Usuario): Promise<Usuario>;
}
```

### Key Domain Types

```typescript
// src/domain/enums.ts
enum TipoProducto { DOBLE_CREMA, SEMISALADO }
enum TipoCliente { MAYORISTA, MINORISTA }
enum EstadoLote { ACTIVO, AGOTADO }
enum RolUsuario { ADMIN }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Domain entities (Lote cost calc, Venta immutability, Cliente pricing, GastoFijo validation, Usuario auth) | Vitest + pure domain, zero DB imports |
| Unit | Value objects (Dinero arithmetic, Kilogramo positive-only) | Vitest, no mocking needed |
| Unit | Use cases (CrearLote, RegistrarVenta, ObtenerMetricas, AutenticarUsuario) | Vitest + mock repository ports |
| Unit | Concurrency: optimistic locking rejection + retry logic | Vitest + mock LoteRepository with version mismatch |
| Unit | Auth: wrong password, unknown email, valid login | Vitest + mock UsuarioRepository |
| Integration | Prisma repo implementations against SQLite (including $transaction with version check) | Vitest + real SQLite test DB |
| Integration | Auth.js session creation and middleware redirect | Vitest + Next.js test helpers |
| Script | Seed idempotency (run twice → same state), backup file creation + idempotency | Vitest + temp test DB |
| E2E | Auth flow: login → protected route → Server Action → metrics | Next.js test mode or manual verification |

## Migration / Rollout

No migration required — greenfield project. Git history preserves all iterations. `prisma db seed` populates baseline data on first setup.

## Open Questions

- [ ] UI component library choice (shadcn/ui, plain Tailwind, etc.) — out of scope for scaffold, needs separate decision
- [ ] Whether GastoFijo needs soft-delete or hard-delete — spec says CRUD, PRD implies hard-delete
- [ ] Password hashing: bcrypt vs argon2 — bcrypt is simpler, argon2 is stronger; spec says bcrypt
- [ ] Session duration and idle timeout — default Auth.js settings or custom maxAge?
- [ ] Backup automation: manual npm script only, or also cron/PM2 integration?
- [ ] Log rotation strategy — Pino file transport doesn't auto-rotate; need pino-roll or manual logrotate?