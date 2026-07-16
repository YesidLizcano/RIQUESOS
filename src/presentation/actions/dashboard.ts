'use server';

// Dashboard Server Actions — thin controllers, delegate to use cases
import { requireSession } from './auth';
import { PrismaVentaRepo } from '@/infrastructure/repositories/PrismaVentaRepo';
import { PrismaLoteRepo } from '@/infrastructure/repositories/PrismaLoteRepo';
import { PrismaClienteRepo } from '@/infrastructure/repositories/PrismaClienteRepo';
import { PrismaProveedorRepo } from '@/infrastructure/repositories/PrismaProveedorRepo';
import { PrismaVentaItemRepo } from '@/infrastructure/repositories/PrismaVentaItemRepo';
import { ObtenerMetricas } from '@/application/use-cases/ObtenerMetricas';
import { ObtenerCuentasPorCobrar } from '@/application/use-cases/ObtenerCuentasPorCobrar';
import { PrismaTajadoRepo } from '@/infrastructure/repositories/PrismaTajadoRepo';
import { Dinero } from '@/domain/value-objects/Dinero';
import type { DashboardMetricasResponse, CuentasPorPagarDetalleListResponse } from '../dtos';
import { logger } from '@/infrastructure/pino-logger';

async function getObtenerMetricasUseCase() {
  const ventaRepo = new PrismaVentaRepo();
  const loteRepo = new PrismaLoteRepo();
  const clienteRepo = new PrismaClienteRepo();
  const ventaItemRepo = new PrismaVentaItemRepo();
  const proveedorRepo = new PrismaProveedorRepo();
  const tajadoRepo = new PrismaTajadoRepo();
  return new ObtenerMetricas(ventaRepo, loteRepo, clienteRepo, ventaItemRepo, proveedorRepo, tajadoRepo);
}

export async function getMetricas(inicio?: string, fin?: string) {
  await requireSession();

  try {
    const now = new Date();
    // Default to current month if no dates provided
    const inicioDate = inicio ? new Date(inicio) : new Date(now.getFullYear(), now.getMonth(), 1);
    const finDate = fin ? new Date(fin) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Ensure date boundaries are correct
    inicioDate.setHours(0, 0, 0, 0);
    finDate.setHours(23, 59, 59, 999);

    const useCase = await getObtenerMetricasUseCase();
    const metricas = await useCase.execute(inicioDate, finDate);

    const response: DashboardMetricasResponse = {
      periodo: {
        ingresoTotal: metricas.periodo.ingresoTotal,
        costoMercancia: metricas.periodo.costoMercancia,
        gananciaBruta: metricas.periodo.gananciaBruta,
        ventasCount: metricas.periodo.ventasCount,
        clientesActivos: metricas.periodo.clientesActivos,
        kgVendidos: metricas.periodo.kgVendidos,
        margenBrutoPct: metricas.periodo.margenBrutoPct,
        volumenDobleCremaEnteros: metricas.periodo.volumenDobleCremaEnteros,
        volumenDobleCremaTajados: metricas.periodo.volumenDobleCremaTajados,
        volumenDobleCremaKgGranelEntero: metricas.periodo.volumenDobleCremaKgGranelEntero,
        volumenDobleCremaKgGranelTajado: metricas.periodo.volumenDobleCremaKgGranelTajado,
        volumenSemisaladoKg: metricas.periodo.volumenSemisaladoKg,
        volumenRecortesKg: metricas.periodo.volumenRecortesKg,
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
      inventarioPorTipo: metricas.inventarioPorTipo.map((it) => ({
        tipo: it.tipo,
        stockKg: it.stockKg,
        lotes: it.lotes,
        bloquesEnteros: it.bloquesEnteros,
        bloquesTajados: it.bloquesTajados,
        bloquesTajadosDeFabrica: it.bloquesTajadosDeFabrica,
        sueltosEntero: it.sueltosEntero,
        sueltosTajado: it.sueltosTajado,
      })),
      topClientes: metricas.topClientes.map((c) => ({
        clienteId: c.clienteId,
        nombre: c.nombre,
        tipo: c.tipo,
        ingresoTotal: c.ingresoTotal,
        dcBloques: c.dcBloques,
        ssKg: c.ssKg,
      })),
      ventasDiarias: metricas.ventasDiarias.map((vd) => ({
        fecha: vd.fecha,
        total: vd.total,
      })),
      ingresosPorTipoCliente: metricas.ingresosPorTipoCliente.map((itc) => ({
        tipo: itc.tipo,
        total: itc.total,
      })),
      desglosePorProducto: metricas.desglosePorProducto.map((dp) => ({
        producto: dp.producto,
        ingreso: dp.ingreso,
        costoAplicado: dp.costoAplicado,
        gananciaBruta: dp.gananciaBruta,
        kgVendidos: dp.kgVendidos,
        ventasCount: dp.ventasCount,
        dcEnteros: dp.dcEnteros,
        dcTajados: dp.dcTajados,
        dcKgGranelEntero: dp.dcKgGranelEntero,
        dcKgGranelTajado: dp.dcKgGranelTajado,
      })),
      desglosePorProveedor: metricas.desglosePorProveedor.map((dp) => ({
        proveedorId: dp.proveedorId,
        proveedorNombre: dp.proveedorNombre,
        ingreso: dp.ingreso,
        costoAplicado: dp.costoAplicado,
        gananciaBruta: dp.gananciaBruta,
        kgVendidos: dp.kgVendidos,
        ventasCount: dp.ventasCount,
        dcEnteros: dp.dcEnteros,
        dcTajados: dp.dcTajados,
        dcKgGranelEntero: dp.dcKgGranelEntero,
        dcKgGranelTajado: dp.dcKgGranelTajado,
      })),
      flujoDinero: {
        efectivo: metricas.flujoDinero.efectivo,
        bancos: metricas.flujoDinero.bancos,
        cuentasPorCobrar: metricas.flujoDinero.cuentasPorCobrar,
      },
      cuentasPorPagar: {
        totalPendiente: metricas.cuentasPorPagar.totalPendiente,
        cantidadLotes: metricas.cuentasPorPagar.cantidadLotes,
        tajadosPendientesPago: metricas.cuentasPorPagar.tajadosPendientesPago,
      },
    };

    return { success: true, metricas: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching metricas');
    return { success: false, error: 'Error al obtener métricas del dashboard' };
  }
}

export async function getCuentasPorCobrar(inicio?: string, fin?: string) {
  await requireSession();

  try {
    const now = new Date();
    const targetInicio = inicio ? new Date(inicio + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
    const targetFin = fin ? new Date(fin + 'T23:59:59.999') : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const ventaRepo = new PrismaVentaRepo();
    const useCase = new ObtenerCuentasPorCobrar(ventaRepo);
    const cuentas = await useCase.execute(targetInicio, targetFin);

    return { success: true, cuentas };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cuentas por cobrar');
    return { success: false, error: 'Error al cargar cuentas por cobrar', cuentas: [] };
  }
}

export async function getCuentasPorPagarDetalle() {
  await requireSession();

  try {
    const loteRepo = new PrismaLoteRepo();
    const proveedorRepo = new PrismaProveedorRepo();

    // Get all pending lots
    const lotes = await loteRepo.findAll();
    const pendientes = lotes.filter((l) => l.estadoPago === 'PENDIENTE');

    // Collect unique proveedor IDs
    const proveedorIds = [...new Set(pendientes.map((l) => l.proveedorId))];
    const proveedores = await proveedorRepo.findByIds(proveedorIds);
    const proveedorMap = new Map(proveedores.map((p) => [p.id, p.nombre]));

    // Group by proveedor
    const grupos = new Map<string, { proveedorId: string; proveedorNombre: string; lotes: typeof pendientes }>();

    for (const lote of pendientes) {
      const nombre = proveedorMap.get(lote.proveedorId) ?? 'Desconocido';
      if (!grupos.has(lote.proveedorId)) {
        grupos.set(lote.proveedorId, { proveedorId: lote.proveedorId, proveedorNombre: nombre, lotes: [] });
      }
      grupos.get(lote.proveedorId)!.lotes.push(lote);
    }

    // Sort each group's lots by date (oldest first)
    for (const grupo of grupos.values()) {
      grupo.lotes.sort((a, b) => a.fechaIngreso.getTime() - b.fechaIngreso.getTime());
    }

    // Sort groups by proveedor name
    const sortedGrupos = [...grupos.values()].sort((a, b) =>
      a.proveedorNombre.localeCompare(b.proveedorNombre)
    );

    // Calculate totals using Dinero for precise monetary arithmetic
    let totalGeneral = new Dinero('0');
    const responseGrupos = sortedGrupos.map((grupo) => {
      let totalProveedor = new Dinero('0');
      const loteResponses = grupo.lotes.map((lote) => {
        const costoTotal = lote.costoTotalLote;
        totalProveedor = totalProveedor.add(costoTotal);
        return {
          loteId: lote.id,
          producto: lote.producto,
          fechaIngreso: lote.fechaIngreso.toISOString(),
          cantidadCompradaKg: lote.cantidadCompradaKg.value,
          costoRealCalculadoKg: lote.costoRealCalculadoKg.value,
          costoTotal: costoTotal.value,
          estadoPago: lote.estadoPago,
        };
      });
      totalGeneral = totalGeneral.add(totalProveedor);
      return {
        proveedorId: grupo.proveedorId,
        proveedorNombre: grupo.proveedorNombre,
        lotes: loteResponses,
        totalPendiente: totalProveedor.value,
      };
    });

    const response: CuentasPorPagarDetalleListResponse = {
      grupos: responseGrupos,
      totalGeneral: totalGeneral.value,
    };

    return { success: true, data: response };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cuentas por pagar detalle');
    return { success: false, error: 'Error al cargar cuentas por pagar', data: null };
  }
}