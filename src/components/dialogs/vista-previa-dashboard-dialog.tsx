'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Download, X } from 'lucide-react';
import type { DashboardPreviewData } from '@/hooks/export-dashboard';

interface VistaPreviaDashboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewData: DashboardPreviewData | null;
  onDownload: () => Promise<void>;
  isExporting: boolean;
}

const MAX_PREVIEW_ROWS = 100;

export function VistaPreviaDashboardDialog({
  open,
  onOpenChange,
  previewData,
  onDownload,
  isExporting,
}: VistaPreviaDashboardDialogProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('0');

  if (!previewData || previewData.sheets.length === 0) return null;

  const currentSheet = previewData.sheets[Number(activeTab)] ?? previewData.sheets[0];
  const truncated = currentSheet.rows.length > MAX_PREVIEW_ROWS;
  const displayRows = truncated ? currentSheet.rows.slice(0, MAX_PREVIEW_ROWS) : currentSheet.rows;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await onDownload();
      onOpenChange(false);
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if ANY sheet has data
  const hasData = previewData.sheets.some((s) => s.rows.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Vista Previa — Dashboard</DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <div className="px-6">
            <TabsList>
              {previewData.sheets.map((sheet, idx) => (
                <TabsTrigger key={sheet.name} value={String(idx)}>
                  {sheet.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {previewData.sheets.map((sheet, idx) => (
            <TabsContent
              key={sheet.name}
              value={String(idx)}
              className="flex-1 min-h-0 overflow-hidden"
            >
              <div className="overflow-x-auto overflow-y-auto px-6 max-h-[60vh]">
                {sheet.rows.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No hay datos para esta hoja</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-white dark:bg-popover border-b-2">
                        {sheet.columns.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 font-semibold text-left whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(idx === Number(activeTab) ? displayRows : sheet.rows.slice(0, MAX_PREVIEW_ROWS)).map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className={rowIdx % 2 === 1 ? 'bg-muted/50' : 'bg-white dark:bg-popover'}
                        >
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-1.5 whitespace-nowrap border-b border-border/50"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {sheet.rows.length > MAX_PREVIEW_ROWS && idx === Number(activeTab) && (
                <p className="px-6 py-2 text-xs text-muted-foreground text-center">
                  Mostrando {MAX_PREVIEW_ROWS} de {sheet.rows.length} filas. El archivo completo se descargará al confirmar.
                </p>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}
          >
            <X className="size-4" />
            Cancelar
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isDownloading || !hasData || isExporting}
          >
            {isDownloading || isExporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Descargar .xlsx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}