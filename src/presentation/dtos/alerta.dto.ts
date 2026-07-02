// DTO: Alerta response types for Presentation → Application boundary

export enum AlertaTipo {
  STOCK_BAJO = 'STOCK_BAJO',
  STOCK_CRITICO = 'STOCK_CRITICO',
  ANTIGUO = 'ANTIGUO',
  MUY_ANTIGUO = 'MUY_ANTIGUO',
}

export enum AlertaSeveridad {
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface AlertaLoteResponse {
  loteId: string;
  tipoProducto: string;
  proveedorNombre: string;
  stockDisponibleKg: string;
  cantidadCompradaKg: string;
  diasEnInventario: number;
  alertaTipo: AlertaTipo;
  severidad: AlertaSeveridad;
}

export interface AlertasResultResponse {
  alertas: AlertaLoteResponse[];
  resumen: {
    stockBajo: number;
    stockCritico: number;
    antiguo: number;
    muyAntiguo: number;
    total: number;
  };
}