# Design: crud-forms

**Change**: crud-forms
**Date**: 2026-07-01

---

## Architecture Decisions

### AD-01: Native HTML Forms + Server Actions

**Decision**: Use `<form action={serverAction}>` with named `<input>` fields, NOT react-hook-form.

**Rationale**: All existing Server Actions accept `FormData` — this is the established pattern. Native forms require zero client JS for submission and provide progressive enhancement. Client-side validation can be added later without restructuring.

**Consequence**: No client-side validation in v1. Error messages come from zod server-side validation returned as `{ success: false, error }`. Toast notifications (sonner) display errors.

### AD-02: Zod Server-Side Validation

**Decision**: Add zod schemas in `src/presentation/validations/`. Each Server Action validates FormData via zod before constructing the request DTO.

**Rationale**: Separates validation from domain entities (which have their own `validate()` methods). Zod produces structured error messages. Schemas use Spanish messages per FR-06.

**Pattern**:
```typescript
// validations/lote.schema.ts
export const crearLoteSchema = z.object({
  producto: z.nativeEnum(TipoProducto, { message: "Seleccione un tipo de producto" }),
  proveedorId: z.string().min(1, "Seleccione un proveedor"),
  cantidadCompradaKg: z.coerce.number().positive("Debe ser mayor a 0"),
  // ...
});
```

Server Action change:
```typescript
const parsed = crearLoteSchema.safeParse(Object.fromEntries(formData));
if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
```

### AD-03: Dialog UI Pattern

**Decision**: shadcn `Dialog` component for all 5 creation forms. Each form is a Client Component (`'use client'`) with `useState` for dialog open/close state.

**Rationale**: Dialogs are consistent, simple for 2-7 field forms, and already recommended by shadcn. The project needs `dialog` and `select` shadcn components installed.

**Component structure**:
```
src/components/forms/
  crear-lote-dialog.tsx      # 'use client'
  crear-cliente-dialog.tsx   # 'use client'
  registrar-venta-dialog.tsx # 'use client'
  crear-gasto-fijo-dialog.tsx # 'use client'
  crear-proveedor-dialog.tsx # 'use client'
```

Each dialog receives data for selects as props from the Server Component page:
```typescript
// In lotes/page.tsx (Server Component)
const proveedores = await getProveedores();
return <CrearLoteDialog proveedores={proveedores} />
```

### AD-04: Proveedor Infrastructure Gap

**Decision**: Create full Proveedor infrastructure before building forms (Phase 1 of tasks).

**Required files**:
- `src/presentation/actions/proveedores.ts` — Server Action (pattern: `gastos.ts`)
- `src/application/use-cases/GestionarProveedores.ts` — Use case (pattern: `GestionarClientes.ts`)
- `src/presentation/dtos/proveedor.dto.ts` — DTO
- `src/presentation/validations/proveedor.schema.ts` — Zod schema

`PrismaProveedorRepo` already has full CRUD. No changes needed there.

### AD-05: Data Loading for Selects

**Decision**: Server Components fetch reference data (Proveedores, Clientes, Lotes) and pass as props to Client Component dialogs.

**Rationale**: Server Components can call Server Actions directly for data fetching. Client Components cannot import Server Actions directly — they receive data via props.

### AD-06: Proveedor Management Access Point

**Decision**: Add a Proveedores section in the sidebar navigation and a `/proveedores` page with the same list + dialog pattern. This is needed because no Proveedor list page currently exists.

**Alternative considered**: Embed Proveedor creation inside the Lote form. Rejected — Proveedores need independent CRUD management.

## File Changes

### New Files (~18)
| File | Purpose |
|------|---------|
| `src/presentation/actions/proveedores.ts` | Proveedor Server Action (CRUD) |
| `src/application/use-cases/GestionarProveedores.ts` | Proveedor use case |
| `src/presentation/dtos/proveedor.dto.ts` | Proveedor DTOs |
| `src/presentation/validations/lote.schema.ts` | Zod schema for Lote |
| `src/presentation/validations/cliente.schema.ts` | Zod schema for Cliente |
| `src/presentation/validations/venta.schema.ts` | Zod schema for Venta |
| `src/presentation/validations/gasto-fijo.schema.ts` | Zod schema for GastoFijo |
| `src/presentation/validations/proveedor.schema.ts` | Zod schema for Proveedor |
| `src/components/forms/crear-lote-dialog.tsx` | Lote creation dialog |
| `src/components/forms/crear-cliente-dialog.tsx` | Cliente creation dialog |
| `src/components/forms/registrar-venta-dialog.tsx` | Venta registration dialog |
| `src/components/forms/crear-gasto-fijo-dialog.tsx` | GastoFijo creation dialog |
| `src/components/forms/crear-proveedor-dialog.tsx` | Proveedor creation dialog |
| `src/app/(dashboard)/proveedores/page.tsx` | Proveedores list page |

### Modified Files (~5)
| File | Change |
|------|--------|
| `src/app/(dashboard)/lotes/page.tsx` | Add "Agregar Lote" button + dialog import |
| `src/app/(dashboard)/clientes/page.tsx` | Add "Agregar Cliente" button + dialog import |
| `src/app/(dashboard)/ventas/page.tsx` | Add "Registrar Venta" button + dialog import |
| `src/app/(dashboard)/gastos/page.tsx` | Add "Agregar Gasto" button + dialog import |
| `src/components/app-sidebar.tsx` | Add Proveedores nav item |
| `src/presentation/actions/lotes.ts` | Add zod validation |
| `src/presentation/actions/clientes.ts` | Add zod validation |
| `src/presentation/actions/ventas.ts` | Add zod validation |
| `src/presentation/actions/gastos.ts` | Add zod validation |

### Dependencies
- Add `zod` to package.json
- Install shadcn components: `dialog`, `select`

## Sequence: Lote Creation Form

```
User clicks "Agregar Lote"
  → Dialog opens (Client Component, state: open=true)
  → Form displays Select for Proveedor (fetched via Server Component prop)
  → User fills fields, clicks Submit
  → Native form submission → crearLote(formData) Server Action
  → Server Action: zod validate → if fail, return { success: false, error }
  → Server Action: construct CrearLoteRequest → CrearLote.execute()
  → On success: revalidatePath('/lotes'), return { success: true, lote }
  → Client: dialog closes, toast shows success, table refreshes
  → On error: toast shows error message (Spanish)
```