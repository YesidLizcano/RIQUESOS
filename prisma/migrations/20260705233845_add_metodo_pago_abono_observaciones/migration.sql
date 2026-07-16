/*
  Warnings:

  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `precioDobleCrema` on the `Cliente` table. All the data in the column will be lost.
  - You are about to alter the column `stock` on the `Empaque` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Decimal`.
  - You are about to drop the column `precioPorBloque` on the `Lote` table. All the data in the column will be lost.
  - You are about to drop the column `bloquesReempacados` on the `Venta` table. All the data in the column will be lost.
  - You are about to drop the column `cantidadVendidaKg` on the `Venta` table. All the data in the column will be lost.
  - You are about to drop the column `costoEmpaques` on the `Venta` table. All the data in the column will be lost.
  - You are about to drop the column `loteId` on the `Venta` table. All the data in the column will be lost.
  - You are about to drop the column `precioVentaKg` on the `Venta` table. All the data in the column will be lost.
  - You are about to drop the column `ventaTipo` on the `Venta` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "audit_logs_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_action_idx";

-- DropIndex
DROP INDEX "audit_logs_entityType_entityId_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "audit_logs";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "CompraInsumo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empaqueId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'BOLSA',
    "cantidad" DECIMAL NOT NULL DEFAULT 0,
    "cantidadRestante" DECIMAL NOT NULL DEFAULT 0,
    "precioUnitario" DECIMAL NOT NULL DEFAULT 0,
    "costoTotal" DECIMAL NOT NULL DEFAULT 0,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompraInsumo_empaqueId_fkey" FOREIGN KEY ("empaqueId") REFERENCES "Empaque" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VentaItem" (
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
    "bloquesReempacados" INTEGER NOT NULL DEFAULT 0,
    "costoEmpaques" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VentaItem_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Cliente" ("createdAt", "deletedAt", "id", "nombre", "precioSemisalado", "tipo", "updatedAt") SELECT "createdAt", "deletedAt", "id", "nombre", "precioSemisalado", "tipo", "updatedAt" FROM "Cliente";
DROP TABLE "Cliente";
ALTER TABLE "new_Cliente" RENAME TO "Cliente";
CREATE INDEX "Cliente_deletedAt_idx" ON "Cliente"("deletedAt");
CREATE TABLE "new_Empaque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'BOLSA',
    "stock" DECIMAL NOT NULL DEFAULT 0,
    "precio" DECIMAL NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Empaque" ("createdAt", "deletedAt", "id", "precio", "stock", "tipo", "updatedAt") SELECT "createdAt", "deletedAt", "id", "precio", "stock", "tipo", "updatedAt" FROM "Empaque";
DROP TABLE "Empaque";
ALTER TABLE "new_Empaque" RENAME TO "Empaque";
CREATE INDEX "Empaque_deletedAt_idx" ON "Empaque"("deletedAt");
CREATE INDEX "Empaque_categoria_idx" ON "Empaque"("categoria");
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
    "precioPorBloqueEntero" DECIMAL NOT NULL DEFAULT 0,
    "precioPorBloqueTajado" DECIMAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lote_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lote" ("bloquesEnteros", "bloquesTajados", "bloquesTajadosDeFabrica", "cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoTajado", "createdAt", "deletedAt", "estado", "fechaIngreso", "id", "precioCompraBaseKg", "producto", "proveedorId", "stockDisponibleKg", "updatedAt", "version") SELECT "bloquesEnteros", "bloquesTajados", "bloquesTajadosDeFabrica", "cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoTajado", "createdAt", "deletedAt", "estado", "fechaIngreso", "id", "precioCompraBaseKg", "producto", "proveedorId", "stockDisponibleKg", "updatedAt", "version" FROM "Lote";
DROP TABLE "Lote";
ALTER TABLE "new_Lote" RENAME TO "Lote";
CREATE INDEX "Lote_deletedAt_idx" ON "Lote"("deletedAt");
CREATE TABLE "new_Tajado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loteId" TEXT NOT NULL,
    "cantidadBloques" INTEGER NOT NULL,
    "precioPorBloque" DECIMAL NOT NULL DEFAULT 1500,
    "tajador" TEXT NOT NULL,
    "costoTotal" DECIMAL NOT NULL DEFAULT 0,
    "separadoresKg" DECIMAL NOT NULL DEFAULT 0,
    "costoSeparadores" DECIMAL NOT NULL DEFAULT 0,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tajado_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tajado" ("cantidadBloques", "costoTotal", "createdAt", "fecha", "id", "loteId", "precioPorBloque", "tajador") SELECT "cantidadBloques", "costoTotal", "createdAt", "fecha", "id", "loteId", "precioPorBloque", "tajador" FROM "Tajado";
DROP TABLE "Tajado";
ALTER TABLE "new_Tajado" RENAME TO "Tajado";
CREATE INDEX "Tajado_loteId_idx" ON "Tajado"("loteId");
CREATE INDEX "Tajado_fecha_idx" ON "Tajado"("fecha");
CREATE TABLE "new_Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,
    "cantidadTotalKg" DECIMAL NOT NULL DEFAULT 0,
    "ingresoTotal" DECIMAL NOT NULL DEFAULT 0,
    "costoAplicado" DECIMAL NOT NULL DEFAULT 0,
    "gananciaBruta" DECIMAL NOT NULL DEFAULT 0,
    "valorDomicilio" DECIMAL NOT NULL DEFAULT 0,
    "domiciliario" TEXT NOT NULL DEFAULT '',
    "metodoPago" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "abono" DECIMAL NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "valorDomicilio") SELECT "clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "valorDomicilio" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CompraInsumo_empaqueId_idx" ON "CompraInsumo"("empaqueId");

-- CreateIndex
CREATE INDEX "CompraInsumo_empaqueId_fecha_idx" ON "CompraInsumo"("empaqueId", "fecha");

-- CreateIndex
CREATE INDEX "CompraInsumo_fecha_idx" ON "CompraInsumo"("fecha");

-- CreateIndex
CREATE INDEX "CompraInsumo_categoria_idx" ON "CompraInsumo"("categoria");

-- CreateIndex
CREATE INDEX "VentaItem_ventaId_idx" ON "VentaItem"("ventaId");

-- CreateIndex
CREATE INDEX "VentaItem_loteId_idx" ON "VentaItem"("loteId");
