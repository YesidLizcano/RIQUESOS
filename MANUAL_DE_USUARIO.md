# Distribuidora de Quesos Riquesos — Manual de Usuario

---

## Portada

| Campo | Detalle |
|-------|---------|
| **Software** | Riquesos — Sistema de Gestión para Distribuidora de Quesos |
| **Versión** | 1.0 |
| **Fecha** | Agosto 2026 |
| **Plataforma** | Aplicación web local (Windows) |
| **Acceso** | `http://localhost:3000` |

---

## Historial de Cambios

| Versión | Fecha | Descripción |
|---------|-------|-------------|
| 1.0 | Ago 2026 | Versión inicial del manual |

---

## 1. Introducción y Objetivos

### ¿Qué hace el programa?

Riquesos es un sistema de gestión diseñado para una distribuidora de queso doble crema y semisalado. Permite controlar lotes, registrar ventas, hacer seguimiento a tajados (corte de bloques), gestionar clientes y proveedores, y obtener métricas financieras.

### ¿A quién está dirigido?

Al personal operativo de la distribuidora: administradores, vendedores y contadores que necesitan registrar compras, ventas, pagos y consultar el estado del negocio.

### Funcionalidades principales

- 📦 **Lotes**: Registro de compras a proveedores con costos por bloque
- 🧀 **Tajados**: Control de cortes de bloques enteros a tajados
- 💰 **Ventas**: Registro de ventas por bloques (mayorista) o granel (retail)
- 👥 **Clientes y Proveedores**: Directorio con precios personalizados
- 📊 **Dashboard**: Métricas de ingresos, costos, margen y flujo de dinero
- 🏷️ **Insumos**: Control de empaques y separadores con FIFO
- 📄 **Exportación**: Reportes a Excel y PDF

---

## 2. Requisitos del Sistema

| Componente | Mínimo |
|------------|--------|
| **Sistema operativo** | Windows 10 o superior |
| **Navegador** | Chrome, Edge o Firefox (última versión) |
| **Espacio en disco** | 500 MB |
| **Conexión a internet** | No necesaria — la app corre 100% local |
| **Resolución** | 1280×720 o superior |

---

## 3. Instalación y Configuración

### Primer inicio

1. Ejecutar `actualizar.bat` en la carpeta del proyecto
2. Esperar a que abra Chrome automáticamente en `http://localhost:3000`
3. Iniciar sesión con las credenciales por defecto:
   - **Correo**: `admin@riquesos.com`
   - **Contraseña**: `admin123`

### Detener el servidor

Cerrar la ventana de terminal que se abrió con `actualizar.bat`.

### Reiniciar la base de datos

> ⚠️ **Esto borra TODOS los datos.** Usar solo si necesitás empezar de cero.

Abrir una terminal en la carpeta del proyecto y ejecutar:

```
npx prisma db push --force-reset
npx prisma db seed
```

Esto recrea la base con solo el usuario admin y el lote de recortes permanente.

---

## 4. Guía de Uso — Funcionalidades

---

### 4.1 Lotes (Compras a Proveedores)

Un **lote** representa una compra de queso a un proveedor. Contiene la información de inversión: cuántos bloques, a qué precio, y los costos asociados.

#### Crear un Lote

1. Ir a **Lotes** → hacer clic en **Nuevo Lote**
2. Completar los datos:

| Campo | Qué es | Ejemplo |
|-------|--------|---------|
| **Proveedor** | Quién vendió el queso | "Quesos Don Pedro" |
| **Producto** | Tipo de queso | Doble Crema o Semisalado |
| **Bloques Enteros** | Cuántos bloques enteros compraste | 36 |
| **Bloques Tajados de Fábrica** | Cuántos bloques ya venían cortados del proveedor | 4 |
| **Precio por Bloque Entero** | Lo que pagaste por cada bloque entero | $37,500 |
| **Precio por Bloque Tajado** | Lo que pagaste por cada bloque tajado de fábrica | $40,000 |
| **Costo de Flete** | El costo del transporte | $50,000 |
| **Costo de Empaques** | Costo de empaques si aplica | $0 |
| **Método de Pago** | Cómo pagaste el lote | Efectivo, Nequi, BRE, o Crédito |

3. Hacer clic en **Registrar**

> 💡 **Para Doble Crema**: La cantidad en kg se calcula automáticamente: `(enteros + tajados de fábrica) × 2.5 kg`. No la ingresás a mano.

> 💡 **Para Semisalado**: Ingresás directamente los kilos y el precio por kilo.

#### Entender los Costos del Lote

Cada lote tiene tres costos por kilo que se calculan automáticamente:

| Costo | Qué significa |
|-------|---------------|
| **Costo Real /E** (verde) | Costo por kg de la variedad **entero**: incluye precio del bloque + flete distribuido |
| **Costo Real /T** (ámbar) | Costo por kg de la variedad **tajado**: puede ser interno o de fábrica |
| **Costo Total** | Inversión total del lote: `(enteros × precioEntero) + (tajadosFábrica × precioTajado) + flete` |

> 📌 **Importante**: Estos costos se calculan sobre los **bloques originales al momento de la compra**. Cuando cortás bloques (tajados), los costos no cambian porque la inversión original no varía.

#### Cerrar un Lote

1. Hacer clic en el ícono de archivo en la fila del lote
2. Si el lote tiene stock remanente, el sistema muestra cuánto inventario se pierde y su valor estimado
3. Marcar el checkbox de confirmación: **"Entiendo que se perderá X kg de inventario valorado en $Y"**
4. Hacer clic en **Cerrar Lote**

> ⚠️ **Precaución**: Cerrar un lote con stock existente **elimina permanentemente** ese inventario. No se puede deshacer.

#### Lote de Recortes (Operación Interna)

El sistema mantiene un lote permanente de recortes que no se puede eliminar ni cerrar. Cuando se registra un tajado con recortes, los kilos se acumulan automáticamente en este lote. Las ventas desde este lote tienen **costo cero** porque los recortes son un subproducto.

---

### 4.2 Tajados (Cortes de Bloques)

Un **tajado** es la operación de cortar bloques enteros en tajados. Esto transforma `bloquesEnteros` en `bloquesTajados` y ajusta los costos.

#### Registrar un Tajado

1. Ir a **Tajados** → hacer clic en **Registrar Tajado**
2. Completar los datos:

| Campo | Qué es | Ejemplo |
|-------|--------|---------|
| **Lote** | De qué lote son los bloques a cortar | "Doble Crema — Don Pedro — 10E + 2TF" |
| **Cantidad de Bloques** | Cuántos bloques enteros se cortan | 5 |
| **Precio por Bloque** | Lo que cobra el tajador por bloque | $1,500 |
| **Tajador** | Nombre de quien hace el corte | "Carlos" |
| **Separadores (kg)** | Kilos de separador consumidos | 0.5 |
| **Recortes (kg)** | Kilos de desperdicio que van al lote de recortes | 0.3 |

3. Hacer clic en **Registrar**

#### Qué pasa internamente

- Los bloques enteros se convierten en tajados internos
- El costo del tajado se suma al lote (`costoTajado`)
- Los separadores se descuentan del inventario por FIFO
- Los recortes se acumulan en el lote permanente de recortes
- El **costo por kg del tajado interno** aumenta porque se amortiza el costo del corte

---

### 4.3 Ventas

Las ventas son el corazón del sistema. Hay dos modos:

#### Venta por Bloques (Mayorista)

Para vender queso doble crema por bloques enteros o tajados:

1. Ir a **Ventas** → hacer clic en **Nueva Venta**
2. Seleccionar **Cliente**
3. Agregar items con el botón **+**
4. Para cada item:
   - Seleccionar **Lote**
   - Modo **Bloques**
   - Ingresar **Bloques Enteros** y/o **Bloques Tajados**
   - El sistema calcula automáticamente: kg, precio por bloque, ingreso
5. Ingresar **Método de Pago** (Efectivo, Nequi, BRE, o Crédito)
6. Si es **Crédito**: ingresar el abono inicial y su método de pago
7. Hacer clic en **Registrar Venta**

> 💡 **Precio por bloque**: El sistema busca automáticamente el precio que le cobrás a ese cliente para ese proveedor. Si no tiene precio guardado, usa el precio base del lote.

#### Venta Granel (Retail)

Para vender queso por kilo:

1. Seleccionar **Lote**
2. Modo **Granel**
3. Ingresar **Kilos** y seleccionar **Variedad**:
   - **Entero**: queso que sale de bloques enteros
   - **Tajado Interno**: queso de bloques que cortamos nosotros
   - **Tajado de Fábrica**: queso de bloques que ya venían cortados
4. El sistema consume primero los **sueltos** disponibles y luego rompe bloques enteros si es necesario

> 💡 **Sueltos**: Cuando vendés 3 kg de un bloque de 2.5 kg, el sistema rompe 2 bloques (5 kg), vende 3 kg, y guarda los 2 kg sobrantes como "sueltos" para la próxima venta.

#### Venta con Domicilio

1. Ingresar **Valor del Domicilio** (lo que cobra al cliente)
2. Ingresar **Costo del Domicilio** (lo que paga al domiciliario)
3. El valor se suma al ingreso; el costo se suma al costo aplicado

#### Editar una Venta

1. Hacer clic en el ícono de editar en la fila de la venta
2. Modificar los datos necesarios
3. Hacer clic en **Guardar Cambios**

> ⚠️ **Precaución**: Editar una venta revierte el stock de la venta original y aplica el nuevo stock. Es una operación atómica — si algo falla, la venta original queda intacta.

#### Eliminar una Venta

1. Hacer clic en el ícono de eliminar en la fila de la venta
2. Confirmar la eliminación

> La eliminación revierte todo el stock deducido por la venta.

#### Concurrencia

Si dos personas intentan vender del mismo lote al mismo tiempo, el sistema detecta el conflicto y muestra un mensaje de error. La solución es cerrar el diálogo y volver a intentar — los datos se refrescan automáticamente.

---

### 4.4 Clientes

#### Tipos de Cliente

| Tipo | Características |
|------|----------------|
| **Mayorista** | Puede tener precios personalizados por bloque (Doble Crema) y por kilo (Semisalado) |
| **Minorista** | Siempre usa el precio estándar del lote |

#### Precios Personalizados (Mayorista)

Para clientes mayoristas, podés guardar precios por proveedor:

1. Ir a **Clientes** → hacer clic en el cliente
2. En la sección de precios, ingresar los precios por bloque para cada proveedor
3. Estos precios se cargan automáticamente al registrar ventas futuras

#### Sedes

Cada cliente puede tener múltiples sedes (direcciones de entrega) con domicilios independientes.

---

### 4.5 Proveedores

1. Ir a **Proveedores** → **Nuevo Proveedor**
2. Ingresar nombre y teléfono
3. Al registrar lotes, se asocian automáticamente al proveedor

---

### 4.6 Insumos (Empaques y Separadores)

#### Tipos

| Categoría | Qué es | Ejemplo |
|-----------|--------|---------|
| **BOLSA** | Empaque para bloques reempacados | Bolsa sellada |
| **SEPARADOR** | Material de separación entre tajados | Plástico separador |

#### Compra de Insumos

1. Ir a **Insumos** → **Nueva Compra**
2. Seleccionar el insumo, cantidad y precio unitario
3. El sistema usa FIFO (primero en entrar, primero en salir) para calcular el costo

#### Uso en Ventas

Cuando vendés bloques **reempacados**, el sistema descuenta automáticamente las bolsas del inventario y calcula el costo por FIFO.

#### Uso en Tajados

Cuando registrás un tajado con separadores, el sistema descuenta los kg de separador del inventario.

---

### 4.7 Dashboard (Métricas)

El dashboard muestra un resumen del negocio en un período:

| Métrica | Qué muestra |
|---------|-------------|
| **Ingreso Total** | Suma de todas las ventas |
| **Costo de Mercancía** | Suma de costos aplicados |
| **Ganancia Bruta** | Ingreso - Costo |
| **Margen Bruto %** | (Ganancia / Ingreso) × 100 |
| **Inventario Valorado** | Valor del stock actual basado en costos |
| **Desglose por Producto** | Doble Crema vs Semisalado |
| **Desglose por Proveedor** | Ingresos y costos agrupados por proveedor |
| **Flujo de Dinero** | Efectivo, Bancos (Nequi+BRE), Cuentas por Cobrar |
| **Cuentas por Pagar** | Lotes pendientes de pago a proveedores |

> 📌 **Operación Interna**: Las ventas del lote de recortes (sin proveedor) aparecen bajo "Operación Interna" en el desglose por proveedor.

---

### 4.8 Pagos a Proveedores

1. Ir a **Lotes** → hacer clic en el ícono de pago en la fila del lote
2. Ingresar el monto y método de pago
3. El sistema actualiza el estado del lote a **Pagado** si se cubre el total

---

### 4.9 Pagos de Tajadores

1. Ir a **Tajados** → hacer clic en el ícono de pago en la fila del tajado
2. El sistema marca el tajado como **Pagado**

---

### 4.10 Exportación

#### Excel

1. En cualquier página con tabla, hacer clic en **Exportar Excel**
2. Se genera un archivo `.xlsx` con los datos visibles

#### PDF de Resultados

1. En el Dashboard, hacer clic en **Exportar PDF**
2. Se genera un reporte con las métricas del período seleccionado

---

## 5. Resolución de Problemas (FAQ)

### No puedo iniciar sesión

- Verificar que el correo sea `admin@riquesos.com`
- Verificar que la contraseña sea `admin123`
- Verificar que el servidor esté corriendo (ejecutar `actualizar.bat`)

### "Los datos del lote fueron modificados recientemente"

Esto pasa cuando otra persona hizo una venta que afectó el mismo lote mientras estabas registrando la tuya. **Solución**: Cerrar el diálogo y volver a intentar. Los datos se refrescan automáticamente.

### No puedo eliminar el lote de recortes

El lote de recortes ("Operación Interna") es permanente. No se puede eliminar ni cerrar. Es donde se acumulan los desperdicios de los tajados.

### Los números decimales no coinciden exactamente

El sistema usa aritmética de precisión decimal (no de punto flotante) para todos los cálculos financieros. Pequeñas diferencias de centavos son normales por redondeo en el display.

### Al cerrar un lote con stock, me pide confirmación

Si el lote tiene inventario remanente, el sistema te avisa cuánto valor se pierde. Necesitás marcar el checkbox de confirmación antes de poder cerrar. Esto es intencional — previene pérdidas accidentales de inventario.

### El lote muestra bloques TI en vez de "bl"

Los lotes sin proveedor (Operación Interna / recortes) muestran su stock en bloques Tajado Interno (TI) porque todo su contenido se trata como tajado interno. No es un error — es la representación correcta.

### La venta por bloques me dice "La cantidad de bloques no coincide con los kg vendidos"

Para ventas por bloques de Doble Crema, la cantidad en kg debe ser un múltiplo de 2.5 (el peso de un bloque). Verificá que los bloques ingresados coincidan con los kilos.

### Cómo reinicio todo

Abrir una terminal en la carpeta del proyecto:

```
npx prisma db push --force-reset
npx prisma db seed
```

> ⚠️ **Esto borra TODOS los datos** y recrea solo el usuario admin y el lote de recortes.

---

## 6. Glosario

| Término | Definición |
|---------|-----------|
| **Lote** | Compra de queso a un proveedor con bloques, precios y costos |
| **Bloque Entero** | Pieza completa de queso de 2.5 kg |
| **Bloque Tajado de Fábrica** | Bloque que ya viene cortado del proveedor |
| **Bloque Tajado Interno** | Bloque que cortamos nosotros (TI) |
| **Sueltos** | Kilos sobrantes de haber roto un bloque parcialmente |
| **Recortes** | Desperdicio de los tajados que se acumula en el lote permanente |
| **Costo Real /E** | Costo por kg de la variedad entero (precio del bloque + flete) / 2.5 |
| **Costo Real /TF** | Costo por kg de la variedad tajado de fábrica |
| **Costo Real /TI** | Costo por kg de la variedad tajado interno (incluye costo de corte + separadores) |
| **FIFO** | Primero en entrar, primero en salir — método de costeo de insumos |
| **Granel** | Venta por kilo suelto |
| **Bloques** | Venta por bloques enteros (mayorista) |
| **Reempacado** | Bloques que se empaquetan en bolsas al vender |
| **Domicilio** | Cargo de envío al cliente |
| **Crédito** | Venta a crédito con abono parcial |

---

*Fin del Manual de Usuario — Distribuidora de Quesos Riquesos v1.0*