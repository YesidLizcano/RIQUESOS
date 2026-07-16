'use client';

import { useState, useCallback } from 'react';
import type { Table } from '@tanstack/react-table';
import type { Column, Worksheet, Workbook } from 'exceljs';

export type ColumnType = 'text' | 'currency' | 'decimal' | 'date' | 'percentage';

export interface ColumnMapItem {
  /** Column ID matching a TanStack Table column id or accessorKey.
   *  Used with row.getValue() to extract cell values. */
  key: string;
  /** Spanish header label for the Excel column. */
  header: string;
  /** Optional transform: applied to the raw cell value and full row before writing to Excel.
   *  Use for enum label mapping, block notation, etc. Numeric conversions are handled by type.
   *  Receives the cell value and the full row.original object for cross-field access. */
  format?: (value: unknown, row: unknown) => unknown;
  /** Column type — determines number format and alignment.
   *  If omitted, inferred from format function or defaults to 'text'. */
  type?: ColumnType;
  /** If true, this column is excluded from the SUM totals row (shows blank instead).
   *  Use for unit prices, rates, or any non-additive column. */
  noSum?: boolean;
}

// ── Number format strings ──────────────────────────────────────────────────
const NUM_FMT: Record<ColumnType, string> = {
  text: '',
  currency: '"$"#,##0',
  decimal: '#,##0.00',
  date: 'DD/MM/YYYY',
  percentage: '0.0%',
};

// ── Style constants ─────────────────────────────────────────────────────────
const HEADER_FILL: Partial<import('exceljs').FillPattern> = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1F4E79' },
};

const ALT_ROW_FILL: Partial<import('exceljs').FillPattern> = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' },
};

const TOTALS_FILL: Partial<import('exceljs').FillPattern> = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF2CC' },
};

const THIN_BORDER: Partial<import('exceljs').Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

const DOUBLE_BOTTOM_BORDER: Partial<import('exceljs').Borders> = {
  top: { style: 'double', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function inferType(col: ColumnMapItem): ColumnType {
  if (col.type) return col.type;
  // Heuristic: if format converts to a number, assume decimal
  return 'text';
}

function isNumericType(t: ColumnType): boolean {
  return t === 'currency' || t === 'decimal' || t === 'percentage';
}

function toCellValue(rawValue: unknown, col: ColumnMapItem, row: unknown): unknown {
  if (col.format) {
    return col.format(rawValue, row);
  }
  const t = inferType(col);
  if (t === 'currency' || t === 'decimal' || t === 'percentage') {
    const num = Number(rawValue);
    return isNaN(num) ? rawValue : num;
  }
  if (t === 'date') {
    // Format as plain text DD/MM/YYYY to avoid Excel format conflicts (#FMT errors)
    if (typeof rawValue === 'string' && rawValue.length >= 10) {
      const [y, m, d] = rawValue.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    if (rawValue instanceof Date) {
      return rawValue.toLocaleDateString('es-CO');
    }
    return rawValue;
  }
  return rawValue ?? '';
}

/** Auto-fit column widths based on header + data, with min 12 / max 40 char width. */
function autoFitColumns(ws: Worksheet, colDefs: ColumnMapItem[], data: unknown[][]) {
  ws.columns.forEach((col, idx) => {
    const header = colDefs[idx]?.header ?? '';
    let maxLen = header.length;
    for (const row of data) {
      const val = row[idx];
      const len = String(val ?? '').length;
      if (len > maxLen) maxLen = len;
    }
    // ExcelJS width ≈ character count; add some padding
    col.width = Math.min(40, Math.max(12, maxLen + 2));
  });
}

/** Style the header row (row 1). */
function styleHeaderRow(ws: Worksheet, colCount: number) {
  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = HEADER_FILL as import('exceljs').FillPattern;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = THIN_BORDER as import('exceljs').Borders;
  }
}

/** Style data rows with alternating colors and type-aware alignment. */
function styleDataRows(
  ws: Worksheet,
  startRow: number,
  endRow: number,
  colDefs: ColumnMapItem[],
) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const isEven = (r - startRow) % 2 === 1;
    for (let c = 1; c <= colDefs.length; c++) {
      const cell = row.getCell(c);
      const t = inferType(colDefs[c - 1]);
      cell.border = THIN_BORDER as import('exceljs').Borders;
      if (isEven) {
        cell.fill = ALT_ROW_FILL as import('exceljs').FillPattern;
      }
      // Alignment: date columns are left-aligned like text (they're DD/MM/YYYY strings)
      if (t === 'text' || t === 'date') {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      }
      // Number format: only for numeric types (date is now plain text, no numFmt needed)
      if (t === 'currency' || t === 'decimal' || t === 'percentage') {
        cell.numFmt = NUM_FMT[t];
      }
    }
  }
}

/** Add a Totals row with SUM formulas for numeric columns. */
function addTotalsRow(
  wb: Workbook,
  ws: Worksheet,
  dataStartRow: number,
  dataEndRow: number,
  colDefs: ColumnMapItem[],
) {
  const totalRowNum = dataEndRow + 1;
  const totalRow = ws.getRow(totalRowNum);
  totalRow.getCell(1).value = 'Totales';
  totalRow.getCell(1).font = { bold: true, size: 11 };
  totalRow.getCell(1).fill = TOTALS_FILL as import('exceljs').FillPattern;
  totalRow.getCell(1).border = DOUBLE_BOTTOM_BORDER as import('exceljs').Borders;
  totalRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };

  for (let c = 2; c <= colDefs.length; c++) {
    const cell = totalRow.getCell(c);
    const colDef = colDefs[c - 1];
    const t = inferType(colDef);
    const colLetter = String.fromCharCode(64 + c); // A=65, B=66…

    cell.fill = TOTALS_FILL as import('exceljs').FillPattern;
    cell.border = DOUBLE_BOTTOM_BORDER as import('exceljs').Borders;

    if (colDef.noSum) {
      // Skip SUM for non-additive columns (e.g. unit prices)
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    } else if (isNumericType(t)) {
      cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${dataEndRow})` };
      cell.numFmt = NUM_FMT[t];
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    } else {
      cell.font = { bold: true, size: 11 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
    }
  }
}

/** Download a workbook buffer as an xlsx file. */
async function downloadWorkbook(wb: Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// ── Main hook ───────────────────────────────────────────────────────────────

/**
 * Reusable hook for exporting TanStack Table filtered rows to Excel (.xlsx).
 *
 * Uses dynamic import of `exceljs` to avoid bloating the initial bundle.
 * Respects all current table filters so "what you see = what you export".
 *
 * Produces professionally styled files with:
 * - Dark blue header row with white bold text
 * - Alternating row colors
 * - Number formats for currency, decimal, date, percentage
 * - Totals row with SUM formulas
 * - Frozen header, auto-filter, auto-fit columns
 */
export function useExportExcel<T>(
  table: Table<T>,
  columnMap: ColumnMapItem[],
  entityName: string,
): { exportExcel: () => Promise<void>; isExporting: boolean; getPreviewData: () => { columnMap: ColumnMapItem[]; data: unknown[][]; entityName: string } } {
  const [isExporting, setIsExporting] = useState(false);

  /** Build the formatted data matrix WITHOUT creating an Excel file.
   *  Used by VistaPreviaExcelDialog to show what will be exported. */
  const getPreviewData = useCallback(() => {
    const rows = table.getFilteredRowModel().rows;
    const data: unknown[][] = rows.map((row) =>
      columnMap.map((col) => {
        // Try TanStack table column first; fall back to row.original for keys
        // that aren't table columns (e.g. 'abono', 'saldo' which are inside
        // composite columns like 'pago')
        const column = table.getColumn(col.key);
        const rawValue = column
          ? row.getValue(col.key)
          : (row.original as Record<string, unknown>)?.[col.key];
        return toCellValue(rawValue, col, row.original);
      }),
    );
    return { columnMap, data, entityName };
  }, [table, columnMap, entityName]);

  const exportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const ExcelJS = await import('exceljs');

      const rows = table.getFilteredRowModel().rows;

      // Build data matrix
      const data: unknown[][] = rows.map((row) =>
        columnMap.map((col) => {
          const column = table.getColumn(col.key);
          const rawValue = column
            ? row.getValue(col.key)
            : (row.original as Record<string, unknown>)?.[col.key];
          return toCellValue(rawValue, col, row.original);
        }),
      );

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Riquesos';
      wb.created = new Date();

      const ws = wb.addWorksheet(entityName, {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      // Define columns
      ws.columns = columnMap.map((col) => ({
        header: col.header,
        key: col.key,
        width: 14, // will be auto-fit below
      }));

      // Add data rows
      for (const row of data) {
        ws.addRow(row);
      }

      // Style header
      styleHeaderRow(ws, columnMap.length);

      // Style data rows (rows 2 to 1+data.length)
      const dataStartRow = 2;
      const dataEndRow = 1 + data.length;
      if (data.length > 0) {
        styleDataRows(ws, dataStartRow, dataEndRow, columnMap);
      }

      // Totals row
      if (data.length > 0) {
        addTotalsRow(wb as Workbook, ws, dataStartRow, dataEndRow, columnMap);
      }

      // Auto-fit column widths
      autoFitColumns(ws, columnMap, data);

      // Auto-filter
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1 + data.length, column: columnMap.length },
      };

      // Download
      const today = new Date().toISOString().slice(0, 10);
      const filename = `${entityName}_${today}.xlsx`;
      await downloadWorkbook(wb as Workbook, filename);
    } finally {
      setIsExporting(false);
    }
  }, [table, columnMap, entityName]);

  return { exportExcel, isExporting, getPreviewData };
}