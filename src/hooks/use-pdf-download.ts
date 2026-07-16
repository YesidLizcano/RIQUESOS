'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function usePdfDownload() {
  const [isGenerating, setIsGenerating] = useState(false);

  async function fetchPdf(url: string): Promise<void> {
    setIsGenerating(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setIsGenerating(false);
    }
  }

  async function downloadPdf(url: string, filename: string): Promise<void> {
    setIsGenerating(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status}`);
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('Error al generar el PDF');
    } finally {
      setIsGenerating(false);
    }
  }

  return { isGenerating, downloadPdf, fetchPdf };
}