# Spec: filters-search

## FR-01: Global Search

Each list page SHALL have a search Input in the toolbar. Search SHALL filter rows by case-insensitive partial text match on the entity's primary text field(s):

| Entity | Searchable Fields |
|---|---|
| Clientes | nombre |
| Proveedores | nombre, telefono |
| Lotes | (no text search; select filters only) |
| Ventas | domiciliario |
| Gastos | concepto |

Search SHALL apply as a TanStack Table `globalFilter` using `includesString` filter function. Clearing the search Input SHALL remove the global filter.

## FR-02: Entity-Specific Select Filters

Each list page SHALL have Select filter dropdowns appropriate to the entity. Each Select SHALL include a "Todos" option that disables that filter.

| Entity | Filter | Options |
|---|---|---|
| Clientes | tipo | MAYORISTA, MINORISTA, Todos |
| Lotes | producto | DOBLE_CREMA, SEMISALADO, Todos |
| Lotes | estado | ACTIVO, AGOTADO, Todos |
| Lotes | proveedor | {dynamic list of proveedor nombres}, Todos |
| Ventas | cliente | {dynamic list of cliente nombres}, Todos |
| Ventas | producto | DOBLE_CREMA, SEMISALADO, Todos |
| Proveedores | (none beyond search) | — |
| Gastos | (none beyond search) | — |

Proveedor and cliente dropdowns SHALL derive options from data already fetched for creation dialogs — no additional API calls.

## FR-03: Toolbar Component

A reusable `DataTableToolbar` component SHALL render above the DataTable, containing the search Input and entity-specific Select filters. The toolbar SHALL accept configuration props specifying which filters to display and their options. Filters and search SHALL combine with AND logic — a row MUST match ALL active filters to appear.

## FR-04: Combined Filtering Logic

Search and Select filters SHALL combine with AND logic. A row passes the filter if and only if it matches the global search term AND every active column filter. Clearing all filters (search empty, all selects on "Todos") SHALL restore the full unfiltered dataset.

## FR-05: Lotes findAll

The `LoteRepository` port SHALL define a `findAll()` method that returns all lotes regardless of estado (both ACTIVO and AGOTADO). `PrismaLoteRepo` SHALL implement `findAll()` using `prisma.lote.findMany({ orderBy: { createdAt: 'desc' } })` without an estado filter. The Lotes list page SHALL use `findAll()` instead of `findActive()` to support estado filtering.

## FR-06: Foreign Key Resolution

Lote `proveedorId` and Venta `clienteId` SHALL display as human-readable names in filter dropdowns and table columns. Name lookup maps SHALL be derived from data already fetched for creation dialogs (proveedores for Lotes, clientes for Ventas). No additional API calls SHALL be required.

## NFR-01: Client-Side Only

Filtering SHALL be client-side only — no server round-trips for filter changes.

## NFR-02: Reset on Navigation

Filters SHALL reset when the user navigates away from the page. Filter state SHALL NOT persist across page visits.

## NFR-03: No URL Persistence

Search and filter state SHALL NOT persist in URL params (unlike `pageSize` which does persist).

---

### Scenarios

**Scenario 1: Clientes search + tipo filter**
Given a user is on the Clientes page with 50 clients (30 MAYORISTA, 20 MINORISTA),
When they type "juan" in the search field and select "MAYORISTA" from the tipo filter,
Then the table SHALL show only MAYORISTA clients whose nombre includes "juan" (case-insensitive).

**Scenario 2: Lotes estado filter shows AGOTADO**
Given the Lotes page uses `findAll()` returning both ACTIVO and AGOTADO lotes,
When the user selects "AGOTADO" from the estado filter,
Then the table SHALL show only lotes with estado AGOTADO.

**Scenario 3: Clearing all filters restores full data**
Given a user has active search and select filters on any list page,
When they clear the search input and set all selects to "Todos",
Then the table SHALL show the complete unfiltered dataset.

**Scenario 4: Ventas cliente dropdown shows names**
Given the Ventas page has a list of clientes fetched for the creation dialog,
When the user opens the cliente filter dropdown,
Then they SHALL see cliente names (not UUIDs) as dropdown options.