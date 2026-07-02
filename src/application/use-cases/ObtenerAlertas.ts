// Use Case: ObtenerAlertas — compute stock and age alerts for active lotes
// Application layer: can import from Domain but NOT from Infrastructure
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';
import { EstadoLote } from '../../domain/enums';

export enum AlertaTipo {
  STOCK_BAJO = 'STOCK_BAJO',
  STOCK_CRITICO = 'STOCK_CRITICO',
  ANTIGUO = 'ANTIGUO',
  MUY_ANTIGUO = 'MUY_ANTIGUO',
}

export enum AlertaSeveridad {
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface AlertaLote {
  loteId: string;
  tipoProducto: string;
  proveedorNombre: string;
  stockDisponibleKg: string;
  cantidadCompradaKg: string;
  porcentajeRestante: number;
  diasEnInventario: number;
  alertType: AlertaTipo;
  severity: AlertaSeveridad;
  mensaje: string;
}

export interface AlertasResult {
  alertas: AlertaLote[];
  resumen: {
    stockBajo: number;
    stockCritico: number;
    antiguo: number;
    muyAntiguo: number;
    total: number;
  };
}

// Hardcoded thresholds — easily discoverable, future extraction point
const UMBRALES = {
  STOCK_BAJO_KG: 50,
  STOCK_CRITICO_KG: 20,
  STOCK_CRITICO_PCT: 0.20,
  DIAS_ANTIGUO: 30,
  DIAS_MUY_ANTIGUO: 60,
} as const;

/** Calculate the number of days between two dates */
function differenceInDays(later: Date, earlier: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const laterDay = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  const earlierDay = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  return Math.floor((laterDay - earlierDay) / msPerDay);
}

export class ObtenerAlertas {
  constructor(
    private readonly loteRepo: LoteRepository,
    private readonly proveedorRepo: ProveedorRepository,
  ) {}

  async execute(): Promise<AlertasResult> {
    const lotes = await this.loteRepo.findActive();

    // Filter out AGOTADO lotes (findActive should already exclude them, but be safe)
    const activos = lotes.filter((l) => l.estado === EstadoLote.ACTIVO);

    // Batch resolve proveedor names
    const proveedorIds = [...new Set(activos.map((l) => l.proveedorId))];
    const proveedores = await this.proveedorRepo.findByIds(proveedorIds);
    const proveedorMap = new Map(proveedores.map((p) => [p.id, p.nombre]));

    const alertas: AlertaLote[] = [];
    const hoy = new Date();

    let stockBajo = 0;
    let stockCritico = 0;
    let antiguo = 0;
    let muyAntiguo = 0;

    for (const lote of activos) {
      const diasEnInventario = differenceInDays(hoy, lote.fechaIngreso);
      const stockKg = Number(lote.stockDisponibleKg.value);
      const compradaKg = Number(lote.cantidadCompradaKg.value);
      const pctRestante = compradaKg > 0 ? stockKg / compradaKg : 0;
      const proveedorNombre = proveedorMap.get(lote.proveedorId) ?? 'Desconocido';

      // Stock alerts — dedup: critical supersedes warning
      if (stockKg < UMBRALES.STOCK_CRITICO_KG || pctRestante < UMBRALES.STOCK_CRITICO_PCT) {
        alertas.push({
          loteId: lote.id,
          tipoProducto: lote.producto,
          proveedorNombre,
          stockDisponibleKg: lote.stockDisponibleKg.value,
          cantidadCompradaKg: lote.cantidadCompradaKg.value,
          porcentajeRestante: pctRestante,
          diasEnInventario,
          alertType: AlertaTipo.STOCK_CRITICO,
          severity: AlertaSeveridad.CRITICAL,
          mensaje: `Stock crítico: ${stockKg} kg disponible (< ${UMBRALES.STOCK_CRITICO_KG} kg o < ${Math.round(UMBRALES.STOCK_CRITICO_PCT * 100)}%)`,
        });
        stockCritico++;
      } else if (stockKg < UMBRALES.STOCK_BAJO_KG) {
        alertas.push({
          loteId: lote.id,
          tipoProducto: lote.producto,
          proveedorNombre,
          stockDisponibleKg: lote.stockDisponibleKg.value,
          cantidadCompradaKg: lote.cantidadCompradaKg.value,
          porcentajeRestante: pctRestante,
          diasEnInventario,
          alertType: AlertaTipo.STOCK_BAJO,
          severity: AlertaSeveridad.WARNING,
          mensaje: `Stock bajo: ${stockKg} kg disponible (< ${UMBRALES.STOCK_BAJO_KG} kg)`,
        });
        stockBajo++;
      }

      // Age alerts — dedup: muy antiguo supersedes antiguo
      if (diasEnInventario > UMBRALES.DIAS_MUY_ANTIGUO) {
        alertas.push({
          loteId: lote.id,
          tipoProducto: lote.producto,
          proveedorNombre,
          stockDisponibleKg: lote.stockDisponibleKg.value,
          cantidadCompradaKg: lote.cantidadCompradaKg.value,
          porcentajeRestante: pctRestante,
          diasEnInventario,
          alertType: AlertaTipo.MUY_ANTIGUO,
          severity: AlertaSeveridad.CRITICAL,
          mensaje: `Lote muy antiguo: ${diasEnInventario} días en inventario (> ${UMBRALES.DIAS_MUY_ANTIGUO} días)`,
        });
        muyAntiguo++;
      } else if (diasEnInventario > UMBRALES.DIAS_ANTIGUO) {
        alertas.push({
          loteId: lote.id,
          tipoProducto: lote.producto,
          proveedorNombre,
          stockDisponibleKg: lote.stockDisponibleKg.value,
          cantidadCompradaKg: lote.cantidadCompradaKg.value,
          porcentajeRestante: pctRestante,
          diasEnInventario,
          alertType: AlertaTipo.ANTIGUO,
          severity: AlertaSeveridad.WARNING,
          mensaje: `Lote antiguo: ${diasEnInventario} días en inventario (> ${UMBRALES.DIAS_ANTIGUO} días)`,
        });
        antiguo++;
      }
    }

    // Sort: critical first, then by type priority
    const typePriority: Record<AlertaTipo, number> = {
      [AlertaTipo.STOCK_CRITICO]: 0,
      [AlertaTipo.MUY_ANTIGUO]: 1,
      [AlertaTipo.STOCK_BAJO]: 2,
      [AlertaTipo.ANTIGUO]: 3,
    };

    alertas.sort((a, b) => {
      if (a.severity === AlertaSeveridad.CRITICAL && b.severity !== AlertaSeveridad.CRITICAL) return -1;
      if (a.severity !== AlertaSeveridad.CRITICAL && b.severity === AlertaSeveridad.CRITICAL) return 1;
      return typePriority[a.alertType] - typePriority[b.alertType];
    });

    return {
      alertas,
      resumen: {
        stockBajo,
        stockCritico,
        antiguo,
        muyAntiguo,
        total: alertas.length,
      },
    };
  }
}