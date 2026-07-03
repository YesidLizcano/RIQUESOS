// Domain barrel export
export { TipoProducto, TipoCliente, EstadoLote, RolUsuario } from './enums';
export { DOBLE_CREMA_BLOCK_KG } from './constants';
export { Dinero } from './value-objects/Dinero';
export { Kilogramo } from './value-objects/Kilogramo';
export { Proveedor, type ProveedorProps } from './entities/Proveedor';
export { Lote, type LoteProps } from './entities/Lote';
export { Tajado, type TajadoProps } from './entities/Tajado';
export { Cliente, type ClienteProps } from './entities/Cliente';
export { Venta, type VentaProps } from './entities/Venta';
export { GastoFijo, type GastoFijoProps } from './entities/GastoFijo';
export { Usuario, type UsuarioProps } from './entities/Usuario';
export { ConcurrencyError } from './errors/ConcurrencyError';