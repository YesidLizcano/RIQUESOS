// Use Case: RegistrarVenta — multi-item atomic registration, per-item price/cost resolution
// Application layer: can import from Domain but NOT from Infrastructure
import { Venta, type VentaTipo } from '../../domain/entities/Venta';
import { VentaItem } from '../../domain/entities/VentaItem';
import { Lote } from '../../domain/entities/Lote';
import { Dinero } from '../../domain/value-objects/Dinero';
import { Kilogramo } from '../../domain/value-objects/Kilogramo';
import { TipoProducto, TipoCliente, CategoriaInsumo, MetodoPago, OrigenCorte, OrigenTajadoGranel, type MetodoPagoAbono } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG, METODOS_PAGO_ABONO } from '../../domain/constants';
import { PrecioClienteProveedor } from '../../domain/entities/PrecioClienteProveedor';
import { Cliente } from '../../domain/entities/Cliente';
import type { VentaRepository } from '../../domain/ports/VentaRepository';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ClienteRepository } from '../../domain/ports/ClienteRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import type { PrecioClienteProveedorRepository } from '../../domain/ports/PrecioClienteProveedorRepository';
import { DeductInsumoFIFO } from './DeductInsumoFIFO';

export interface VentaItemInput {
  loteId: string;
  ventaTipo: VentaTipo;
  cantidadKg: string;
  precioVentaKg: string;
  bloquesEnterosVendidos?: number;
  bloquesTajadosVendidos?: number;
  bloquesTajadosDeFabricaVendidos?: number;
  bloquesTajadosInternosVendidos?: number;
  bloquesReempacados?: number;
  precioEnteroBloque?: string;
  precioTajadoBloque?: string;
  origenCorte?: OrigenCorte;
  origenTajadoGranel?: OrigenTajadoGranel;  // INTERNO or FABRICA — only when origenCorte=TAJADO
}

export interface RegistrarVentaInput {
  clienteId: string;
  sedeId?: string | null;
  items: VentaItemInput[];
  valorDomicilio?: string;
  costoDomiciliario?: string;
  domiciliario?: string;
  metodoPago?: string;
  metodoPagoAbono?: string;
  abono?: string;
  observaciones?: string;
}

export interface RegistrarVentaOutput {
  venta: Venta;
  items: VentaItem[];
  lotes: Lote[];
}

const MAX_RETRIES = 3;

export class RegistrarVenta {
  constructor(
    private readonly ventaRepo: VentaRepository,
    private readonly loteRepo: LoteRepository,
    private readonly clienteRepo: ClienteRepository,
    private readonly empaqueRepo?: EmpaqueRepository,
    private readonly compraInsumoRepo?: CompraInsumoRepository,
    private readonly precioClienteProveedorRepo?: PrecioClienteProveedorRepository,
  ) {}

  async execute(input: RegistrarVentaInput): Promise<RegistrarVentaOutput> {
    // 1. Validate input
    if (!input.items || input.items.length === 0) {
      throw new Error('At least one item is required');
    }

    // 2. Validate Cliente exists
    const cliente = await this.clienteRepo.findById(input.clienteId);
    if (!cliente) {
      throw new Error(`Cliente not found: ${input.clienteId}`);
    }

    // 3. Load all referenced lotes
    const loteMap = new Map<string, Lote>();
    for (const item of input.items) {
      if (!loteMap.has(item.loteId)) {
        const lote = await this.loteRepo.findById(item.loteId);
        if (!lote) {
          throw new Error(`Lote not found: ${item.loteId}`);
        }
        loteMap.set(item.loteId, lote);
      }
    }

    // 4. Resolve each item: price, cost, validate block quantities
    const ventaItems: VentaItem[] = [];
    const loteDeductions: Array<{
      loteId: string;
      cantidadKg: string;
      expectedVersion: number;
      ventaTipo: string;
      bloquesEnterosVendidos: number;
      bloquesTajadosVendidos: number;
      bloquesTajadosDeFabricaVendidos: number;
      bloquesTajadosInternosVendidos: number;
      origenCorte?: string;
      origenTajadoGranel?: string;
      sueltosEnteroDelta?: string;
      sueltosTajadoDelta?: string;
    }> = [];
    const empaqueDeductions: Array<{ empaqueId: string; quantity: number }> = [];

    for (const itemInput of input.items) {
      const lote = loteMap.get(itemInput.loteId)!;
      const ventaTipo: VentaTipo = itemInput.ventaTipo ?? 'GRANEL';
      const bloquesEnterosVendidos = itemInput.bloquesEnterosVendidos ?? 0;
      const bloquesTajadosVendidos = itemInput.bloquesTajadosVendidos ?? 0;
      const bloquesReempacados = itemInput.bloquesReempacados ?? 0;
      const bloquesTajadosDeFabricaVendidos = itemInput.bloquesTajadosDeFabricaVendidos ?? 0;
      const bloquesTajadosInternosVendidos = itemInput.bloquesTajadosInternosVendidos ?? 0;

      // Determine tajados split: explicit values or auto-assign
      const hasExplicitTajadosSplit = bloquesTajadosDeFabricaVendidos > 0 || bloquesTajadosInternosVendidos > 0;
      if (hasExplicitTajadosSplit && bloquesTajadosDeFabricaVendidos + bloquesTajadosInternosVendidos !== bloquesTajadosVendidos) {
        throw new Error(`La suma de tajados de fábrica (${bloquesTajadosDeFabricaVendidos}) e internos (${bloquesTajadosInternosVendidos}) debe igualar el total de tajados (${bloquesTajadosVendidos})`);
      }
      if (bloquesTajadosDeFabricaVendidos > lote.bloquesTajadosDeFabrica) {
        throw new Error(`Bloques tajados de fábrica insuficientes: disponible ${lote.bloquesTajadosDeFabrica}, solicitado ${bloquesTajadosDeFabricaVendidos}`);
      }
      if (bloquesTajadosInternosVendidos > lote.bloquesTajados) {
        throw new Error(`Bloques tajados internos insuficientes: disponible ${lote.bloquesTajados}, solicitado ${bloquesTajadosInternosVendidos}`);
      }
      const tajadosFromFabrica = hasExplicitTajadosSplit
        ? bloquesTajadosDeFabricaVendidos
        : Math.min(bloquesTajadosVendidos, lote.bloquesTajadosDeFabrica);
      const tajadosFromInternos = hasExplicitTajadosSplit
        ? bloquesTajadosInternosVendidos
        : bloquesTajadosVendidos - tajadosFromFabrica;

      // 4a. Validate block quantities for BLOQUES ventas
      if (lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'BLOQUES') {
        const totalBloques = bloquesEnterosVendidos + bloquesTajadosVendidos;
        const cantidadBloques = Number(itemInput.cantidadKg) / DOBLE_CREMA_BLOCK_KG;
        if (totalBloques !== Math.round(cantidadBloques)) {
          throw new Error(`La cantidad de bloques (${totalBloques}) no coincide con los kg vendidos (${itemInput.cantidadKg})`);
        }
        if (bloquesEnterosVendidos > lote.bloquesEnteros) {
          throw new Error(`Bloques enteros insuficientes en lote ${itemInput.loteId}: disponible ${lote.bloquesEnteros}, solicitado ${bloquesEnterosVendidos}`);
        }
        if (bloquesTajadosVendidos > lote.bloquesTajados + lote.bloquesTajadosDeFabrica) {
          throw new Error(`Bloques tajados insuficientes en lote ${itemInput.loteId}: disponible ${lote.bloquesTajados + lote.bloquesTajadosDeFabrica}, solicitado ${bloquesTajadosVendidos}`);
        }
      }

      // 4a2. For DC GRANEL sales, origenCorte determines block deductions
      let finalBloquesEnterosVendidos = bloquesEnterosVendidos;
      let finalBloquesTajadosVendidos = bloquesTajadosVendidos;
      let finalBloquesTajadosDeFabricaVendidos = tajadosFromFabrica;
      let finalBloquesTajadosInternosVendidos = tajadosFromInternos;
      const origenCorte = itemInput.origenCorte ?? OrigenCorte.ENTERO;

      if (lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'GRANEL') {
        const bloquesOriginales = lote.bloquesEnterosOriginal + lote.bloquesTajadosFabricaOriginal;
        const pesoPorBloque = bloquesOriginales > 0
          ? Number(new Dinero(lote.cantidadCompradaKg.value).divide(String(bloquesOriginales)).value)
          : DOBLE_CREMA_BLOCK_KG;
        const kgVendidos = Number(itemInput.cantidadKg);

        if (origenCorte === OrigenCorte.ENTERO) {
          // Consume sueltosEntero first, then break enteros blocks
          const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosEntero.value));
          const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;

          let bloquesRotos = 0;
          if (kgFaltantes > 0) {
            bloquesRotos = Math.ceil(kgFaltantes / pesoPorBloque);
            if (bloquesRotos > lote.bloquesEnteros) {
              throw new Error(`Bloques enteros insuficientes para origen ENTERO: disponible ${lote.bloquesEnteros}, se necesitan ${bloquesRotos} (kg sueltos: ${lote.sueltosEntero.value})`);
            }
          }

          finalBloquesEnterosVendidos = bloquesRotos;
          finalBloquesTajadosVendidos = 0;
          finalBloquesTajadosDeFabricaVendidos = 0;
          finalBloquesTajadosInternosVendidos = 0;
        } else if (origenCorte === OrigenCorte.TAJADO) {
          // Consume sueltosTajado first, then break tajados blocks
          const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosTajado.value));
          const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;

          let bloquesRotos = 0;
          if (kgFaltantes > 0) {
            bloquesRotos = Math.ceil(kgFaltantes / pesoPorBloque);
            const tajadosDisponibles = lote.bloquesTajados + lote.bloquesTajadosDeFabrica;
            if (bloquesRotos > tajadosDisponibles) {
              throw new Error(`Bloques tajados insuficientes para origen TAJADO: disponible ${tajadosDisponibles}, se necesitan ${bloquesRotos} (kg sueltos: ${lote.sueltosTajado.value})`);
            }
          }

          finalBloquesEnterosVendidos = 0;
          finalBloquesTajadosVendidos = bloquesRotos;
          // Auto-split between factory and internal tajados
          const fromFabrica = Math.min(bloquesRotos, lote.bloquesTajadosDeFabrica);
          const fromInternos = bloquesRotos - fromFabrica;
          finalBloquesTajadosDeFabricaVendidos = fromFabrica;
          finalBloquesTajadosInternosVendidos = fromInternos;
        }
      }

      // 4b. Resolve empaque for reempacado — use FIFO cost calculation
      let costoEmpaques = '0';
      if (bloquesReempacados > 0 && ventaTipo === 'BLOQUES') {
        if (!this.empaqueRepo || !this.compraInsumoRepo) {
          throw new Error('EmpaqueRepository and CompraInsumoRepository are required when bloquesReempacados > 0');
        }
        const empaques = await this.empaqueRepo.findByCategoria(CategoriaInsumo.BOLSA);
        if (empaques.length === 0) {
          throw new Error('No hay empaques disponibles en inventario');
        }
        const empaque = empaques[0];
        if (empaque.stock.lessThan(new Dinero(String(bloquesReempacados)))) {
          throw new Error(`Stock insuficiente de empaques: disponible ${empaque.stock.value}, solicitado ${bloquesReempacados}`);
        }
        // Use FIFO cost (matches what the actual lot cost was, not just the current price)
        const deductFIFO = new DeductInsumoFIFO(this.compraInsumoRepo, this.empaqueRepo);
        costoEmpaques = await deductFIFO.calculateFifoCost(empaque.id, String(bloquesReempacados));
        empaqueDeductions.push({ empaqueId: empaque.id, quantity: bloquesReempacados });
      }

      // 4c. Resolve precioVentaKg based on client type and product
      // DC prices (precioDobleCremaEntero/Tajado) are per-BLOCK, not per-kg.
      // For DC BLOQUES: prefer explicit per-block prices from input (PrecioClienteProveedor),
      //   fall back to cliente.resolvePrecio() for global prices.
      // For GRANEL and SEMISALADO: resolvePrecio returns per-kg prices, used directly.
      const standardPrice = new Dinero(itemInput.precioVentaKg);
      let precioVentaKg: Dinero;
      let ingresoExacto: Dinero | null = null; // Exact income for DC BLOQUES to avoid rounding

      if (ventaTipo === 'GRANEL') {
        precioVentaKg = cliente.resolvePrecio(lote.producto, standardPrice);
      } else if (bloquesEnterosVendidos > 0 && bloquesTajadosVendidos === 0) {
        // Enteros only
        // Use explicit per-block price from input if available (PrecioClienteProveedor), otherwise resolve from client
        const precioEntero = itemInput.precioEnteroBloque
          ? new Dinero(itemInput.precioEnteroBloque)
          : cliente.resolvePrecio(lote.producto, standardPrice, 'entero');
        if (lote.producto === TipoProducto.DOBLE_CREMA) {
          // Income = enteros × pricePerBlock, then convert to per-kg
          const ingreso = precioEntero.multiply(String(bloquesEnterosVendidos));
          ingresoExacto = ingreso;
          const totalKg = bloquesEnterosVendidos * DOBLE_CREMA_BLOCK_KG;
          precioVentaKg = ingreso.divide(String(totalKg));
        } else {
          precioVentaKg = precioEntero;
        }
      } else if (bloquesTajadosVendidos > 0 && bloquesEnterosVendidos === 0) {
        // Tajados only
        const precioTajado = itemInput.precioTajadoBloque
          ? new Dinero(itemInput.precioTajadoBloque)
          : cliente.resolvePrecio(lote.producto, standardPrice, 'tajado');
        if (lote.producto === TipoProducto.DOBLE_CREMA) {
          const ingreso = precioTajado.multiply(String(bloquesTajadosVendidos));
          ingresoExacto = ingreso;
          const totalKg = bloquesTajadosVendidos * DOBLE_CREMA_BLOCK_KG;
          precioVentaKg = ingreso.divide(String(totalKg));
        } else {
          precioVentaKg = precioTajado;
        }
      } else if (bloquesEnterosVendidos > 0 && bloquesTajadosVendidos > 0) {
        // Mixed enteros + tajados
        // Use explicit per-block prices from input if available, otherwise resolve from client
        const precioEntero = itemInput.precioEnteroBloque
          ? new Dinero(itemInput.precioEnteroBloque)
          : cliente.resolvePrecio(lote.producto, standardPrice, 'entero');
        const precioTajado = itemInput.precioTajadoBloque
          ? new Dinero(itemInput.precioTajadoBloque)
          : cliente.resolvePrecio(lote.producto, standardPrice, 'tajado');
        if (lote.producto === TipoProducto.DOBLE_CREMA) {
          // Income = enteros × pricePerBlockEntero + tajados × pricePerBlockTajado
          const ingresoEnteros = precioEntero.multiply(String(bloquesEnterosVendidos));
          const ingresoTajados = precioTajado.multiply(String(bloquesTajadosVendidos));
          const ingreso = ingresoEnteros.add(ingresoTajados);
          ingresoExacto = ingreso;
          const totalKg = (bloquesEnterosVendidos + bloquesTajadosVendidos) * DOBLE_CREMA_BLOCK_KG;
          precioVentaKg = ingreso.divide(String(totalKg));
        } else {
          // Non-DC mixed (shouldn't happen, but handle gracefully)
          const ingresoEnteros = precioEntero.multiply(String(bloquesEnterosVendidos));
          const ingresoTajados = precioTajado.multiply(String(bloquesTajadosVendidos));
          const totalKg = (bloquesEnterosVendidos + bloquesTajadosVendidos) * DOBLE_CREMA_BLOCK_KG;
          precioVentaKg = ingresoEnteros.add(ingresoTajados).divide(String(totalKg));
        }
      } else {
        precioVentaKg = cliente.resolvePrecio(lote.producto, standardPrice);
      }

      // 4d. Resolve costoAplicadoKg and costoAplicado (exact for DC BLOQUES)
      // Each block type has its own cost per kg:
      //   - Enteros → costoRealCalculadoKg (flete distributed equally per block)
      //   - Tajados de fábrica → costoTajadoFabricaKg (different purchase price)
      //   - Tajados internos → costoTajadoKg (includes separadores cost)
      let costoAplicadoKg: string;
      let costoAplicadoExacto: string | null = null; // Exact cost for DC BLOQUES to avoid rounding
      if (ventaTipo === 'GRANEL') {
        // DC GRANEL: cost depends on which variety the kg come from
        if (lote.producto === TipoProducto.DOBLE_CREMA && origenCorte === OrigenCorte.TAJADO) {
          const origen = itemInput.origenTajadoGranel ?? OrigenTajadoGranel.INTERNO;
          costoAplicadoKg = origen === OrigenTajadoGranel.FABRICA
            ? lote.costoTajadoFabricaKg.value
            : lote.costoTajadoKg.value;
        } else {
          costoAplicadoKg = lote.costoRealCalculadoKg.value;
        }
      } else if (bloquesEnterosVendidos > 0 || bloquesTajadosVendidos > 0) {
        const kgEnteros = bloquesEnterosVendidos * DOBLE_CREMA_BLOCK_KG;
        const kgTajadosFabrica = tajadosFromFabrica * DOBLE_CREMA_BLOCK_KG;
        const kgTajadosInternos = tajadosFromInternos * DOBLE_CREMA_BLOCK_KG;
        const cantidadKg = new Kilogramo(itemInput.cantidadKg);

        const costoEnteroTotal = lote.costoRealCalculadoKg.multiply(String(kgEnteros));
        const costoTajadoFabricaTotal = lote.costoTajadoFabricaKg.multiply(String(kgTajadosFabrica));
        const costoTajadoInternoTotal = lote.costoTajadoKg.multiply(String(kgTajadosInternos));
        const costoTotalExacto = costoEnteroTotal.add(costoTajadoFabricaTotal).add(costoTajadoInternoTotal);
        costoAplicadoExacto = costoTotalExacto.value;
        costoAplicadoKg = costoTotalExacto.divide(cantidadKg.value).value;
      } else {
        costoAplicadoKg = lote.costoRealCalculadoKg.value;
      }

      // 4e. Calculate sueltos deltas for DC GRANEL
      let sueltosEnteroDelta = '0';
      let sueltosTajadoDelta = '0';
      if (lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'GRANEL') {
        const bloquesOriginales = lote.bloquesEnterosOriginal + lote.bloquesTajadosFabricaOriginal;
        const pesoPorBloque = bloquesOriginales > 0
          ? Number(new Dinero(lote.cantidadCompradaKg.value).divide(String(bloquesOriginales)).value)
          : DOBLE_CREMA_BLOCK_KG;
        const kgVendidos = Number(itemInput.cantidadKg);

        if (origenCorte === OrigenCorte.ENTERO) {
          const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosEntero.value));
          const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;
          let sobrante = 0;
          if (kgFaltantes > 0) {
            const bloquesARomper = Math.ceil(kgFaltantes / pesoPorBloque);
            sobrante = Math.round((bloquesARomper * pesoPorBloque - kgFaltantes) * 1000) / 1000;
          }
          sueltosEnteroDelta = String(Math.round((-kgFromSueltos + sobrante) * 1000) / 1000);
        } else if (origenCorte === OrigenCorte.TAJADO) {
          const kgFromSueltos = Math.min(kgVendidos, Number(lote.sueltosTajado.value));
          const kgFaltantes = Math.round((kgVendidos - kgFromSueltos) * 1000) / 1000;
          let sobrante = 0;
          if (kgFaltantes > 0) {
            const bloquesARomper = Math.ceil(kgFaltantes / pesoPorBloque);
            sobrante = Math.round((bloquesARomper * pesoPorBloque - kgFaltantes) * 1000) / 1000;
          }
          sueltosTajadoDelta = String(Math.round((-kgFromSueltos + sobrante) * 1000) / 1000);
        }
      }

      // 4f. Create VentaItem entity
      const ventaItem = new VentaItem({
        loteId: itemInput.loteId,
        ventaTipo,
        cantidadKg: itemInput.cantidadKg,
        precioVentaKg: precioVentaKg.value,
        ingreso: ingresoExacto ? ingresoExacto.value : undefined,
        costoAplicadoKg,
        costoAplicado: costoAplicadoExacto ?? undefined,
        bloquesEnterosVendidos: finalBloquesEnterosVendidos,
        bloquesTajadosVendidos: finalBloquesTajadosVendidos,
        bloquesTajadosDeFabricaVendidos: finalBloquesTajadosDeFabricaVendidos,
        bloquesTajadosInternosVendidos: finalBloquesTajadosInternosVendidos,
        bloquesReempacados,
        costoEmpaques,
        precioEnteroBloque: itemInput.precioEnteroBloque,
        precioTajadoBloque: itemInput.precioTajadoBloque,
        origenCorte: lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'GRANEL' ? origenCorte : undefined,
        origenTajadoGranel: lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'GRANEL' && origenCorte === OrigenCorte.TAJADO ? (itemInput.origenTajadoGranel ?? OrigenTajadoGranel.INTERNO) : undefined,
        sueltosEnteroDelta,
        sueltosTajadoDelta,
      });

      ventaItems.push(ventaItem);

      // 4f. Prepare lote deduction
      loteDeductions.push({
        loteId: itemInput.loteId,
        cantidadKg: itemInput.cantidadKg,
        expectedVersion: lote.version,
        ventaTipo,
        bloquesEnterosVendidos: finalBloquesEnterosVendidos,
        bloquesTajadosVendidos: finalBloquesTajadosVendidos,
        bloquesTajadosDeFabricaVendidos: finalBloquesTajadosDeFabricaVendidos,
        bloquesTajadosInternosVendidos: finalBloquesTajadosInternosVendidos,
        origenCorte: lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'GRANEL' ? origenCorte : undefined,
        origenTajadoGranel: lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'GRANEL' && origenCorte === OrigenCorte.TAJADO ? (itemInput.origenTajadoGranel ?? OrigenTajadoGranel.INTERNO) : undefined,
        sueltosEnteroDelta,
        sueltosTajadoDelta,
      });
    }

    // 5. Create Venta entity (validates and computes totals from items)
    const metodoPago = Object.values(MetodoPago).includes(input.metodoPago as MetodoPago)
      ? (input.metodoPago as MetodoPago)
      : MetodoPago.EFECTIVO;

    // Compute abono default: CREDITO → '0', others → ingresoTotal (fully paid)
    let abono: string | undefined = input.abono;
    if (!abono && metodoPago !== MetodoPago.CREDITO) {
      // Will default to ingresoTotal inside Venta constructor (needs items computed first)
    }

    // Validate metodoPagoAbono business rule
    let metodoPagoAbono: string | null | undefined;
    if (metodoPago === MetodoPago.CREDITO) {
      const abonoValue = abono ?? '0';
      const abonoIsPositive = Number(abonoValue) > 0;
      if (abonoIsPositive) {
        if (!input.metodoPagoAbono) {
          throw new Error('metodoPagoAbono is required when metodoPago is CREDITO and abono > 0');
        }
        if (!METODOS_PAGO_ABONO.includes(input.metodoPagoAbono as MetodoPago)) {
          throw new Error(`metodoPagoAbono must be one of: ${METODOS_PAGO_ABONO.join(', ')}, got: ${input.metodoPagoAbono}`);
        }
        metodoPagoAbono = input.metodoPagoAbono;
      } else {
        // CREDITO with abono = 0 → no metodoPagoAbono needed
        metodoPagoAbono = null;
      }
    } else {
      // Non-CREDITO → metodoPagoAbono is always null
      metodoPagoAbono = null;
    }

    const venta = new Venta({
      clienteId: input.clienteId,
      sedeId: input.sedeId ?? undefined,
      valorDomicilio: input.valorDomicilio,
      costoDomiciliario: input.costoDomiciliario,
      domiciliario: input.domiciliario,
      metodoPago,
      metodoPagoAbono,
      abono: abono ?? (metodoPago === MetodoPago.CREDITO ? '0' : undefined),
      observaciones: input.observaciones,
    }, ventaItems);

    // 6. Register atomically with retry on concurrency conflict
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Re-fetch lotes for current versions on each attempt
        const updatedDeductions = await Promise.all(
          loteDeductions.map(async (d) => {
            const lote = await this.loteRepo.findById(d.loteId);
            if (!lote) {
              throw new Error(`Lote not found: ${d.loteId}`);
            }
            return { ...d, expectedVersion: lote.version };
          })
        );

        const result = await this.ventaRepo.registrarVentaAtomico({
          venta,
          items: ventaItems,
          loteDeductions: updatedDeductions,
          empaqueDeductions,
        });

        // Re-fetch all lotes after transaction to return updated state
        const updatedLotes = await Promise.all(
          [...loteMap.keys()].map(async (loteId) => {
            const lote = await this.loteRepo.findById(loteId);
            if (!lote) {
              throw new Error(`Lote not found after transaction: ${loteId}`);
            }
            return lote;
          })
        );

        // Save precio-per-proveedor memory for MAYORISTA DC BLOQUES items
        // Only save prices that were actually used in the sale (non-zero),
        // preserving existing values for prices not used in this sale.
        // Also save domicilio memory per proveedor when applicable.
        if (this.precioClienteProveedorRepo && cliente.tipo === TipoCliente.MAYORISTA) {
          for (const itemInput of input.items) {
            const lote = loteMap.get(itemInput.loteId)!;
            const ventaTipo: VentaTipo = itemInput.ventaTipo ?? 'GRANEL';
            if (lote.producto === TipoProducto.DOBLE_CREMA && ventaTipo === 'BLOQUES' && lote.proveedorId) {
              const precioEntero = itemInput.precioEnteroBloque;
              const precioTajado = itemInput.precioTajadoBloque;
              if (precioEntero || precioTajado) {
                // Fetch existing record to preserve values not used in this sale
                const existing = await this.precioClienteProveedorRepo.findByClienteAndProveedor(input.clienteId, lote.proveedorId);
                const finalPrecioEntero = precioEntero ?? (existing?.precioEntero.value ?? '0');
                const finalPrecioTajado = precioTajado ?? (existing?.precioTajado.value ?? '0');
                const finalValorDomicilio = input.valorDomicilio ?? (existing?.valorDomicilio.value ?? '0');
                const finalCostoDomiciliario = input.costoDomiciliario ?? (existing?.costoDomiciliario.value ?? '0');
                await this.precioClienteProveedorRepo.upsert(
                  new PrecioClienteProveedor({
                    clienteId: input.clienteId,
                    proveedorId: lote.proveedorId,
                    precioEntero: finalPrecioEntero,
                    precioTajado: finalPrecioTajado,
                    valorDomicilio: finalValorDomicilio,
                    costoDomiciliario: finalCostoDomiciliario,
                  })
                );
              }
            }
          }
        }

        // Save domicilio memory per proveedor for any venta with domicilio values
        if (this.precioClienteProveedorRepo && (input.valorDomicilio || input.costoDomiciliario)) {
          // Use the first item's proveedor as the domicilio reference (skip if internal lot)
          const firstLote = loteMap.get(input.items[0].loteId);
          if (firstLote && firstLote.proveedorId) {
            const existing = await this.precioClienteProveedorRepo.findByClienteAndProveedor(input.clienteId, firstLote.proveedorId);
            const finalPrecioEntero = existing?.precioEntero.value ?? '0';
            const finalPrecioTajado = existing?.precioTajado.value ?? '0';
            const finalValorDomicilio = input.valorDomicilio ?? (existing?.valorDomicilio.value ?? '0');
            const finalCostoDomiciliario = input.costoDomiciliario ?? (existing?.costoDomiciliario.value ?? '0');
            await this.precioClienteProveedorRepo.upsert(
              new PrecioClienteProveedor({
                clienteId: input.clienteId,
                proveedorId: firstLote.proveedorId,
                precioEntero: finalPrecioEntero,
                precioTajado: finalPrecioTajado,
                valorDomicilio: finalValorDomicilio,
                costoDomiciliario: finalCostoDomiciliario,
              })
            );
          }
        }

        // Save domicilio memory to cliente as fallback default
        if (input.valorDomicilio) {
          const updatedCliente = new Cliente({
            id: cliente.id,
            nombre: cliente.nombre,
            tipo: cliente.tipo,
            precioDobleCremaEntero: cliente.precioDobleCremaEntero?.value,
            precioDobleCremaTajado: cliente.precioDobleCremaTajado?.value,
            precioSemisalado: cliente.precioSemisalado?.value,
            valorDomicilio: input.valorDomicilio,
            deletedAt: cliente.deletedAt,
          });
          await this.clienteRepo.save(updatedCliente);
        }

        return { venta: result.venta, items: result.items, lotes: updatedLotes };
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === 'ConcurrencyError' || error.message.includes('modified by another transaction'))
        ) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('Venta registration failed after max retries');
  }
}