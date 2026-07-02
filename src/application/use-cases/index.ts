// Application use cases — barrel export
export { AutenticarUsuario, type AuthResult } from './AutenticarUsuario';
export { CrearLote, type CrearLoteInput, type CrearLoteOutput } from './CrearLote';
export { RegistrarVenta, type RegistrarVentaInput, type RegistrarVentaOutput } from './RegistrarVenta';
export {
  GestionarClientes,
  type CrearClienteInput,
  type ActualizarClienteInput,
} from './GestionarClientes';
export {
  GestionarGastos,
  type CrearGastoInput,
  type ActualizarGastoInput,
  type GastoMensualResumen,
} from './GestionarGastos';
export {
  GestionarProveedores,
  type CrearProveedorInput,
  type ActualizarProveedorInput,
} from './GestionarProveedores';
export { ModificarLote, type ModificarLoteInput } from './ModificarLote';
export {
  ObtenerMetricas,
  type MetricasPeriodo,
  type InventarioPorProducto,
  type TopCliente,
  type MetricasDashboard,
} from './ObtenerMetricas';