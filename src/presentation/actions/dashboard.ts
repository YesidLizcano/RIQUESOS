'use server';

// Dashboard Server Actions — thin controllers, delegate to use cases
import { requireSession } from './auth';
import { PrismaVentaRepo } from '@/infrastructure/repositories/PrismaVentaRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { PrismaGastoFijoRepo } from '@/infrastructure/repositories/PrismaGastoFijoRepo';
import { PrismaClienteRepo } from '@/infrastructure/repositories/PrismaClienteRepo';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { ObtenerMetricas } from '@/application/use-cases/ObtenerMetricas';
import { ObtenerAlertas } from '@/application/use-cases/ObtenerAlertas';
import type { DashboardMetricasResponse, AlertasResultResponse, AlertaLoteResponse } from '../dtos';
import { AlertaTipo, AlertaSeveridad } from '../dtos';
import { logger } from '@/infrastructure/pino-logger';

async function getObtenerMetricasUseCase() {
  const ventaRepo = new PrismaVentaRepo();
  const loteRepo = new PrismaLoteRepo();
  const gastoFijoRepo = new PrismaGastoFijoRepo();
  const clienteRepo = new PrismaClienteRepo();
  return new ObtenerMetricas(ventaRepo, loteRepo, gastoFijoRepo, clienteRepo);
}

export async function getMetricas(month?: number, year?: number) {
  await requireSession();

  try {
    const now = new Date();
    const targetMonth = month ?? now.getMonth();
    const targetYear = year ?? now.getFullYear();

    const inicio = new Date(targetYear, targetMonth, 1);
    const fin = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    const useCase = await getObtenerMetricasUseCase();
    const metricas = await useCase.execute(inicio, fin);

    const response: DashboardMetricasResponse = {
      periodo: {
        ingresoTotal: metricas.periodo.ingresoTotal,
        costoMercancia: metricas.periodo.costoMercancia,
        gananciaBruta: metricas.periodo.gananciaBruta,
        gastosFijos: metricas.periodo.gastosFijos,
        gananciaNeta: metricas.periodo.gananciaNeta,
        ventasCount: metricas.periodo.ventasCount,
        clientesActivos: metricas.periodo.clientesActivos,
        kgVendidos: metricas.periodo.kgVendidos,
        margenBrutoPct: metricas.periodo.margenBrutoPct,
        margenNetoPct: metricas.periodo.margenNetoPct,
      },
      inventario: metricas.inventario.map((item) => ({
        producto: item.producto,
        stockDisponibleKg: item.stockDisponibleKg,
        lotesActivos: item.lotesActivos,
      })),
      inventarioResumen: {
        valorTotal: metricas.inventarioResumen.valorTotal,
        lotesActivos: metricas.inventarioResumen.lotesActivos,
      },
      topClientes: metricas.topClientes.map((c) => ({
        clienteId: c.clienteId,
        nombre: c.nombre,
        ingresoTotal: c.ingresoTotal,
      })),
      ventasDiarias: metricas.ventasDiarias.map((vd) => ({
        fecha: vd.fecha,
        total: vd.total,
      })),
      ingresosPorTipoCliente: metricas.ingresosPorTipoCliente.map((itc) => ({
        tipo: itc.tipo,
        total: itc.total,
      })),
    };

    return { success: true, metricas: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching metricas');
    return { success: false, error: 'Error fetching dashboard metrics' };
  }
}

export async function getAlertas() {
  await requireSession();

  try {
    const loteRepo = new PrismaLoteRepo();
    const proveedorRepo = new PrismaProveedorRepo();
    const useCase = new ObtenerAlertas(loteRepo, proveedorRepo);
    const result = await useCase.execute();

    const response: AlertasResultResponse = {
      alertas: result.alertas.map((a): AlertaLoteResponse => ({
        loteId: a.loteId,
        tipoProducto: a.tipoProducto,
        proveedorNombre: a.proveedorNombre,
        stockDisponibleKg: a.stockDisponibleKg,
        cantidadCompradaKg: a.cantidadCompradaKg,
        diasEnInventario: a.diasEnInventario,
        alertaTipo: a.alertType as AlertaTipo,
        severidad: a.severity as AlertaSeveridad,
      })),
      resumen: result.resumen,
    };

    return { success: true, ...response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching alertas');
    return { success: false, error: 'Error fetching alertas', alertas: [], resumen: { stockBajo: 0, stockCritico: 0, antiguo: 0, muyAntiguo: 0, total: 0 } };
  }
}