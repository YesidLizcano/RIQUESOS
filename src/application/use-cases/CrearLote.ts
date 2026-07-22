// Use Case: CrearLote — create with cost calculation, block support for Doble Crema
// Application layer: can import from Domain but NOT from Infrastructure
import { Lote, type LoteProps } from '../../domain/entities/Lote';
import { EstadoLote, TipoProducto, EstadoPagoLote, MetodoPago } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG, RECORTES_DC_PERMANENT_LOT_ID, OPERACION_INTERNA_PROVEEDOR_ID } from '../../domain/constants';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';

export interface CrearLoteInput {
  producto: TipoProducto;
  proveedorId: string | null;
  cantidadCompradaKg: string;
  precioCompraBaseKg: string;
  precioPorBloqueEntero?: string;
  precioPorBloqueTajado?: string;
  costoFlete?: string;
  costoEmpaques?: string;
  bloquesEnteros?: number;
  bloquesTajadosDeFabrica?: number;
  estadoPago?: EstadoPagoLote;
  metodoPagoLote?: MetodoPago;
}

export interface CrearLoteOutput {
  lote: Lote;
}

export class CrearLote {
  constructor(
    private readonly loteRepo: LoteRepository,
    private readonly proveedorRepo: ProveedorRepository
  ) {}

  async execute(input: CrearLoteInput): Promise<CrearLoteOutput> {
    // Prevent manual creation of the permanent recortes lot — managed by the system
    if (input.producto === TipoProducto.DOBLE_CREMA && input.proveedorId === OPERACION_INTERNA_PROVEEDOR_ID) {
      throw new Error('No se pueden crear lotes de operación interna manualmente. El lote de recortes se gestiona automáticamente.');
    }

    // Validate proveedor exists (skip for internal lots)
    if (input.proveedorId && input.proveedorId !== OPERACION_INTERNA_PROVEEDOR_ID) {
      const proveedor = await this.proveedorRepo.findById(input.proveedorId);
      if (!proveedor) {
        throw new Error(`Proveedor not found: ${input.proveedorId}`);
      }
    }

    // Build Lote props based on product type
    let loteProps: LoteProps;

    if (input.producto === TipoProducto.DOBLE_CREMA) {
      // Doble Crema: quantity derived from bloques
      const bloquesEnteros = input.bloquesEnteros ?? 0;
      const bloquesTajadosDeFabrica = input.bloquesTajadosDeFabrica ?? 0;

      if (bloquesEnteros + bloquesTajadosDeFabrica <= 0) {
        throw new Error('Para Doble Crema, debe ingresar al menos un bloque');
      }

      const precioPorBloqueEntero = input.precioPorBloqueEntero ?? '0';
      const precioPorBloqueTajado = input.precioPorBloqueTajado ?? '0';
      // precioCompraBaseKg is derived from precioPorBloqueEntero / DOBLE_CREMA_BLOCK_KG
      // Use string-based division to avoid float64 precision loss
      const precioCompraBaseKg = bloquesEnteros > 0
        ? new Dinero(precioPorBloqueEntero).divide(String(DOBLE_CREMA_BLOCK_KG)).value
        : bloquesTajadosDeFabrica > 0
          ? new Dinero(precioPorBloqueTajado).divide(String(DOBLE_CREMA_BLOCK_KG)).value
          : '0';

      const cantidadKg = (bloquesEnteros + bloquesTajadosDeFabrica) * DOBLE_CREMA_BLOCK_KG;
      loteProps = {
        producto: input.producto,
        proveedorId: input.proveedorId,
        cantidadCompradaKg: String(cantidadKg),
        precioCompraBaseKg,
        precioPorBloqueEntero,
        precioPorBloqueTajado,
        costoFlete: input.costoFlete,
        costoEmpaques: input.costoEmpaques,
        bloquesEnteros,
        bloquesTajadosDeFabrica,
        bloquesTajados: 0, // Initially no bloques tajados
        bloquesEnterosOriginal: bloquesEnteros,
        bloquesTajadosFabricaOriginal: bloquesTajadosDeFabrica,
        estadoPago: input.estadoPago,
        metodoPagoLote: input.metodoPagoLote,
      };
    } else {
      // Semisalado: quantity input in Kg, no precioPorBloque
      const cantidadKg = new Dinero(input.cantidadCompradaKg);
      if (!input.cantidadCompradaKg || cantidadKg.isZero() || cantidadKg.isNegative()) {
        throw new Error('Para Semisalado, la cantidad en Kg es obligatoria');
      }
      loteProps = {
        producto: input.producto,
        proveedorId: input.proveedorId,
        cantidadCompradaKg: input.cantidadCompradaKg,
        precioCompraBaseKg: input.precioCompraBaseKg,
        precioPorBloqueEntero: '0',
        precioPorBloqueTajado: '0',
        costoFlete: input.costoFlete,
        costoEmpaques: input.costoEmpaques,
        bloquesEnteros: 0,
        bloquesTajados: 0,
        bloquesTajadosDeFabrica: 0,
        bloquesEnterosOriginal: 0,
        bloquesTajadosFabricaOriginal: 0,
        estadoPago: input.estadoPago,
        metodoPagoLote: input.metodoPagoLote,
      };
    }

    // Create Lote entity — cost calculation happens in the constructor
    const lote = new Lote(loteProps);

    // Persist
    const saved = await this.loteRepo.save(lote);
    return { lote: saved };
  }
}