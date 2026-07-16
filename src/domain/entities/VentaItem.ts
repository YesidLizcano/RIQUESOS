// Entity: VentaItem — immutable, one item per lot in a sale
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';
import { Kilogramo } from '../value-objects/Kilogramo';
import { OrigenCorte, OrigenTajadoGranel } from '../enums';
import type { VentaTipo } from './Venta';

export interface VentaItemProps {
  id?: string;
  ventaId?: string;
  loteId: string;
  ventaTipo: VentaTipo;
  cantidadKg: string;
  precioVentaKg: string;
  costoAplicadoKg: string;
  ingreso?: string;
  costoAplicado?: string;
  bloquesEnterosVendidos?: number;
  bloquesTajadosVendidos?: number;
  bloquesTajadosDeFabricaVendidos?: number;
  bloquesTajadosInternosVendidos?: number;
  bloquesReempacados?: number;
  costoEmpaques?: string;
  precioEnteroBloque?: string;
  precioTajadoBloque?: string;
  origenCorte?: OrigenCorte;  // only for DC granel
  origenTajadoGranel?: OrigenTajadoGranel;  // INTERNO or FABRICA — when origenCorte=TAJADO
  sueltosEnteroDelta?: string;
  sueltosTajadoDelta?: string;
}

export class VentaItem {
  readonly id: string;
  readonly ventaId: string;
  readonly loteId: string;
  readonly ventaTipo: VentaTipo;
  readonly cantidadKg: Kilogramo;
  readonly precioVentaKg: Dinero;
  readonly ingreso: Dinero;
  readonly costoAplicadoKg: Dinero;
  readonly costoAplicado: Dinero;
  readonly bloquesEnterosVendidos: number;
  readonly bloquesTajadosVendidos: number;
  readonly bloquesTajadosDeFabricaVendidos: number;
  readonly bloquesTajadosInternosVendidos: number;
  readonly bloquesReempacados: number;
  readonly costoEmpaques: Dinero;
  readonly precioEnteroBloque: Dinero | null;
  readonly precioTajadoBloque: Dinero | null;
  readonly origenCorte: OrigenCorte;
  readonly origenTajadoGranel: OrigenTajadoGranel | null;
  readonly sueltosEnteroDelta: string;
  readonly sueltosTajadoDelta: string;

  constructor(props: VentaItemProps) {
    this.id = props.id ?? '';
    this.ventaId = props.ventaId ?? '';
    this.loteId = props.loteId;
    this.ventaTipo = props.ventaTipo;
    this.cantidadKg = new Kilogramo(props.cantidadKg);
    this.precioVentaKg = new Dinero(props.precioVentaKg);
    this.costoAplicadoKg = new Dinero(props.costoAplicadoKg);
    this.bloquesEnterosVendidos = props.bloquesEnterosVendidos ?? 0;
    this.bloquesTajadosVendidos = props.bloquesTajadosVendidos ?? 0;
    this.bloquesTajadosDeFabricaVendidos = props.bloquesTajadosDeFabricaVendidos ?? 0;
    this.bloquesTajadosInternosVendidos = props.bloquesTajadosInternosVendidos ?? 0;
    this.bloquesReempacados = props.bloquesReempacados ?? 0;
    this.costoEmpaques = new Dinero(props.costoEmpaques ?? '0');
    this.precioEnteroBloque = props.precioEnteroBloque ? new Dinero(props.precioEnteroBloque) : null;
    this.precioTajadoBloque = props.precioTajadoBloque ? new Dinero(props.precioTajadoBloque) : null;
    this.origenCorte = props.origenCorte ?? OrigenCorte.ENTERO;
    this.origenTajadoGranel = props.origenTajadoGranel ?? null;
    this.sueltosEnteroDelta = props.sueltosEnteroDelta ?? '0';
    this.sueltosTajadoDelta = props.sueltosTajadoDelta ?? '0';

    // Computed fields
    // Ingreso = cantidadKg × precioVentaKg
    this.ingreso = props.ingreso
      ? new Dinero(props.ingreso)
      : this.precioVentaKg.multiply(this.cantidadKg.value);

    // CostoAplicado = cantidadKg × costoAplicadoKg
    this.costoAplicado = props.costoAplicado
      ? new Dinero(props.costoAplicado)
      : this.costoAplicadoKg.multiply(this.cantidadKg.value);

    this.validate();
  }

  private validate(): void {
    if (!this.loteId) {
      throw new Error('VentaItem loteId is required');
    }
    if (this.cantidadKg.isZero()) {
      throw new Error('VentaItem cantidadKg cannot be zero');
    }
    if (this.precioVentaKg.isZero() || this.precioVentaKg.isNegative()) {
      throw new Error('VentaItem precioVentaKg must be greater than zero');
    }
  }
}