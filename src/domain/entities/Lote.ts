// Entity: Lote — cost calculation, status transition, version field, block management
// No external imports from infrastructure or frameworks

import { TipoProducto, EstadoLote, EstadoPagoLote, MetodoPago } from '../enums';
import { Dinero } from '../value-objects/Dinero';
import { Kilogramo } from '../value-objects/Kilogramo';
import { DOBLE_CREMA_BLOCK_KG, isRecortesDobleCrema } from '../constants';

export interface LoteProps {
  id?: string;
  producto: TipoProducto;
  fechaIngreso?: Date;
  proveedorId: string;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  precioPorBloqueEntero?: string;
  precioPorBloqueTajado?: string;
  costoFlete?: string;
  costoTajado?: string;
  costoEmpaques?: string;
  costoSeparadores?: string;
  stockDisponibleKg?: string;
  bloquesEnteros?: number;
  bloquesTajados?: number;
  bloquesTajadosDeFabrica?: number;
  bloquesEnterosOriginal?: number;
  bloquesTajadosFabricaOriginal?: number;
  bloquesTajadosOriginal?: number;
  sueltosEntero?: string;
  sueltosTajado?: string;
  estado?: EstadoLote;
  estadoPago?: EstadoPagoLote;
  metodoPagoLote?: MetodoPago;
  version?: number;
  deletedAt?: Date | null;
}

export class Lote {
  readonly id: string;
  readonly producto: TipoProducto;
  readonly fechaIngreso: Date;
  readonly proveedorId: string;
  readonly cantidadCompradaKg: Kilogramo;
  readonly precioCompraBaseKg: Dinero;
  readonly precioPorBloqueEntero: Dinero;
  readonly precioPorBloqueTajado: Dinero;
  readonly costoFlete: Dinero;
  readonly costoTajado: Dinero;
  readonly costoEmpaques: Dinero;
  readonly costoSeparadores: Dinero;
  readonly costoRealCalculadoKg: Dinero;
  readonly stockDisponibleKg: Kilogramo;
  readonly bloquesEnteros: number;
  readonly bloquesTajados: number;
  readonly bloquesTajadosDeFabrica: number;
  readonly bloquesEnterosOriginal: number;
  readonly bloquesTajadosFabricaOriginal: number;
  readonly bloquesTajadosOriginal: number;
  readonly sueltosEntero: Kilogramo;
  readonly sueltosTajado: Kilogramo;
  readonly estado: EstadoLote;
  readonly estadoPago: EstadoPagoLote;
  readonly metodoPagoLote: MetodoPago;
  readonly version: number;
  readonly deletedAt: Date | null;

  constructor(props: LoteProps) {
    this.id = props.id ?? '';
    this.producto = props.producto;
    this.fechaIngreso = props.fechaIngreso ?? new Date();
    this.proveedorId = props.proveedorId;
    this.deletedAt = props.deletedAt ?? null;

    // Block-based fields — default to 0 for SEMISALADO or when not provided
    this.bloquesEnteros = props.bloquesEnteros ?? 0;
    this.bloquesTajados = props.bloquesTajados ?? 0;
    this.bloquesTajadosDeFabrica = props.bloquesTajadosDeFabrica ?? 0;
    this.bloquesEnterosOriginal = props.bloquesEnterosOriginal ?? 0;
    this.bloquesTajadosFabricaOriginal = props.bloquesTajadosFabricaOriginal ?? 0;
    this.bloquesTajadosOriginal = props.bloquesTajadosOriginal ?? 0;
    this.sueltosEntero = props.sueltosEntero ? new Kilogramo(props.sueltosEntero) : Kilogramo.zero();
    this.sueltosTajado = props.sueltosTajado ? new Kilogramo(props.sueltosTajado) : Kilogramo.zero();

    // cantidadCompradaKg is always explicitly provided
    // For DOBLE_CREMA creation, the use case calculates it from bloques
    this.cantidadCompradaKg = new Kilogramo(props.cantidadCompradaKg);

    // precioPorBloqueEntero is required for DC; precioPorBloqueTajado defaults to entero
    this.precioPorBloqueEntero = new Dinero(props.precioPorBloqueEntero ?? '0');
    this.precioPorBloqueTajado = new Dinero(props.precioPorBloqueTajado ?? props.precioPorBloqueEntero ?? '0');

    // precioCompraBaseKg: for DC, derived from precioPorBloqueEntero / 2.5
    // The use case computes and passes it, but we also validate
    this.precioCompraBaseKg = new Dinero(props.precioCompraBaseKg);
    this.costoFlete = new Dinero(props.costoFlete ?? '0');
    this.costoTajado = new Dinero(props.costoTajado ?? '0');
    this.costoEmpaques = new Dinero(props.costoEmpaques ?? '0');
    this.costoSeparadores = new Dinero(props.costoSeparadores ?? '0');

    this.validate();

    // Costo_Entero_Por_Kg = (Precio_Base × Cantidad + Flete) / Cantidad
    // Tajado and separadores are NOT included — they're only in costoTajadoKg
    this.costoRealCalculadoKg = this.calculateCostoReal();

    this.stockDisponibleKg = props.stockDisponibleKg
      ? new Kilogramo(props.stockDisponibleKg)
      : this.cantidadCompradaKg;

    this.estado = props.estado ?? EstadoLote.ACTIVO;
    this.estadoPago = props.estadoPago ?? EstadoPagoLote.PENDIENTE;
    this.metodoPagoLote = props.metodoPagoLote ?? MetodoPago.EFECTIVO;
    this.version = props.version ?? 0;
  }

  /**
   * Cost per kg for entero (whole) blocks.
   * For DC: distributes flete equally per block (not by value).
   * fletePorBloque = costoFlete / (bloquesEnteros + bloquesTajadosFabrica)
   * costoRealEnteroKg = (precioPorBloqueEntero + fletePorBloque) / pesoPorBloque
   * Falls back to simple (base × kg + flete) / kg for non-DC.
   */
  private calculateCostoReal(): Dinero {
    if (this.producto === TipoProducto.DOBLE_CREMA && this.bloquesEnteros > 0) {
      const totalBloques = this.bloquesEnteros + this.bloquesTajadosDeFabrica;

      if (totalBloques === 0) {
        // Fallback: no blocks at all, use simple average
        const costoBaseTotal = this.precioCompraBaseKg.multiply(this.cantidadCompradaKg.value);
        const costoTotal = costoBaseTotal.add(this.costoFlete);
        return costoTotal.divide(this.cantidadCompradaKg.value);
      }

      const valorEnteros = this.precioPorBloqueEntero.multiply(String(this.bloquesEnteros));
      const valorTajadosFabrica = this.precioPorBloqueTajado.multiply(String(this.bloquesTajadosDeFabrica));

      if (valorEnteros.add(valorTajadosFabrica).isZero()) {
        // Fallback: no block prices available, use simple average
        const costoBaseTotal = this.precioCompraBaseKg.multiply(this.cantidadCompradaKg.value);
        const costoTotal = costoBaseTotal.add(this.costoFlete);
        return costoTotal.divide(this.cantidadCompradaKg.value);
      }

      // Distribute flete equally per block
      const fletePorBloque = this.costoFlete.divide(String(totalBloques));

      // costoRealEnteroKg = (precioPorBloqueEntero + fletePorBloque) / pesoPorBloque
      const costoEnteroPorBloque = this.precioPorBloqueEntero.add(fletePorBloque);
      return costoEnteroPorBloque.divide(String(DOBLE_CREMA_BLOCK_KG));
    }

    // Non-DC or edge case: simple average
    // RECORTES_DOBLE_CREMA lots start with zero quantity — cost is $0/kg (byproduct)
    if (this.cantidadCompradaKg.isZero()) {
      return Dinero.zero();
    }
    const costoBaseTotal = this.precioCompraBaseKg.multiply(this.cantidadCompradaKg.value);
    const costoTotal = costoBaseTotal.add(this.costoFlete);
    return costoTotal.divide(this.cantidadCompradaKg.value);
  }

  /**
   * Cost per kg for tajado de fábrica blocks.
   * Distributes flete equally per block (not by value).
   * fletePorBloque = costoFlete / (bloquesEnteros + bloquesTajadosFabrica)
   * costoRealTajadoFabricaKg = (precioPorBloqueTajado + fletePorBloque) / pesoPorBloque
   * Falls back to costoRealCalculadoKg when no factory tajados exist or for non-DC.
   */
  get costoTajadoFabricaKg(): Dinero {
    if (this.producto !== TipoProducto.DOBLE_CREMA || this.bloquesTajadosDeFabrica === 0) {
      return this.costoRealCalculadoKg;
    }

    const totalBloques = this.bloquesEnteros + this.bloquesTajadosDeFabrica;

    if (totalBloques === 0) {
      return this.costoRealCalculadoKg;
    }

    const valorEnteros = this.precioPorBloqueEntero.multiply(String(this.bloquesEnteros));
    const valorTajadosFabrica = this.precioPorBloqueTajado.multiply(String(this.bloquesTajadosDeFabrica));

    if (valorEnteros.add(valorTajadosFabrica).isZero()) {
      return this.costoRealCalculadoKg;
    }

    // Distribute flete equally per block
    const fletePorBloque = this.costoFlete.divide(String(totalBloques));

    // costoRealTajadoFabricaKg = (precioPorBloqueTajado + fletePorBloque) / pesoPorBloque
    const costoTajadoPorBloque = this.precioPorBloqueTajado.add(fletePorBloque);
    return costoTajadoPorBloque.divide(String(DOBLE_CREMA_BLOCK_KG));
  }

  /**
   * Total cost of the lot (merchandise + flete).
   * For DC: (bloquesEnteros × precioPorBloqueEntero) + (bloquesTajadosDeFabrica × precioPorBloqueTajado) + flete.
   * For non-DC: precioCompraBaseKg × cantidadCompradaKg + flete.
   */
  get costoTotalLote(): Dinero {
    if (this.producto === TipoProducto.DOBLE_CREMA && (this.bloquesEnteros > 0 || this.bloquesTajadosDeFabrica > 0)) {
      const valorEnteros = this.precioPorBloqueEntero.multiply(String(this.bloquesEnteros));
      const valorTajadosFabrica = this.precioPorBloqueTajado.multiply(String(this.bloquesTajadosDeFabrica));
      const costoMercancia = valorEnteros.add(valorTajadosFabrica);
      return costoMercancia.add(this.costoFlete);
    }
    const costoBase = this.precioCompraBaseKg.multiply(this.cantidadCompradaKg.value);
    return costoBase.add(this.costoFlete);
  }

  /**
   * Cost per kg for tajado (cut) blocks.
   * Only applies to blocks WE cut (bloquesTajados), not factory-cut blocks (bloquesTajadosDeFabrica).
   * Factory-cut blocks use costoTajadoFabricaKg.
   * Falls back to costoRealCalculadoKg for non-DC products or when no tajados exist.
   */
  get costoTajadoKg(): Dinero {
    if (this.producto !== TipoProducto.DOBLE_CREMA || this.bloquesTajados === 0) {
      return this.costoRealCalculadoKg;
    }
    const bloquesTajadosParaCosto = this.bloquesTajadosOriginal > 0 ? this.bloquesTajadosOriginal : this.bloquesTajados;
    const kgTajados = bloquesTajadosParaCosto * DOBLE_CREMA_BLOCK_KG;
    const tajadoPlusSeparadores = this.costoTajado.add(this.costoSeparadores);
    const costoExtra = tajadoPlusSeparadores.divide(String(kgTajados));
    return this.costoRealCalculadoKg.add(costoExtra);
  }

  /**
   * Detailed cost breakdown for DC blocks.
   * Returns each component that contributes to the final cost per kg,
   * so the user can audit exactly what's driving the price.
   */
  get costBreakdown(): Record<string, string> {
    if (this.producto !== TipoProducto.DOBLE_CREMA) {
      // Non-DC: simple formula
      const costoBase = this.precioCompraBaseKg.multiply(this.cantidadCompradaKg.value);
      const costoTotal = costoBase.add(this.costoFlete);
      return {
        tipo: 'SEMISALADO',
        precioCompraBaseKg: this.precioCompraBaseKg.value,
        cantidadCompradaKg: this.cantidadCompradaKg.value,
        costoFlete: this.costoFlete.value,
        costoBaseTotal: costoBase.value,
        costoTotal: costoTotal.value,
        costoRealCalculadoKg: this.costoRealCalculadoKg.value,
      };
    }

    const totalBloques = this.bloquesEnteros + this.bloquesTajadosDeFabrica;
    const fletePorBloque = totalBloques > 0
      ? this.costoFlete.divide(String(totalBloques)).value
      : '0';
    const costoEnteroPorBloque = this.precioPorBloqueEntero.add(
      totalBloques > 0 ? this.costoFlete.divide(String(totalBloques)) : Dinero.zero()
    );
    const bloquesTajadosParaCosto = this.bloquesTajadosOriginal > 0 ? this.bloquesTajadosOriginal : this.bloquesTajados;
    const kgTajados = bloquesTajadosParaCosto * DOBLE_CREMA_BLOCK_KG;
    const tajadoPlusSeparadores = this.costoTajado.add(this.costoSeparadores);
    const costoExtra = this.bloquesTajados > 0
      ? tajadoPlusSeparadores.divide(String(kgTajados)).value
      : '0';

    return {
      tipo: 'DOBLE_CREMA',
      bloquesEnteros: String(this.bloquesEnteros),
      bloquesTajados: String(this.bloquesTajados),
      bloquesTajadosDeFabrica: String(this.bloquesTajadosDeFabrica),
      bloquesTajadosOriginal: String(this.bloquesTajadosOriginal),
      bloquesTajadosRestantes: String(this.bloquesTajados),
      totalBloquesUsadosParaFlete: String(totalBloques),
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      fletePorBloque,
      costoEnteroPorBloque: costoEnteroPorBloque.value,
      costoRealCalculadoKg: this.costoRealCalculadoKg.value,
      costoTajado: this.costoTajado.value,
      costoSeparadores: this.costoSeparadores.value,
      tajadoPlusSeparadores: tajadoPlusSeparadores.value,
      kgTajadosInternos: String(kgTajados),
      costoExtraPorKgTajado: costoExtra,
      costoTajadoKg: this.costoTajadoKg.value,
      costoTajadoFabricaKg: this.costoTajadoFabricaKg.value,
    };
  }

  private validate(): void {
    if (!this.proveedorId) {
      throw new Error('Lote proveedorId is required');
    }
    if (this.cantidadCompradaKg.isZero() && !isRecortesDobleCrema(this.producto)) {
      throw new Error('Lote cantidadCompradaKg cannot be zero');
    }
    if (this.precioCompraBaseKg.isNegative()) {
      throw new Error('Lote precioCompraBaseKg cannot be negative');
    }
  }

  /**
   * Register a tajado (cutting) operation on this Lote.
   * Decrements bloquesEnteros, increments bloquesTajados, adds to costoTajado,
   * adds to costoSeparadores, and recalculates costoRealCalculadoKg.
   * Returns a new Lote with updated values.
   */
  registrarTajado(cantidadBloques: number, precioPorBloque: string, costoSeparadores?: string): Lote {
    if (this.producto !== TipoProducto.DOBLE_CREMA) {
      throw new Error('Solo se puede registrar tajado en lotes de Doble Crema');
    }
    if (this.deletedAt) {
      throw new Error('No se puede registrar tajado en un lote eliminado');
    }
    if (this.estado === EstadoLote.AGOTADO) {
      throw new Error('No se puede registrar tajado en un lote agotado');
    }
    if (cantidadBloques <= 0) {
      throw new Error('La cantidad de bloques debe ser mayor a 0');
    }
    if (this.bloquesEnteros < cantidadBloques) {
      throw new Error(`No hay suficientes bloques enteros. Disponibles: ${this.bloquesEnteros}, solicitados: ${cantidadBloques}`);
    }

    const precioPorBloqueDinero = new Dinero(precioPorBloque);
    const costoTajadoAdicional = precioPorBloqueDinero.multiply(cantidadBloques);
    const nuevoCostoTajado = this.costoTajado.add(costoTajadoAdicional);

    const costoSeparadoresDinero = new Dinero(costoSeparadores ?? '0');
    const nuevoCostoSeparadores = this.costoSeparadores.add(costoSeparadoresDinero);

    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      costoTajado: nuevoCostoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      costoSeparadores: nuevoCostoSeparadores.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros - cantidadBloques,
      bloquesTajados: this.bloquesTajados + cantidadBloques,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal + cantidadBloques,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: this.estado,
      estadoPago: this.estadoPago,
      metodoPagoLote: this.metodoPagoLote,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /**
   * Deduct stock from this Lote by kilograms (for granel/partial sales).
   * For Doble Crema lotes, bloquesEnteros is NOT recalculated here — the caller
   * (repo) is responsible for calculating consumed blocks and updating bloquesEnteros.
   * Automatically transitions to AGOTADO if stock reaches zero.
   */
  deductStock(cantidad: Kilogramo): Lote {
    if (this.estado === EstadoLote.AGOTADO) {
      throw new Error('Cannot deduct stock from an AGOTADO Lote');
    }
    if (cantidad.greaterThan(this.stockDisponibleKg)) {
      throw new Error(
        `Insufficient stock: requested ${cantidad.value} Kg, available ${this.stockDisponibleKg.value} Kg`
      );
    }

    const newStock = this.stockDisponibleKg.subtract(cantidad);
    const newEstado = newStock.isZero() && !isRecortesDobleCrema(this.producto) ? EstadoLote.AGOTADO : this.estado;

    // bloquesEnteros is NOT recalculated here — for granel/kg sales of DC products,
    // the caller (repo) is responsible for recalculating bloquesEnteros from stock.
    // For block sales, bloquesEnteros is decremented directly via deductStockByBlocks
    // or via the repo's block sale path.
    const newBloquesEnteros = this.bloquesEnteros;

    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      costoSeparadores: this.costoSeparadores.value,
      stockDisponibleKg: newStock.value,
      bloquesEnteros: newBloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: newEstado,
      estadoPago: this.estadoPago,
      metodoPagoLote: this.metodoPagoLote,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /**
   * Deduct stock from this Lote by whole blocks (for mayorista block sales).
   * Only valid for Doble Crema lotes.
   * Decrements bloquesEnteros by the block count and stockDisponibleKg by the kg equivalent.
   * Automatically transitions to AGOTADO if stock reaches zero.
   */
  deductStockByBlocks(cantidadBloques: number): Lote {
    if (this.producto !== TipoProducto.DOBLE_CREMA) {
      throw new Error('Block deduction is only valid for Doble Crema lotes');
    }
    if (this.estado === EstadoLote.AGOTADO) {
      throw new Error('Cannot deduct stock from an AGOTADO Lote');
    }
    if (cantidadBloques <= 0) {
      throw new Error('Block quantity must be greater than 0');
    }
    if (!Number.isInteger(cantidadBloques)) {
      throw new Error('Block quantity must be a whole number');
    }
    if (this.bloquesEnteros < cantidadBloques) {
      throw new Error(
        `Insufficient blocks: requested ${cantidadBloques}, available ${this.bloquesEnteros}`
      );
    }

    const kgDeducted = new Kilogramo(String(cantidadBloques * 2.5));
    if (kgDeducted.greaterThan(this.stockDisponibleKg)) {
      throw new Error(
        `Insufficient stock: requested ${kgDeducted.value} Kg (${cantidadBloques} blocks), available ${this.stockDisponibleKg.value} Kg`
      );
    }

    const newStock = this.stockDisponibleKg.subtract(kgDeducted);
    const newBloquesEnteros = this.bloquesEnteros - cantidadBloques;
    const newEstado = newStock.isZero() && !isRecortesDobleCrema(this.producto) ? EstadoLote.AGOTADO : this.estado;

    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      costoSeparadores: this.costoSeparadores.value,
      stockDisponibleKg: newStock.value,
      bloquesEnteros: newBloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: newEstado,
      estadoPago: this.estadoPago,
      metodoPagoLote: this.metodoPagoLote,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /** Close this lot manually — zero all inventory and mark as AGOTADO.
   *  Used for shrinkage, internal consumption, or manual adjustment. */
  cerrarLote(): Lote {
    if (this.estado === EstadoLote.AGOTADO) {
      throw new Error('El lote ya está agotado');
    }
    return new Lote({
      ...this.toProps(),
      stockDisponibleKg: '0',
      bloquesEnteros: 0,
      bloquesTajados: 0,
      bloquesTajadosDeFabrica: 0,
      sueltosEntero: '0',
      sueltosTajado: '0',
      estado: EstadoLote.AGOTADO,
    });
  }

  /**
   * Transition status to AGOTADO. Used by infrastructure when stock hits zero.
   */
  markAsAgotado(): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      costoSeparadores: this.costoSeparadores.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: EstadoLote.AGOTADO,
      estadoPago: this.estadoPago,
      metodoPagoLote: this.metodoPagoLote,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  /**
   * Update cost fields and recalculate costoRealCalculadoKg.
   * Does NOT change producto, proveedorId, or version (version increment happens at repo level).
   */
  updateCosts(params: {
    precioCompraBaseKg?: string;
    precioPorBloqueEntero?: string;
    precioPorBloqueTajado?: string;
    cantidadCompradaKg?: string;
    costoFlete?: string;
    costoTajado?: string;
    costoEmpaques?: string;
    estadoPago?: EstadoPagoLote;
    metodoPagoLote?: MetodoPago;
  }): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: params.cantidadCompradaKg ?? this.cantidadCompradaKg.value,
      precioCompraBaseKg: params.precioCompraBaseKg ?? this.precioCompraBaseKg.value,
      precioPorBloqueEntero: params.precioPorBloqueEntero ?? this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: params.precioPorBloqueTajado ?? this.precioPorBloqueTajado.value,
      costoFlete: params.costoFlete ?? this.costoFlete.value,
      costoTajado: params.costoTajado ?? this.costoTajado.value,
      costoEmpaques: params.costoEmpaques ?? this.costoEmpaques.value,
      costoSeparadores: this.costoSeparadores.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: this.estado,
      estadoPago: params.estadoPago ?? this.estadoPago,
      metodoPagoLote: params.metodoPagoLote ?? this.metodoPagoLote,
      version: this.version,
      deletedAt: this.deletedAt,
    });
  }

  softDelete(): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      costoSeparadores: this.costoSeparadores.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: this.estado,
      estadoPago: this.estadoPago,
      metodoPagoLote: this.metodoPagoLote,
      version: this.version,
      deletedAt: new Date(),
    });
  }

  restore(): Lote {
    return new Lote({
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      costoSeparadores: this.costoSeparadores.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: this.estado,
      estadoPago: this.estadoPago,
      metodoPagoLote: this.metodoPagoLote,
      version: this.version,
      deletedAt: null,
    });
  }

  /** Return a plain object with all fields needed to construct a new Lote. */
  toProps(): LoteProps {
    return {
      id: this.id,
      producto: this.producto,
      fechaIngreso: this.fechaIngreso,
      proveedorId: this.proveedorId,
      cantidadCompradaKg: this.cantidadCompradaKg.value,
      precioCompraBaseKg: this.precioCompraBaseKg.value,
      precioPorBloqueEntero: this.precioPorBloqueEntero.value,
      precioPorBloqueTajado: this.precioPorBloqueTajado.value,
      costoFlete: this.costoFlete.value,
      costoTajado: this.costoTajado.value,
      costoEmpaques: this.costoEmpaques.value,
      costoSeparadores: this.costoSeparadores.value,
      stockDisponibleKg: this.stockDisponibleKg.value,
      bloquesEnteros: this.bloquesEnteros,
      bloquesTajados: this.bloquesTajados,
      bloquesTajadosDeFabrica: this.bloquesTajadosDeFabrica,
      bloquesEnterosOriginal: this.bloquesEnterosOriginal,
      bloquesTajadosFabricaOriginal: this.bloquesTajadosFabricaOriginal,
      bloquesTajadosOriginal: this.bloquesTajadosOriginal,
      sueltosEntero: this.sueltosEntero.value,
      sueltosTajado: this.sueltosTajado.value,
      estado: this.estado,
      estadoPago: this.estadoPago,
      metodoPagoLote: this.metodoPagoLote,
      version: this.version,
      deletedAt: this.deletedAt,
    };
  }

  /** Accumulate recortes kg into this permanent lot. Only valid for RECORTES_DOBLE_CREMA lots. */
  acumularRecortes(recortesKg: string): Lote {
    if (!isRecortesDobleCrema(this.producto)) {
      throw new Error('Solo se puede acumular recortes en lotes de Recortes Doble Crema');
    }
    const adicional = new Kilogramo(recortesKg);
    // Kilogramo constructor already rejects negative values
    const newStock = this.stockDisponibleKg.add(adicional);
    const newCantidad = this.cantidadCompradaKg.add(adicional);
    return new Lote({
      ...this.toProps(),
      stockDisponibleKg: newStock.value,
      cantidadCompradaKg: newCantidad.value,
    });
  }

  /**
   * Mark this Lote as paid with a payment method.
   * Throws if the Lote is already PAGADO.
   */
  marcarPagado(metodoPago: MetodoPago): Lote {
    if (this.estadoPago === EstadoPagoLote.PAGADO) {
      throw new Error('El lote ya está marcado como pagado');
    }
    return new Lote({
      ...this.toProps(),
      estadoPago: EstadoPagoLote.PAGADO,
      metodoPagoLote: metodoPago,
    });
  }
}