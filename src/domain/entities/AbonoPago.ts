// Entity: AbonoPago — immutable payment on a credit sale
import { Dinero } from '../value-objects/Dinero';
import { MetodoPago } from '../enums';

export interface AbonoPagoProps {
  id?: string;
  ventaId: string;
  monto: string;
  metodoPago: string;
  observacion?: string;
  fecha?: Date;
}

export class AbonoPago {
  readonly id: string;
  readonly ventaId: string;
  readonly monto: Dinero;
  readonly metodoPago: MetodoPago;
  readonly observacion: string;
  readonly fecha: Date;

  constructor(props: AbonoPagoProps) {
    this.id = props.id ?? '';
    this.ventaId = props.ventaId;
    this.monto = new Dinero(props.monto);
    this.metodoPago = Object.values(MetodoPago).includes(props.metodoPago as MetodoPago)
      ? (props.metodoPago as MetodoPago)
      : MetodoPago.EFECTIVO;
    this.observacion = props.observacion ?? '';
    this.fecha = props.fecha ?? new Date();
    this.validate();
  }

  private validate(): void {
    if (!this.ventaId) throw new Error('AbonoPago ventaId is required');
    if (this.monto.isZero()) throw new Error('AbonoPago monto cannot be zero');
    if (this.monto.isNegative()) throw new Error('AbonoPago monto cannot be negative');
  }
}