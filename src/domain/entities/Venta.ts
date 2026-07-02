// Entity: Venta — immutable, financial calculation
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';
import { Kilogramo } from '../value-objects/Kilogramo';

export interface VentaProps {
  id?: string;
  fecha?: Date;
  clienteId: string;
  loteId: string;
  cantidadVendidaKg: string;
  precioVentaKg: string;
  costoAplicadoKg: string;
  valorDomicilio?: string;
  domiciliario?: string;
}

export class Venta {
  readonly id: string;
  readonly fecha: Date;
  readonly clienteId: string;
  readonly loteId: string;
  readonly cantidadVendidaKg: Kilogramo;
  readonly precioVentaKg: Dinero;
  readonly ingresoTotal: Dinero;
  readonly costoAplicado: Dinero;
  readonly gananciaBruta: Dinero;
  readonly valorDomicilio: Dinero;
  readonly domiciliario: string;

  constructor(props: VentaProps) {
    this.id = props.id ?? '';
    this.fecha = props.fecha ?? new Date();
    this.clienteId = props.clienteId;
    this.loteId = props.loteId;
    this.cantidadVendidaKg = new Kilogramo(props.cantidadVendidaKg);
    this.precioVentaKg = new Dinero(props.precioVentaKg);
    this.valorDomicilio = new Dinero(props.valorDomicilio ?? '0');
    this.domiciliario = props.domiciliario ?? '';

    // Costo aplicado por Kg (from the Lote's costoRealCalculadoKg)
    this.costoAplicado = new Dinero(props.costoAplicadoKg).multiply(this.cantidadVendidaKg.value);

    // Ingreso_Total = Cantidad × Precio_Asignado
    this.ingresoTotal = this.precioVentaKg.multiply(this.cantidadVendidaKg.value);

    // Ganancia_Bruta = Ingreso_Total − Costo_Mercancía
    this.gananciaBruta = this.ingresoTotal.subtract(this.costoAplicado);

    this.validate();
  }

  private validate(): void {
    if (!this.clienteId) {
      throw new Error('Venta clienteId is required');
    }
    if (!this.loteId) {
      throw new Error('Venta loteId is required');
    }
    if (this.cantidadVendidaKg.isZero()) {
      throw new Error('Venta cantidadVendidaKg cannot be zero');
    }
    if (this.precioVentaKg.isNegative()) {
      throw new Error('Venta precioVentaKg cannot be negative');
    }
  }

  /**
   * Venta is immutable — no update or delete methods.
   * To "modify" a Venta, create a new one and handle it at the use-case level.
   */
}