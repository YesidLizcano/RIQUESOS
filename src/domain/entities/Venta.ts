// Entity: Venta — immutable, financial calculation
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';
import { Kilogramo } from '../value-objects/Kilogramo';
import { MetodoPago } from '../enums';
import { METODOS_PAGO_ABONO } from '../constants';
import type { VentaItem } from './VentaItem';

export type VentaTipo = 'BLOQUES' | 'GRANEL';

export interface VentaProps {
  id?: string;
  fecha?: Date;
  clienteId: string;
  sedeId?: string;
  valorDomicilio?: string;
  costoDomiciliario?: string;
  domiciliario?: string;
  metodoPago?: string;
  metodoPagoAbono?: string | null;
  abono?: string;
  observaciones?: string;
  // Computed from items — can be set directly for reconstruction from DB
  cantidadTotalKg?: string;
  ingresoTotal?: string;
  costoAplicado?: string;
  gananciaBruta?: string;
}

export class Venta {
  readonly id: string;
  readonly fecha: Date;
  readonly clienteId: string;
  readonly sedeId: string | null;
  readonly cantidadTotalKg: Kilogramo;
  readonly ingresoTotal: Dinero;
  readonly costoAplicado: Dinero;
  readonly gananciaBruta: Dinero;
  readonly valorDomicilio: Dinero;
  readonly costoDomiciliario: Dinero;
  readonly domiciliario: string;
  readonly metodoPago: MetodoPago;
  readonly metodoPagoAbono: MetodoPago | null;
  readonly abono: Dinero;
  readonly observaciones: string;

  get saldo(): Dinero {
    return this.ingresoTotal.subtract(this.abono);
  }

  constructor(props: VentaProps, items?: VentaItem[]) {
    this.id = props.id ?? '';
    this.fecha = props.fecha ?? new Date();
    this.clienteId = props.clienteId;
    this.sedeId = props.sedeId ?? null;
    this.valorDomicilio = new Dinero(props.valorDomicilio ?? '0');
    this.costoDomiciliario = new Dinero(props.costoDomiciliario ?? '0');
    this.domiciliario = props.domiciliario ?? '';
    this.metodoPago = Object.values(MetodoPago).includes(props.metodoPago as MetodoPago)
      ? (props.metodoPago as MetodoPago)
      : MetodoPago.EFECTIVO;

    this.observaciones = props.observaciones ?? '';

    if (items && items.length > 0) {
      let totalKg = Kilogramo.zero();
      let ingreso = Dinero.zero();
      let costo = Dinero.zero();

      for (const item of items) {
        totalKg = totalKg.add(item.cantidadKg);
        ingreso = ingreso.add(item.ingreso);
        costo = costo.add(item.costoAplicado).add(item.costoEmpaques);
      }

      this.cantidadTotalKg = totalKg;
      this.ingresoTotal = ingreso.add(this.valorDomicilio);
      this.costoAplicado = costo.add(this.costoDomiciliario);
      this.gananciaBruta = this.ingresoTotal.subtract(this.costoAplicado);

      // Default abono: if CREDITO, default 0; otherwise, default to full ingresoTotal
      if (props.abono !== undefined && props.abono !== '') {
        this.abono = new Dinero(props.abono);
      } else if (this.metodoPago === MetodoPago.CREDITO) {
        this.abono = Dinero.zero();
      } else {
        this.abono = this.ingresoTotal;
      }
    } else {
      this.cantidadTotalKg = new Kilogramo(props.cantidadTotalKg ?? '0');
      this.ingresoTotal = new Dinero(props.ingresoTotal ?? '0');
      this.costoAplicado = new Dinero(props.costoAplicado ?? '0');
      this.gananciaBruta = new Dinero(props.gananciaBruta ?? '0');

      // Reconstruct from DB: abono is always provided
      this.abono = new Dinero(props.abono ?? '0');
    }

    // metodoPagoAbono business rules:
    // - CREDITO + abono > 0 → metodoPagoAbono is required and must be EFECTIVO/NEQUI/BRE_B
    // - CREDITO + abono = 0 → metodoPagoAbono is null (no initial abono)
    // - Non-CREDITO → metodoPagoAbono is always null (full payment covers everything)
    if (this.metodoPago === MetodoPago.CREDITO && this.abono.greaterThan(Dinero.zero())) {
      if (!props.metodoPagoAbono) {
        throw new Error('metodoPagoAbono is required when metodoPago is CREDITO and abono > 0');
      }
      if (!METODOS_PAGO_ABONO.includes(props.metodoPagoAbono as MetodoPago)) {
        throw new Error(`metodoPagoAbono must be one of: ${METODOS_PAGO_ABONO.join(', ')}, got: ${props.metodoPagoAbono}`);
      }
      this.metodoPagoAbono = props.metodoPagoAbono as MetodoPago;
    } else {
      this.metodoPagoAbono = null;
    }

    this.validate();
  }

  private validate(): void {
    if (!this.clienteId) {
      throw new Error('Venta clienteId is required');
    }
  }

  /**
   * Venta is immutable — no update or delete methods.
   * To "modify" a Venta, create a new one and handle it at the use-case level.
   */
}