'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  Table,
  useReactTable,
} from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Table as TableUI,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 20;

interface DataTableProps<TData, TValue> {
  columns?: ColumnDef<TData, TValue>[];
  data?: TData[];
  footerRow?: React.ReactNode;
  pagination?: boolean;
  table?: Table<TData>;
}

export function DataTable<TData, TValue>({
  columns = [],
  data = [],
  footerRow,
  pagination = true,
  table: externalTable,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [sorting, setSorting] = useState<SortingState>([]);

  // Read initial page size from URL param or default
  const initialPageSize = useMemo(() => {
    const param = searchParams.get('pageSize');
    if (param) {
      const parsed = parseInt(param, 10);
      if (PAGE_SIZE_OPTIONS.includes(parsed as typeof PAGE_SIZE_OPTIONS[number])) {
        return parsed;
      }
    }
    return DEFAULT_PAGE_SIZE;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageIndex, setPageIndex] = useState(0);

  // Update URL when page size changes
  const handlePageSizeChange = useCallback((value: string) => {
    const newSize = parseInt(value, 10);
    setPageSize(newSize);
    setPageIndex(0); // Reset to first page on size change
    const params = new URLSearchParams(searchParams.toString());
    params.set('pageSize', String(newSize));
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const internalTable = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(pagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    onSortingChange: setSorting,
    onPaginationChange: pagination
      ? (updater) => {
          const newPagination = typeof updater === 'function'
            ? updater({ pageIndex, pageSize })
            : updater;
          setPageIndex(newPagination.pageIndex);
          setPageSize(newPagination.pageSize);
        }
      : undefined,
    state: {
      sorting,
      ...(pagination
        ? { pagination: { pageIndex, pageSize } }
        : {}),
    },
  });

  const table = externalTable ?? internalTable;

  // When pagination is enabled, reset page index if data changes and current page is out of range
  useEffect(() => {
    if (pagination && pageIndex > 0 && pageIndex >= table.getPageCount()) {
      setPageIndex(Math.max(0, table.getPageCount() - 1));
    }
  }, [data.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = pagination ? table.getPageCount() : 1;
  const currentPage = pagination ? table.getState().pagination.pageIndex + 1 : 1;
  const canPreviousPage = pagination ? table.getCanPreviousPage() : false;
  const canNextPage = pagination ? table.getCanNextPage() : false;

  // Build page numbers with ellipsis for large page counts
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  // Hide pagination controls when: disabled, single page, or no data
  const showPagination = pagination && totalPages > 1;

  return (
    <div className="space-y-3">
      {pagination && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">Filas por página</span>
          <Select value={String(pageSize)} onValueChange={(v) => v !== null && handlePageSizeChange(v)}>
            <SelectTrigger size="sm" className="w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="rounded-md border overflow-x-auto">
        <TableUI>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.getCanSort()
                        ? 'cursor-pointer select-none'
                        : ''
                    }
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {footerRow && <TableFooter>{footerRow}</TableFooter>}
        </TableUI>
      </div>
      {showPagination && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  text="Anterior"
                  onClick={() => table.previousPage()}
                  className={!canPreviousPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {pageNumbers.map((page, idx) =>
                page === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={page}>
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-sm cursor-pointer ${
                        page === currentPage
                          ? 'border border-input bg-background font-medium'
                          : 'hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => table.setPageIndex(page - 1)}
                    >
                      {page}
                    </span>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  text="Siguiente"
                  onClick={() => table.nextPage()}
                  className={!canNextPage ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}