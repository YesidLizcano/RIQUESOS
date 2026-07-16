import { Dinero } from '../value-objects/Dinero';

export interface PrecioClienteProveedorProps {
  id?: string;
  clienteId: string;
  proveedorId: string;
  precioEntero: string;
  precioTajado: string;
  valorDomicilio?: string;
  costoDomiciliario?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PrecioClienteProveedor {
  readonly id: string;
  readonly clienteId: string;
  readonly proveedorId: string;
  readonly precioEntero: Dinero;
  readonly precioTajado: Dinero;
  readonly valorDomicilio: Dinero;
  readonly costoDomiciliario: Dinero;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PrecioClienteProveedorProps) {
    this.id = props.id ?? '';
    this.clienteId = props.clienteId;
    this.proveedorId = props.proveedorId;
    this.precioEntero = new Dinero(props.precioEntero && props.precioEntero !== '' ? props.precioEntero : '0');
    this.precioTajado = new Dinero(props.precioTajado && props.precioTajado !== '' ? props.precioTajado : '0');
    this.valorDomicilio = new Dinero(props.valorDomicilio ?? '0');
    this.costoDomiciliario = new Dinero(props.costoDomiciliario ?? '0');
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }
}