## Exploration: Initial Scaffold for Pagina-Riquesos

### Current State

This is a **greenfield project** — no source code exists. The only file is `PRD-Riquesos.md`, which defines a backoffice system for a cheese distributor (distribuidora de quesos). The OpenSpec structure has been initialized (`openspec/config.yaml`, empty `specs/` and `changes/` directories). No testing infrastructure exists yet.

The PRD defines five core domain models (Proveedor, Lote, Cliente, Venta, GastoFijo) and three core operations (crearLote, registrarVenta, obtenerDashboardMetricas). The business logic is straightforward but has important invariants: batch-level inventory tracking, per-client pricing rules, and atomic sale transactions with stock validation.

### Affected Areas

- `src/` (entire — doesn't exist yet) — All application source code
- `prisma/schema.prisma` — Database schema definition (doesn't exist yet)
- `package.json` — Project configuration (doesn't exist yet)
- `next.config.ts` — Next.js configuration (doesn't exist yet)
- `openspec/specs/` — Will receive delta specs from sdd-spec phase

### Approaches

#### 1. Clean Architecture with Server Actions (Recommended)

Structure the Next.js app using Clean Architecture / Hexagonal principles with Server Actions as the delivery mechanism.

**Directory structure:**
```
src/
├── domain/
│   ├── entities/
│   │   ├── lote.ts          # Lote entity with cost calculation logic
│   │   ├── cliente.ts       # Cliente entity with pricing rules
│   │   ├── venta.ts         # Venta entity with revenue/cost/profit logic
│   │   ├── gasto-fijo.ts    # GastoFijo entity
│   │   └── proveedor.ts     # Proveedor entity
│   ├── value-objects/
│   │   ├── dinero.ts         # Money value object (precision-safe)
│   │   ├── kilogramo.ts      # Weight value object
│   │   ├── tipo-cliente.ts   # Enum: MAYORISTA | MINORISTA
│   │   └── tipo-producto.ts  # Enum: DOBLE_CREMA | SEMISALADO
│   ├── enums/
│   │   └── estado-lote.ts    # Enum: ACTIVO | AGOTADO
│   └── ports/
│       ├── lote-repository.ts       # Interface for Lote persistence
│       ├── cliente-repository.ts    # Interface for Cliente persistence
│       ├── venta-repository.ts      # Interface for Venta persistence
│       ├── gasto-fijo-repository.ts # Interface for GastoFijo persistence
│       └── proveedor-repository.ts  # Interface for Proveedor persistence
├── application/
│   └── use-cases/
│       ├── crear-lote.ts           # Use case: create batch + calculate costs
│       ├── registrar-venta.ts      # Use case: atomic sale transaction
│       ├── obtener-metricas.ts      # Use case: dashboard aggregation
│       ├── gestionar-clientes.ts   # Use case: CRUD + pricing
│       └── gestionar-gastos.ts     # Use case: fixed expenses CRUD
├── infrastructure/
│   ├── prisma/
│   │   └── prisma-lote-repository.ts     # Implements domain port
│   │   └── prisma-cliente-repository.ts  # Implements domain port
│   │   └── prisma-venta-repository.ts    # Implements domain port
│   │   └── prisma-gasto-fijo-repository.ts
│   │   └── prisma-proveedor-repository.ts
│   └── db.ts                         # Prisma client singleton
├── presentation/
│   ├── actions/
│   │   ├── lote-actions.ts           # Server Actions for Lote
│   │   ├── venta-actions.ts          # Server Actions for Venta
│   │   ├── cliente-actions.ts        # Server Actions for Cliente
│   │   ├── gasto-fijo-actions.ts     # Server Actions for GastoFijo
│   │   └── dashboard-actions.ts      # Server Actions for Dashboard
│   └── dto/
│       └── (request/response types)  # Plain DTOs crossing boundaries
├── app/                              # Next.js App Router (thin layer)
│   ├── layout.tsx
│   ├── page.tsx                      # Dashboard
│   ├── lotes/
│   ├── ventas/
│   ├── clientes/
│   └── gastos/
└── lib/
    └── (shared utilities if needed)
```

- **Pros:**
  - Dependency Rule enforced: domain has ZERO framework/DB imports
  - Server Actions act as controllers (interface adapters) — they receive HTTP-like input, call use cases, return DTOs
  - Prisma stays in infrastructure layer, never leaks into domain
  - Each layer testable independently (domain with pure unit tests, use cases with mock ports, adapters with integration tests)
  - Business rules (cost calculation, pricing logic, stock validation) live in entities/use cases, NOT in API routes
  - Easy to swap Prisma for another ORM or SQLite for PostgreSQL without touching domain logic
  - Aligns with `clean-architecture` skill rules

- **Cons:**
  - More files and directories than a flat structure
  - Learning curve if team is unfamiliar with Clean Architecture
  - Server Actions are a Next.js-specific pattern — the "controller adapter" layer needs discipline to keep thin

- **Effort**: Medium — more initial scaffolding but pays off as business logic grows

#### 2. Flat Next.js App Router with Server Actions (Simple)

Put all business logic directly in Server Actions or in simple service files, no architectural layering.

**Directory structure:**
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── lotes/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── ventas/
│   │   ├── page.tsx
│   │   └── actions.ts
│   ├── clientes/
│   │   ├── page.tsx
│   │   └── actions.ts
│   └── gastos/
│       ├── page.tsx
│       └── actions.ts
├── lib/
│   ├── db.ts                  # Prisma client
│   ├── calculations.ts        # Cost calculation helpers
│   └── types.ts               # TypeScript types
└── prisma/
    └── schema.prisma
```

- **Pros:**
  - Familiar Next.js conventions, minimal setup
  - Fewer files, faster to start
  - Good for small scope / throwaway prototypes

- **Cons:**
  - Business logic (cost calculations, pricing rules, stock validation) mixes with HTTP/Server Action concerns
  - Prisma models leak into business logic — hard to test without DB
  - No clear boundaries — as complexity grows, changes ripple unpredictably
  - Violates Clean Architecture Dependency Rule (outer layer details in business logic)
  - Swapping Prisma or SQLite later requires touching business code

- **Effort**: Low initially, but increases as features accumulate

#### 3. Feature-Based Modules with Clean Architecture

Group by feature (lote, venta, cliente, gasto-fijo) instead of by layer, but keep Clean Architecture separation within each feature module.

**Directory structure:**
```
src/
├── features/
│   ├── lote/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   ├── venta/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── presentation/
│   └── ...
├── shared/
│   ├── domain/
│   │   └── value-objects/
│   └── infrastructure/
│       └── db.ts
└── app/
    ├── layout.tsx
    └── (routes delegating to features)
```

- **Pros:**
  - Best of both worlds: feature cohesion + Clean Architecture
  - Easier to navigate by domain concept
  - Scales well with many features
  - Each feature can be reasoned about independently

- **Cons:**
  - More complex initial scaffold
  - Cross-feature dependencies (Venta depends on Lote and Cliente) need careful management
  - Risk of circular imports if not disciplined
  - Overkill for 4-5 features

- **Effort**: Medium-High — more upfront design decisions

### Domain Model Analysis

From the PRD, the following domain elements emerge:

**Entities (identity + lifecycle):**
- `Proveedor` — Supplier of cheese batches
- `Lote` — A batch of cheese entering inventory; has lifecycle (ACTIVO → AGOTADO)
- `Cliente` — Buyer; behavior differs by type (MAYORISTA vs MINORISTA)
- `Venta` — A sale transaction; immutable once recorded (financial audit)
- `GastoFijo` — Monthly fixed expense; no complex lifecycle

**Value Objects (no identity, defined by attributes):**
- `Dinero` — Money amounts (should avoid float precision issues; consider integer cents or Decimal)
- `Kilogramo` — Weight in Kg (domain concept: everything converts to Kg)
- `TipoProducto` — DOBLE_CREMA | SEMISALADO
- `TipoCliente` — MAYORISTA | MINORISTA
- `EstadoLote` — ACTIVO | AGOTADO

**Key Business Rules (must live in domain/use cases, NOT in infrastructure):**
1. Cost calculation: `Costo_Real_Por_Kg = (Precio_Base * Cantidad + Flete + Tajado + Empaques) / Cantidad`
2. Stock validation: `Cantidad_Vendida <= Stock_Disponible_Lote` (enforced before sale)
3. Per-client pricing: Mayorista uses custom prices, Minorista uses standard prices
4. Atomic sale: stock deduction + sale recording must be a single transaction
5. Lote status transition: ACTIVO → AGOTADO when stock hits zero

**Use Cases:**
1. `CrearLote` — Create batch, calculate real cost, set initial stock
2. `RegistrarVenta` — Validate stock, resolve price by client type, calculate revenue/cost/profit, deduct stock, record sale (atomic)
3. `ObtenerMetricasDashboard` — Aggregate income, costs, fixed expenses, net profit by date range
4. `GestionarClientes` — CRUD + pricing rules
5. `GestionarGastosFijos` — CRUD for monthly expenses
6. `GestionarProveedores` — CRUD for suppliers

### Server Actions vs API Routes

**Recommendation: Server Actions** as the primary delivery mechanism, with API Routes only if needed for external integrations.

| Aspect | Server Actions | API Routes |
|--------|--------------|------------|
| Type safety | Full end-to-end TypeScript | Need manual type definitions |
| Client integration | `useServerReference` + forms | fetch + JSON parsing |
| Simplicity | Single function per action | Route + handler boilerplate |
| External access | Next.js client only | Any HTTP client (Tailscale) |
| Deployment fit | Perfect for backoffice | Needed if external systems call in |

Since this is a backoffice system accessed via LAN/Tailscale by a small number of users, Server Actions provide the simplest path. If Tailscale users need direct API access (e.g., mobile app later), API Routes can be added as a thin adapter layer later without changing domain or use case code.

### Database Schema Considerations

**Prisma + SQLite specifics:**
- Use `@default(autoincrement())` for `Int` IDs or `@default(uuid())` for `String` IDs — PRD suggests String/UUID
- `Float` type in Prisma maps to SQLite REAL — adequate for this domain but consider using Prisma's `Decimal` type for money to avoid float precision issues
- SQLite has no native enum — Prisma will create string columns for enums
- No concurrent writes expected (single-user backoffice) — SQLite is perfect for this use case
- `costoRealCalculadoKg` and `stockDisponibleKg` should be indexed for dashboard aggregation queries

**Critical decision: Money representation**
- Prisma `Float` for money can cause rounding errors (e.g., 0.1 + 0.2 ≠ 0.3)
- Options: (a) Use Prisma `Decimal` type (maps to string in SQLite, precise), (b) Store as integer cents, (c) Accept float imprecision for a backoffice app
- **Recommendation**: Use `Decimal` for all monetary fields in Prisma. In the domain layer, use a `Dinero` value object that wraps the value and handles arithmetic precisely.

### Testing Strategy

Given the greenfield nature, set up testing from day one:

| Layer | Tool | Purpose |
|-------|------|---------|
| Domain entities + value objects | Vitest | Pure unit tests, zero dependencies |
| Use cases | Vitest + mocks | Test business logic with mock repositories |
| Infrastructure (Prisma) | Vitest + in-memory SQLite | Integration tests for repository adapters |
| Server Actions / API | Vitest + MSW or manual | Integration tests for delivery layer |
| UI components | Vitest + Testing Library | Component tests |

**Priority order for initial scaffold:**
1. Domain entity tests (highest value, easiest to write)
2. Use case tests (validate business rules)
3. Infrastructure integration tests (validate Prisma mappings)
4. UI tests (defer to later phases)

### Deployment Considerations

- **Local server**: `.bat` script runs `next start` on a Windows machine
- **LAN access**: Next.js binds to `0.0.0.0` — must configure in `next.config.ts`
- **Tailscale VPN**: No special config needed; Tailscale provides the network overlay
- **SQLite file location**: Use absolute path in Prisma config; ensure the `.db` file is on a persistent volume
- **No cloud**: Zero cloud costs; the entire stack runs on a single machine

### Recommendation

**Approach 1: Clean Architecture with Server Actions** is recommended because:

1. The business domain has clear, non-trivial rules (cost calculations, per-client pricing, atomic stock validation) that benefit from isolated, testable entities
2. The `clean-architecture` skill is available and should be leveraged
3. The domain is small enough (5 entities, 6 use cases) that the scaffolding effort is manageable
4. Testing business rules in isolation provides high confidence before any UI is built
5. The project will grow — new product types, pricing rules, or reporting needs are likely — Clean Architecture makes this evolution safe

The feature-based approach (Approach 3) is a good evolution path if the project grows beyond 8-10 features, but for the current scope, layer-based Clean Architecture (Approach 1) is simpler to scaffold and navigate.

### Risks

1. **Float precision for money**: Using `Float` for monetary values in Prisma/SQLite will cause rounding errors. Must use `Decimal` type or integer cents from day one.
2. **Server Actions learning curve**: If the team is unfamiliar with Server Actions, there may be confusion about when to use them vs API Routes. Document the convention early.
3. **Atomic sale transaction**: The `registrarVenta` use case requires a database transaction (stock deduction + sale recording). Prisma supports interactive transactions (`$transaction`) which must be used here.
4. **SQLite concurrent access**: SQLite is single-writer. For a single-user backoffice this is fine, but if multiple users access simultaneously, writes may conflict. Consider WAL mode (`PRAGMA journal_mode=WAL`) in production.
5. **Over-engineering risk**: Clean Architecture adds initial overhead. If the project never grows beyond basic CRUD, the layers add indirection without clear benefit. Mitigate by keeping layers thin and not over-abstracting.

### Ready for Proposal

**Yes** — the exploration is complete. The orchestrator should proceed to `sdd-propose` to create a formal change proposal for the `initial-scaffold` change, incorporating the recommended approach (Clean Architecture with Server Actions) and the risks identified above.