// Entity: GastoFijo — amount validation
// No external imports from infrastructure or frameworks

import { Dinero } from '../value-objects/Dinero';

export interface GastoFijoProps {
  id?: string;
  fecha?: Date;
  concepto: string;
  valor: string;
}

export class GastoFijo {
  readonly id: string;
  readonly fecha: Date;
  readonly concepto: string;
  readonly valor: Dinero;

  constructor(props: GastoFijoProps) {
    this.id = props.id ?? '';
    this.fecha = props.fecha ?? new Date();
    this.concepto = props.concepto;
    this.valor = new Dinero(props.valor);

    this.validate();
  }

  private validate(): void {
    if (!this.concepto || this.concepto.trim().length === 0) {
      throw new Error('GastoFijo concepto is required');
    }
    if (this.valor.isNegative()) {
      throw new Error('GastoFijo valor cannot be negative');
    }
  }

  updateConcepto(concepto: string): GastoFijo {
    return new GastoFijo({
      id: this.id,
      fecha: this.fecha,
      concepto,
      valor: this.valor.value,
    });
  }

  updateValor(valor: string): GastoFijo {
    return new GastoFijo({
      id: this.id,
      fecha: this.fecha,
      concepto: this.concepto,
      valor,
    });
  }
}