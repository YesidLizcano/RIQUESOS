# Design: PDF Reports

## Technical Approach

PDF generation is an **Infrastructure** concern — an output format adapter, like Prisma is a persistence adapter. Server Actions orchestrate: call existing Use Case → pass DTOs to a PDF template function → return pdfmake `Buffer` as a `Response` with download headers. The client triggers the download via a Blob URL pattern (different from the existing client-side Excel export which uses `xlsx.writeFile` directly).

Data flow:

```
UI Button → Server Action → Use Case (existing) → PDF Template (infra) → pdfmake → Buffer → Response → Browser download
```

No new Use Cases or Domain changes — only Infrastructure (pdf templates) and Presentation (actions + UI buttons).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| PDF library | pdfmake | jsPDF, Puppeteer, React-PDF | Pure JS, server-side, table-first layout, no headless browser needed |
| Layer placement | Infrastructure | Domain, Presentation | Output formatting is an infrastructure adapter; domain has no PDF concepts |
| Client download | Blob URL from Server Action | API route, static generation | Server Actions already exist for data; avoids new route files; keeps auth consistent |
| pdfmake import | Dynamic `await import('pdfmake')` in Server Action | Top-level import | Tree-shaking and avoiding Next.js SSR bundle issues with pdfmake's browser stubs |
| Font | Roboto (pdfmake built-in vfs) | Custom font download | Built-in, Latin-1 covers Spanish, zero config |
| Date range | Pass existing `inicio`/`fin` state | Separate date picker | Reuses current period selection — user sees what they export |

## Data Flow

```
Dashboard Page                     Ventas Page
     │                                  │
     ├─ onPdfResultados(inicio,fin)     ├─ onPdfVentas(inicio,fin)
     ├─ onPdfCuentasCobrar(inicio,fin)  │
     │                                  │
     ▼                                  ▼
 Server Action (reports.ts)        Server Action (reports.ts)
     │                                  │
     ├─ getMetricas(inicio,fin)        ├─ getVentasByExactDateRange(inicio,fin)
     ├─ getCuentasPorCobrar(inicio,fin)│
     │                                  │
     ▼                                  ▼
 PDF Template (infrastructure)      PDF Template (infrastructure)
     │                                  │
     ▼                                  ▼
 pdfmake → Buffer → Response        pdfmake → Buffer → Response
     │                                  │
     ▼                                  ▼
 Client: Blob → <a> download        Client: Blob → <a> download
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/infrastructure/pdf/pdfmake-config.ts` | Create | pdfmake font registration, base style definitions, currency/date format helpers |
| `src/infrastructure/pdf/templates/shared.ts` | Create | `createHeader()`, `createFooter()`, `createStyles()`, table layout helpers |
| `src/infrastructure/pdf/templates/resultados.ts` | Create | `generateResultadosPdf()` — Estado de Resultados PDF |
| `src/infrastructure/pdf/templates/cuentas-cobrar.ts` | Create | `generateCuentasCobrarPdf()` — Cuentas por Cobrar PDF |
| `src/infrastructure/pdf/templates/ventas-periodo.ts` | Create | `generateVentasPdf()` — Ventas por Período PDF |
| `src/presentation/actions/reports.ts` | Create | 3 Server Actions: `generatePdfResultados`, `generatePdfCuentasCobrar`, `generatePdfVentas` |
| `src/app/(dashboard)/dashboard-client-page.tsx` | Modify | Add PDF button handlers, loading states, pass to toolbar |
| `src/app/(dashboard)/ventas/ventas-client-page.tsx` | Modify | Add PDF button handler, loading state, pass to toolbar |
| `src/components/data-table-toolbar.tsx` | Modify | Add `pdfButtons` prop for PDF download buttons alongside Excel |
| `package.json` | Modify | Add `pdfmake` dependency |

## Interfaces / Contracts

### `src/infrastructure/pdf/pdfmake-config.ts`

```typescript
import PdfPrinter from 'pdfmake';

// Roboto fonts are bundled in pdfmake's vfs.js
const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

export const printer = new PdfPrinter(fonts);

/** Format number as Argentine peso: $150.000 */
export function pdfCurrency(value: string | number): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '$0';
  return `$${Math.round(num).toLocaleString('es-AR')}`;
}

/** Format ISO date string as dd/MM/yyyy */
export function pdfDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
```

### `src/infrastructure/pdf/templates/shared.ts`

```typescript
export function createHeader(title: string, periodRange: string): object {
  // Returns pdfmake header: company name + report title + period, right-aligned
  return {
    columns: [
      { text: 'Distribuidora de Quesos Riquesos', style: 'companyName' },
      { text: `${title}\n${periodRange}`, alignment: 'right', style: 'headerRight' },
    ],
    margin: [40, 20, 40, 10],
  };
}

export function createFooter(): object {
  // Returns pdfmake footer: "Página X de Y" + generation date
  return (currentPage: number, pageCount: number) => ({
    columns: [
      { text: `Generado: ${new Date().toLocaleDateString('es-AR')}`, style: 'footerText' },
      { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', style: 'footerText' },
    ],
    margin: [40, 10, 40, 20],
  });
}

export function createStyles(): object {
  return {
    companyName: { fontSize: 14, bold: true, color: '#1a1a2e' },
    headerRight: { fontSize: 11, color: '#555' },
    sectionTitle: { fontSize: 12, bold: true, margin: [0, 12, 0, 4] as number[], color: '#1a1a2e' },
    tableHeader: { bold: true, fontSize: 9, color: '#fff', fillColor: '#1a1a2e' },
    tableCell: { fontSize: 9 },
    currency: { alignment: 'right', fontSize: 9 },
    footerText: { fontSize: 8, color: '#888' },
  };
}

export function tableLayout(): object {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#ccc',
    vLineColor: () => '#ccc',
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  };
}
```

### `src/infrastructure/pdf/templates/resultados.ts`

```typescript
import type { DashboardMetricasResponse } from '@/presentation/dtos';
import { printer, pdfCurrency, pdfDate } from '../pdfmake-config';
import { createHeader, createFooter, createStyles, tableLayout } from './shared';

export async function generateResultadosPdf(
  metricas: DashboardMetricasResponse,
  inicio: string,
  fin: string,
): Promise<Buffer> {
  const p = metricas.periodo;
  const periodRange = `${pdfDate(inicio)} — ${pdfDate(fin)}`;

  const docDefinition = {
    pageSize: 'A4' as const,
    pageMargins: [40, 60, 40, 60],
    header: createHeader('Estado de Resultados', periodRange),
    footer: createFooter(),
    styles: createStyles(),
    defaultStyle: { font: 'Roboto' },
    content: [
      // P&L Summary Table
      { text: 'Resumen Financiero', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Concepto', style: 'tableHeader' }, { text: 'Monto', style: 'tableHeader' }],
            ['Ingresos', { text: pdfCurrency(p.ingresoTotal), style: 'currency' }],
            ['Costo de Mercancía', { text: pdfCurrency(p.costoMercancia), style: 'currency' }],
            ['Ganancia Bruta', { text: pdfCurrency(p.gananciaBruta), style: 'currency' }],
            ['Gastos Fijos', { text: pdfCurrency(p.gastosFijos), style: 'currency' }],
            ['Ganancia Neta', { text: pdfCurrency(p.gananciaNeta), style: 'currency' }],
          ],
        },
        layout: tableLayout(),
      },
      // Margins Table
      { text: 'Márgenes', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Métrica', style: 'tableHeader' }, { text: 'Valor', style: 'tableHeader' }],
            ['Margen Bruto', p.margenBrutoPct === 'N/A' ? 'N/A' : `${p.margenBrutoPct}%`],
            ['Margen Neto', p.margenNetoPct === 'N/A' ? 'N/A' : `${p.margenNetoPct}%`],
          ],
        },
        layout: tableLayout(),
      },
      // Desglose por Producto
      { text: 'Desglose por Producto', style: 'sectionTitle' },
      // ... (product breakdown table)
      // Desglose por Proveedor
      { text: 'Desglose por Proveedor', style: 'sectionTitle' },
      // ... (supplier breakdown table)
      // Flujo de Dinero
      { text: 'Flujo de Dinero', style: 'sectionTitle' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            [{ text: 'Canal', style: 'tableHeader' }, { text: 'Monto', style: 'tableHeader' }],
            ['Efectivo', { text: pdfCurrency(metricas.flujoDinero.efectivo), style: 'currency' }],
            ['Bancos (Nequi/Bre-B)', { text: pdfCurrency(metricas.flujoDinero.bancos), style: 'currency' }],
            ['Cuentas por Cobrar', { text: pdfCurrency(metricas.flujoDinero.cuentasPorCobrar), style: 'currency' }],
          ],
        },
        layout: tableLayout(),
      },
    ],
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}
```

### `src/infrastructure/pdf/templates/cuentas-cobrar.ts`

```typescript
import type { CuentaPorCobrar } from '@/application/use-cases/ObtenerCuentasPorCobrar';
import { printer, pdfCurrency, pdfDate } from '../pdfmake-config';
import { createHeader, createFooter, createStyles, tableLayout } from './shared';

export async function generateCuentasCobrarPdf(
  cuentas: CuentaPorCobrar[],
  inicio: string,
  fin: string,
): Promise<Buffer> {
  const periodRange = `${pdfDate(inicio)} — ${pdfDate(fin)}`;
  const totalSaldo = cuentas.reduce((sum, c) => sum + Number(c.saldo), 0);

  const tableBody = cuentas.length > 0
    ? [
        [{ text: 'Cliente', style: 'tableHeader' }, { text: 'Fecha', style: 'tableHeader' },
         { text: 'Ingreso Total', style: 'tableHeader' }, { text: 'Abonado', style: 'tableHeader' },
         { text: 'Saldo Pendiente', style: 'tableHeader' }],
        ...cuentas.map(c => [
          c.clienteNombre,
          pdfDate(c.fecha),
          { text: pdfCurrency(c.ingresoTotal), style: 'currency' },
          { text: pdfCurrency(c.abono), style: 'currency' },
          { text: pdfCurrency(c.saldo), style: 'currency' },
        ]),
        // Footer row with totals
        [{ text: 'TOTAL', bold: true, colSpan: 4 }, {}, {}, {},
         { text: pdfCurrency(totalSaldo), style: 'currency', bold: true }],
      ]
    : [[{ text: 'No hay cuentas por cobrar en este período', colSpan: 5, alignment: 'center' }],
       [{ text: '', colSpan: 5 }, {}, {}, {}, {}]];

  // ... docDefinition with header, footer, table
}
```

### `src/infrastructure/pdf/templates/ventas-periodo.ts`

```typescript
import type { VentaResponse } from '@/presentation/dtos';
import { printer, pdfCurrency, pdfDate } from '../pdfmake-config';
import { createHeader, createFooter, createStyles, tableLayout } from './shared';

const METODO_LABELS: Record<string, string> = {
  EFECTIVO: 'Efectivo', NEQUI: 'Nequi', BRE_B: 'Bre-B', CREDITO: 'Crédito',
};

export async function generateVentasPdf(
  ventas: VentaResponse[],
  inicio: string,
  fin: string,
): Promise<Buffer> {
  // Main table + totals + summary by metodoPago
  // Footer row: total kg, total ingreso, total ganancia
  // Summary section: group by metodoPago with subtotals
}
```

### `src/presentation/actions/reports.ts`

```typescript
'use server';

import { requireSession } from './auth';
import { getMetricas } from './dashboard';
import { getCuentasPorCobrar } from './dashboard';
import { getVentasByExactDateRange } from './ventas';
import { generateResultadosPdf } from '@/infrastructure/pdf/templates/resultados';
import { generateCuentasCobrarPdf } from '@/infrastructure/pdf/templates/cuentas-cobrar';
import { generateVentasPdf } from '@/infrastructure/pdf/templates/ventas-periodo';

function pdfResponse(buffer: Buffer, filename: string): Response {
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function generatePdfResultados(inicio: string, fin: string): Promise<Response> {
  await requireSession();
  const result = await getMetricas(inicio, fin);
  if (!result.success || !result.metricas) {
    return new Response('Error generating PDF', { status: 500 });
  }
  const buffer = await generateResultadosPdf(result.metricas, inicio, fin);
  const date = new Date().toISOString().slice(0, 10);
  return pdfResponse(buffer, `Estado_Resultados_${date}.pdf`);
}

export async function generatePdfCuentasCobrar(inicio: string, fin: string): Promise<Response> {
  await requireSession();
  const result = await getCuentasPorCobrar(inicio, fin);
  if (!result.success) {
    return new Response('Error generating PDF', { status: 500 });
  }
  const buffer = await generateCuentasCobrarPdf(result.cuentas, inicio, fin);
  const date = new Date().toISOString().slice(0, 10);
  return pdfResponse(buffer, `Cuentas_Cobrar_${date}.pdf`);
}

export async function generatePdfVentas(inicio: string, fin: string): Promise<Response> {
  await requireSession();
  const result = await getVentasByExactDateRange(inicio, fin);
  if (!result.success) {
    return new Response('Error generating PDF', { status: 500 });
  }
  const buffer = await generateVentasPdf(result.ventas, inicio, fin);
  const date = new Date().toISOString().slice(0, 10);
  return pdfResponse(buffer, `Ventas_${date}.pdf`);
}
```

## Client-side Download Pattern

The Excel export runs client-side (`xlsx.writeFile`). PDF generation runs **server-side** via pdfmake, so the client must:

```typescript
async function handlePdfDownload(action: () => Promise<Response>, filename: string) {
  setIsGenerating(true);
  try {
    const response = await action();
    if (!response.ok) throw new Error('PDF generation failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error('Error al generar el PDF');
  } finally {
    setIsGenerating(false);
  }
}
```

This pattern differs from the Excel hook because: (1) data goes to server and back, (2) response is a binary blob, (3) we trigger download via a temporary `<a>` element.

## UI Changes

### Dashboard (`dashboard-client-page.tsx`)

Add two `useState(false)` for loading states: `isPdfResultados`, `isPdfCuentasCobrar`. Add handlers that call `handlePdfDownload(() => generatePdfResultados(inicio, fin), ...)` and similar for Cuentas. Add two `<Button>` components next to the existing "Exportar Excel" button, each with `FileText` icon from lucide-react.

### Ventas (`ventas-client-page.tsx`)

Add `isPdfVentas` state and handler. Add `<Button>` with `FileText` icon next to the `DataTableToolbar` export button. Since Ventas uses `DataTableToolbar`, we need to extend it.

### DataTableToolbar (`data-table-toolbar.tsx`)

Add optional `pdfButtons` prop:

```typescript
interface PdfButtonConfig {
  label: string;
  onClick: () => Promise<void>;
  loading: boolean;
}

interface DataTableToolbarProps<TData> {
  // ... existing props
  pdfButtons?: PdfButtonConfig[];
}
```

Render each PDF button as `<Button variant="outline" size="sm">` with `FileText` icon, positioned before the Excel button.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `pdfCurrency`, `pdfDate` helpers | Vitest: verify `$150.000` format, `dd/MM/yyyy` format, zero handling |
| Unit | `createHeader`, `createFooter`, `createStyles` | Vitest: assert correct pdfmake structure keys |
| Integration | `generateResultadosPdf` with mock metricas | Vitest: call with zero-revenue data, verify Buffer returned, no crash |
| Integration | `generateCuentasCobrarPdf` with empty array | Verify "No hay cuentas" message renders |
| Integration | `generateVentasPdf` with single venta | Verify single row + totals + summary |
| E2E | Dashboard PDF buttons exist | Playwright: verify 2 PDF buttons visible on Dashboard |
| E2E | Ventas PDF button triggers download | Playwright: click → verify download starts with `.pdf` extension |

## Migration / Rollout

No migration required. Add `pdfmake` to `package.json` dependencies. Rollback: remove the dependency and delete `src/infrastructure/pdf/`, the 3 server actions, and the UI buttons.

## Open Questions

- [ ] Should we add PDF preview in-browser (inline `Content-Disposition: inline`) or stick with direct download only? Spec says "direct download only" — confirmed.