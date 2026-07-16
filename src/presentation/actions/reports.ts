'use server';

// PDF Report Server Actions — thin controllers that fetch data and generate PDFs
// Returns plain objects with base64-encoded PDF data (Next.js Server Actions cannot return Response objects)
import { requireSession } from './auth';
import { getMetricas } from './dashboard';
import { getCuentasPorCobrar } from './dashboard';
import { getVentasByExactDateRange } from './ventas';
import { generateResultadosPdf } from '@/infrastructure/pdf/templates/resultados';
import { generateCuentasCobrarPdf } from '@/infrastructure/pdf/templates/cuentas-cobrar';
import { generateVentasPeriodoPdf } from '@/infrastructure/pdf/templates/ventas-periodo';

interface PdfResult {
  success: boolean;
  data?: string; // base64-encoded PDF
  filename?: string;
  error?: string;
}

function toBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

export async function generatePdfResultados(inicio: string, fin: string): Promise<PdfResult> {
  await requireSession();
  try {
    const result = await getMetricas(inicio, fin);
    if (!result.success || !result.metricas) {
      return { success: false, error: 'Error al obtener métricas' };
    }
    const buffer = await generateResultadosPdf(result.metricas, inicio, fin);
    const date = new Date().toISOString().slice(0, 10);
    return { success: true, data: toBase64(buffer), filename: `Estado_Resultados_${date}.pdf` };
  } catch (error) {
    return { success: false, error: 'Error al generar PDF' };
  }
}

export async function generatePdfCuentasCobrar(inicio: string, fin: string): Promise<PdfResult> {
  await requireSession();
  try {
    const result = await getCuentasPorCobrar(inicio, fin);
    if (!result.success) {
      return { success: false, error: 'Error al obtener cuentas por cobrar' };
    }
    const buffer = await generateCuentasCobrarPdf(result.cuentas, inicio, fin);
    const date = new Date().toISOString().slice(0, 10);
    return { success: true, data: toBase64(buffer), filename: `Cuentas_Cobrar_${date}.pdf` };
  } catch (error) {
    return { success: false, error: 'Error al generar PDF' };
  }
}

export async function generatePdfVentas(inicio: string, fin: string): Promise<PdfResult> {
  await requireSession();
  try {
    const result = await getVentasByExactDateRange(inicio, fin);
    if (!result.success) {
      return { success: false, error: 'Error al obtener ventas' };
    }
    const buffer = await generateVentasPeriodoPdf(result.ventas, inicio, fin);
    const date = new Date().toISOString().slice(0, 10);
    return { success: true, data: toBase64(buffer), filename: `Ventas_${date}.pdf` };
  } catch (error) {
    return { success: false, error: 'Error al generar PDF' };
  }
}