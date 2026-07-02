'use client';

import { useState, useCallback } from 'react';
import type { Table } from '@tanstack/react-table';

export interface ColumnMapItem {
  /** Column ID matching a TanStack Table column id or accessorKey.
   *  Used with row.getValue() to extract cell values. */
  key: string;
  /** Spanish header label for the Excel column. */
  header: string;
  /** Optional transform: applied to the raw cell value before writing to Excel.
   *  Use for Number() conversion on Decimal strings, enum label mapping, etc. */
  format?: (value: unknown) => unknown;
}

/**
 * Reusable hook for exporting TanStack Table filtered rows to Excel (.xlsx).
 *
 * Uses dynamic import of `xlsx` to avoid ~900KB in the initial bundle.
 * Respects all current table filters (search, column filters, period, etc.)
 * so "what you see = what you export".
 *
 * @param table  - TanStack Table instance (must have getFilteredRowModel)
 * @param columnMap - Mapping of column key → Spanish header + optional format function
 * @param entityName - Prefix for the filename (e.g. "Clientes")
 * @returns { exportExcel, isExporting }
 */
export function useExportExcel<T>(
  table: Table<T>,
  columnMap: ColumnMapItem[],
  entityName: string,
): { exportExcel: () => Promise<void>; isExporting: boolean } {
  const [isExporting, setIsExporting] = useState(false);

  const exportExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');

      const rows = table.getFilteredRowModel().rows;

      const data = rows.map((row) => {
        const record: Record<string, unknown> = {};
        for (const col of columnMap) {
          const rawValue = row.getValue(col.key);
          record[col.header] = col.format ? col.format(rawValue) : (rawValue ?? '');
        }
        return record;
      });

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, entityName);

      const today = new Date().toISOString().slice(0, 10);
      const filename = `${entityName}_${today}.xlsx`;

      XLSX.writeFile(workbook, filename);
    } finally {
      setIsExporting(false);
    }
  }, [table, columnMap, entityName]);

  return { exportExcel, isExporting };
}