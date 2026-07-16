/*
  Warnings:

  - You are about to drop the column `domiciliario` on the `Cliente` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "precioDobleCremaEntero" DECIMAL,
    "precioDobleCremaTajado" DECIMAL,
    "precioSemisalado" DECIMAL,
    "valorDomicilio" DECIMAL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Cliente" ("createdAt", "deletedAt", "id", "nombre", "precioDobleCremaEntero", "precioDobleCremaTajado", "precioSemisalado", "tipo", "updatedAt", "valorDomicilio") SELECT "createdAt", "deletedAt", "id", "nombre", "precioDobleCremaEntero", "precioDobleCremaTajado", "precioSemisalado", "tipo", "updatedAt", "valorDomicilio" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE INDEX "Cliente_deletedAt_idx" ON "Cliente"("deletedAt");
CREATE TABLE "new_Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "producto" TEXT NOT NULL,
    "fechaIngreso" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedorId" TEXT NOT NULL,
    "cantidadCompradaKg" DECIMAL NOT NULL DEFAULT 0,
    "precioCompraBaseKg" DECIMAL NOT NULL DEFAULT 0,
    "costoFlete" DECIMAL NOT NULL DEFAULT 0,
    "costoTajado" DECIMAL NOT NULL DEFAULT 0,
    "costoEmpaques" DECIMAL NOT NULL DEFAULT 0,
    "costoSeparadores" DECIMAL NOT NULL DEFAULT 0,
    "costoRealCalculadoKg" DECIMAL NOT NULL DEFAULT 0,
    "stockDisponibleKg" DECIMAL NOT NULL DEFAULT 0,
    "bloquesEnteros" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajados" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosDeFabrica" INTEGER NOT NULL DEFAULT 0,
    "bloquesEnterosOriginal" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosFabricaOriginal" INTEGER NOT NULL DEFAULT 0,
    "sueltosEntero" DECIMAL NOT NULL DEFAULT 0,
    "sueltosTajado" DECIMAL NOT NULL DEFAULT 0,
    "precioPorBloqueEntero" DECIMAL NOT NULL DEFAULT 0,
    "precioPorBloqueTajado" DECIMAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "metodoPagoLote" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lote_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lote" ("bloquesEnteros", "bloquesEnterosOriginal", "bloquesTajados", "bloquesTajadosDeFabrica", "bloquesTajadosFabricaOriginal", "cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoSeparadores", "costoTajado", "createdAt", "deletedAt", "estado", "fechaIngreso", "id", "precioCompraBaseKg", "precioPorBloqueEntero", "precioPorBloqueTajado", "producto", "proveedorId", "stockDisponibleKg", "updatedAt", "version") SELECT "bloquesEnteros", "bloquesEnterosOriginal", "bloquesTajados", "bloquesTajadosDeFabrica", "bloquesTajadosFabricaOriginal", "cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoSeparadores", "costoTajado", "createdAt", "deletedAt", "estado", "fechaIngreso", "id", "precioCompraBaseKg", "precioPorBloqueEntero", "precioPorBloqueTajado", "producto", "proveedorId", "stockDisponibleKg", "updatedAt", "version" FROM "Lote";
DROP TABLE "Lote";
ALTER TABLE "new_Lote" RENAME TO "Lote";
CREATE INDEX "Lote_deletedAt_idx" ON "Lote"("deletedAt");
CREATE INDEX "Lote_proveedorId_idx" ON "Lote"("proveedorId");
CREATE INDEX "Lote_estado_idx" ON "Lote"("estado");
CREATE TABLE "new_PrecioClienteProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "precioEntero" DECIMAL NOT NULL DEFAULT 0,
    "precioTajado" DECIMAL NOT NULL DEFAULT 0,
    "valorDomicilio" DECIMAL NOT NULL DEFAULT 0,
    "costoDomiciliario" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrecioClienteProveedor_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrecioClienteProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PrecioClienteProveedor" ("clienteId", "createdAt", "id", "precioEntero", "precioTajado", "proveedorId", "updatedAt") SELECT "clienteId", "createdAt", "id", "precioEntero", "precioTajado", "proveedorId", "updatedAt" FROM "PrecioClienteProveedor";
DROP TABLE "PrecioClienteProveedor";
ALTER TABLE "new_PrecioClienteProveedor" RENAME TO "PrecioClienteProveedor";
CREATE INDEX "PrecioClienteProveedor_clienteId_idx" ON "PrecioClienteProveedor"("clienteId");
CREATE INDEX "PrecioClienteProveedor_proveedorId_idx" ON "PrecioClienteProveedor"("proveedorId");
CREATE UNIQUE INDEX "PrecioClienteProveedor_clienteId_proveedorId_key" ON "PrecioClienteProveedor"("clienteId", "proveedorId");
CREATE TABLE "new_Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,
    "cantidadTotalKg" DECIMAL NOT NULL DEFAULT 0,
    "ingresoTotal" DECIMAL NOT NULL DEFAULT 0,
    "costoAplicado" DECIMAL NOT NULL DEFAULT 0,
    "gananciaBruta" DECIMAL NOT NULL DEFAULT 0,
    "valorDomicilio" DECIMAL NOT NULL DEFAULT 0,
    "costoDomiciliario" DECIMAL NOT NULL DEFAULT 0,
    "domiciliario" TEXT NOT NULL DEFAULT '',
    "metodoPago" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "abono" DECIMAL NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("abono", "cantidadTotalKg", "clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "metodoPago", "observaciones", "valorDomicilio") SELECT "abono", "cantidadTotalKg", "clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "metodoPago", "observaciones", "valorDomicilio" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");
CREATE INDEX "Venta_clienteId_idx" ON "Venta"("clienteId");
CREATE INDEX "Venta_metodoPago_idx" ON "Venta"("metodoPago");
CREATE INDEX "Venta_clienteId_fecha_idx" ON "Venta"("clienteId", "fecha");
CREATE TABLE "new_VentaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "ventaTipo" TEXT NOT NULL DEFAULT 'GRANEL',
    "cantidadKg" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaKg" DECIMAL NOT NULL DEFAULT 0,
    "ingreso" DECIMAL NOT NULL DEFAULT 0,
    "costoAplicadoKg" DECIMAL NOT NULL DEFAULT 0,
    "costoAplicado" DECIMAL NOT NULL DEFAULT 0,
    "bloquesEnterosVendidos" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosVendidos" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosDeFabricaVendidos" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosInternosVendidos" INTEGER NOT NULL DEFAULT 0,
    "bloquesReempacados" INTEGER NOT NULL DEFAULT 0,
    "costoEmpaques" DECIMAL NOT NULL DEFAULT 0,
    "precioEnteroBloque" DECIMAL,
    "precioTajadoBloque" DECIMAL,
    "origenCorte" TEXT DEFAULT 'ENTERO',
    "sueltosEnteroDelta" DECIMAL NOT NULL DEFAULT 0,
    "sueltosTajadoDelta" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VentaItem_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VentaItem" ("bloquesEnterosVendidos", "bloquesReempacados", "bloquesTajadosDeFabricaVendidos", "bloquesTajadosInternosVendidos", "bloquesTajadosVendidos", "cantidadKg", "costoAplicado", "costoAplicadoKg", "costoEmpaques", "createdAt", "id", "ingreso", "loteId", "precioEnteroBloque", "precioTajadoBloque", "precioVentaKg", "ventaId", "ventaTipo") SELECT "bloquesEnterosVendidos", "bloquesReempacados", "bloquesTajadosDeFabricaVendidos", "bloquesTajadosInternosVendidos", "bloquesTajadosVendidos", "cantidadKg", "costoAplicado", "costoAplicadoKg", "costoEmpaques", "createdAt", "id", "ingreso", "loteId", "precioEnteroBloque", "precioTajadoBloque", "precioVentaKg", "ventaId", "ventaTipo" FROM "VentaItem";
DROP TABLE "VentaItem";
ALTER TABLE "new_VentaItem" RENAME TO "VentaItem";
CREATE INDEX "VentaItem_ventaId_idx" ON "VentaItem"("ventaId");
CREATE INDEX "VentaItem_loteId_idx" ON "VentaItem"("loteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
