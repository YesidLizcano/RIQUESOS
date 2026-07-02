Aquí tienes el **Documento de Requisitos del Producto (PRD)** centrado exclusivamente en la lógica de negocio, la arquitectura del backend y la estructura de datos.

---

# PRD: Sistema de Gestión para Distribuidora de Quesos

## 1. Visión General del Producto

Un sistema de información local (*Backoffice*) diseñado para gestionar el inventario, calcular costos reales, controlar listas de precios dinámicas y registrar las ventas de una distribuidora de quesos. El sistema debe operar en un entorno de red local y permitir acceso remoto seguro mediante VPN, sin generar costos de infraestructura.

## 2. Arquitectura Técnica

* **Framework:** Next.js (utilizando *Server Actions* o *API Routes* para la lógica del backend).
* **Base de Datos:** SQLite (archivo local `dev.db`).
* **ORM:** Prisma (para la gestión de esquemas y migraciones).
* **Despliegue:** Servidor local ejecutado como proceso en segundo plano (mediante script `.bat`), accesible vía IP de área local (LAN) o Tailscale para acceso externo.

---

## 3. Lógica de Negocio y Flujos Principales

### 3.1. Gestión de Lotes y Cálculo de Costos

El inventario no se maneja por producto global, sino por **Lotes** de entrada. Esto es obligatorio porque el precio del queso varía semanalmente.

* **Unidad de Medida Maestra:** Absolutamente todo el inventario (Queso Doble Crema y Queso Semisalado) se convierte y se almacena en **Kilogramos (Kg)**. (Ej. Un bloque de Doble Crema de 2.5 Kg ingresa al sistema como `2.5`).
* **Costo Real por Kg:** Cuando se ingresa un lote, el backend debe ejecutar el siguiente cálculo antes de guardar el registro en SQLite:
* `Costo_Base = Precio de compra por Kg * Cantidad de Kg comprados`
* `Costo_Total_Lote = Costo_Base + Flete + Pago_Tajado + Empaques/Separadores`
* `Costo_Real_Por_Kg = Costo_Total_Lote / Cantidad de Kg comprados`


* **Inventario Activo:** El sistema debe ser capaz de consultar cuántos Kg quedan disponibles en cada lote específico para evitar vender queso que ya no existe.

### 3.2. Gestión de Clientes y Precios

* Los clientes se clasifican en **Mayoristas** y **Minoristas**.
* El cliente minorista consume un precio estándar fijado por el sistema.
* Cada cliente mayorista debe tener en su perfil el precio exacto al que se le vende el Kg de Doble Crema y el Kg de Semisalado. El backend debe consultar este precio automáticamente al momento de registrar una venta asociada a ese cliente.

### 3.3. Transacciones y Ventas

* Al registrar una venta, el sistema debe recibir: `ID del Cliente`, `Producto`, `ID del Lote`, `Cantidad en Kg`, `Valor Domicilio`, y `Nombre Domiciliario`.
* **Validación de Backend:** Antes de procesar la venta, el sistema verifica que `Cantidad en Kg <= Stock actual del Lote`.
* **Cálculos de Venta:**
* `Ingreso_Total = Cantidad en Kg * Precio_Asignado_Cliente`
* `Costo_Mercancía = Cantidad en Kg * Costo_Real_Por_Kg_Del_Lote`
* `Ganancia_Bruta = Ingreso_Total - Costo_Mercancía`


* **Actualización de Stock:** Se descuenta la cantidad vendida del lote correspondiente.

### 3.4. Gastos Operativos Fijos

* El sistema debe permitir el registro mensual de gastos que no se pueden atribuir a un lote específico (Luz de los enfriadores, arriendo, etc.).
* `Ganancia_Neta_Mensual = Sumatoria(Ganancias_Brutas_Ventas) - Sumatoria(Gastos_Fijos_Del_Mes)`

---

## 4. Estructura de Base de Datos (Modelos Base para Prisma)

Para implementar esta lógica, los esquemas relacionales iniciales sugeridos son:

**`Proveedor`**

* `id` (String/UUID)
* `nombre` (String)
* `telefono` (String, opcional)

**`Lote`**

* `id` (String/UUID)
* `producto` (Enum: DOBLE_CREMA, SEMISALADO)
* `fechaIngreso` (DateTime)
* `proveedorId` (Relación con Proveedor)
* `cantidadCompradaKg` (Float)
* `precioCompraBaseKg` (Float)
* `costoFlete` (Float)
* `costoTajado` (Float)
* `costoEmpaques` (Float)
* `costoRealCalculadoKg` (Float) - *Generado por el backend*
* `stockDisponibleKg` (Float) - *Se actualiza con cada venta*
* `estado` (Enum: ACTIVO, AGOTADO)

**`Cliente`**

* `id` (String/UUID)
* `nombre` (String)
* `tipo` (Enum: MAYORISTA, MINORISTA)
* `precioDobleCrema` (Float)
* `precioSemisalado` (Float)

**`Venta`**

* `id` (String/UUID)
* `fecha` (DateTime)
* `clienteId` (Relación con Cliente)
* `loteId` (Relación con Lote)
* `cantidadVendidaKg` (Float)
* `precioVentaKg` (Float) - *Congelado en el tiempo de la transacción*
* `ingresoTotal` (Float)
* `costoAplicado` (Float) - *Costo Real del Lote * Cantidad*
* `gananciaBruta` (Float)
* `valorDomicilio` (Float)
* `domiciliario` (String)

**`GastoFijo`**

* `id` (String/UUID)
* `fecha` (DateTime)
* `concepto` (String)
* `valor` (Float)

---

## 5. Endpoints o Funciones Core (Server Actions a desarrollar)

1. `crearLote(data)`: Ingresa el registro, ejecuta la matemática de costos variables y establece el stock inicial.
2. `registrarVenta(data)`: Transacción atómica. Verifica stock, calcula precios según el cliente, registra la venta y descuenta el stock del lote de manera simultánea.
3. `obtenerDashboardMetricas(fechaInicio, fechaFin)`: Retorna la agregación de ventas totales, costos totales, gastos fijos y ganancia neta para el periodo solicitado.
