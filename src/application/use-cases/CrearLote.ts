// Use Case: CrearLote — create with cost calculation, block support for Doble Crema
// Application layer: can import from Domain but NOT from Infrastructure
import { Lote, type LoteProps } from '../../domain/entities/Lote';
import { TipoProducto, EstadoPagoLote, MetodoPago, CategoriaInsumo } from '../../domain/enums';
import { DOBLE_CREMA_BLOCK_KG } from '../../domain/constants';
import { Dinero } from '../../domain/value-objects/Dinero';
import type { LoteRepository } from '../../domain/ports/LoteRepository';
import type { ProveedorRepository } from '../../domain/ports/ProveedorRepository';
import type { EmpaqueRepository } from '../../domain/ports/EmpaqueRepository';
import type { CompraInsumoRepository } from '../../domain/ports/CompraInsumoRepository';
import { DeductInsumoFIFO } from './DeductInsumoFIFO';

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
  bloquesEnterosReempacados?: number;
  bloquesTajadosFabricaReempacados?: number;
  estadoPago?: EstadoPagoLote;
  metodoPagoLote?: MetodoPago;
  estadoPagoFlete?: EstadoPagoLote;
  metodoPagoFlete?: MetodoPago;
}

export interface CrearLoteOutput {
  lote: Lote;
}

export class CrearLote {
  constructor(
    private readonly loteRepo: LoteRepository,
    private readonly proveedorRepo: ProveedorRepository,
    private readonly empaqueRepo?: EmpaqueRepository,
    private readonly compraInsumoRepo?: CompraInsumoRepository,
  ) {}

  async execute(input: CrearLoteInput): Promise<CrearLoteOutput> {
    // Validate proveedor exists (skip for internal lots with no proveedor)
    if (input.proveedorId) {
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
      const bloquesEnterosReempacados = input.bloquesEnterosReempacados ?? 0;
      const bloquesTajadosFabricaReempacados = input.bloquesTajadosFabricaReempacados ?? 0;

      if (bloquesEnteros + bloquesTajadosDeFabrica <= 0) {
        throw new Error('Para Doble Crema, debe ingresar al menos un bloque');
      }

      if (bloquesEnterosReempacados > bloquesEnteros) {
        throw new Error(`bloquesEnterosReempacados (${bloquesEnterosReempacados}) cannot exceed bloquesEnteros (${bloquesEnteros})`);
      }
      if (bloquesTajadosFabricaReempacados > bloquesTajadosDeFabrica) {
        throw new Error(`bloquesTajadosFabricaReempacados (${bloquesTajadosFabricaReempacados}) cannot exceed bloquesTajadosDeFabrica (${bloquesTajadosDeFabrica})`);
      }

      // Deduct bolsas for reempacados via FIFO
      const totalReempacados = bloquesEnterosReempacados + bloquesTajadosFabricaReempacados;
      let costoEmpaquesReempacados = '0';
      if (totalReempacados > 0) {
        if (!this.empaqueRepo || !this.compraInsumoRepo) {
          throw new Error('EmpaqueRepository and CompraInsumoRepository are required when bloquesEnterosReempacados or bloquesTajadosFabricaReempacados > 0');
        }

        const empaques = await this.empaqueRepo.findByCategoria(CategoriaInsumo.BOLSA);
        if (empaques.length === 0) {
          throw new Error('No hay empaques (bolsas) disponibles en inventario');
        }

        const bolsa = empaques[0];
        if (new Dinero(String(totalReempacados)).greaterThan(bolsa.stock)) {
          throw new Error(
            `Stock insuficiente de bolsas: disponible ${bolsa.stock.value}, solicitado ${totalReempacados}`
          );
        }

        const deductFIFO = new DeductInsumoFIFO(this.compraInsumoRepo, this.empaqueRepo);
        const fifoResult = await deductFIFO.execute({
          empaqueId: bolsa.id,
          cantidad: String(totalReempacados),
        });

        costoEmpaquesReempacados = fifoResult.totalCost;
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
      // Add reempacados bolsa cost to any existing costoEmpaques
      const costoEmpaquesTotal = new Dinero(input.costoEmpaques ?? '0').add(new Dinero(costoEmpaquesReempacados)).value;
      loteProps = {
        producto: input.producto,
        proveedorId: input.proveedorId,
        cantidadCompradaKg: String(cantidadKg),
        precioCompraBaseKg,
        precioPorBloqueEntero,
        precioPorBloqueTajado,
        costoFlete: input.costoFlete,
        costoEmpaques: costoEmpaquesTotal,
        bloquesEnteros,
        bloquesTajadosDeFabrica,
        bloquesEnterosReempacados,
        bloquesTajadosFabricaReempacados,
        bloquesTajados: 0, // Initially no bloques tajados
        bloquesEnterosOriginal: bloquesEnteros,
        bloquesTajadosFabricaOriginal: bloquesTajadosDeFabrica,
        estadoPago: input.estadoPago,
        metodoPagoLote: input.metodoPagoLote,
        estadoPagoFlete: input.estadoPagoFlete,
        metodoPagoFlete: input.metodoPagoFlete,
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
        bloquesEnterosReempacados: 0,
        bloquesTajadosFabricaReempacados: 0,
        bloquesEnterosOriginal: 0,
        bloquesTajadosFabricaOriginal: 0,
        estadoPago: input.estadoPago,
        metodoPagoLote: input.metodoPagoLote,
        estadoPagoFlete: input.estadoPagoFlete,
        metodoPagoFlete: input.metodoPagoFlete,
      };
    }

    // Create Lote entity — cost calculation happens in the constructor
    const lote = new Lote(loteProps);

    // Persist
    const saved = await this.loteRepo.save(lote);
    return { lote: saved };
  }
}