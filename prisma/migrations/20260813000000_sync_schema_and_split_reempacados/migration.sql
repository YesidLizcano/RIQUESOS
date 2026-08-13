-- DropIndex
DROP INDEX "GastoFijo_deletedAt_idx";

-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN "origenTajadoGranel" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "GastoFijo";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "telefono" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "clienteId" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sede_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "producto" TEXT NOT NULL,
    "fechaIngreso" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proveedorId" TEXT,
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
    "bloquesEnterosReempacados" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosFabricaReempacados" INTEGER NOT NULL DEFAULT 0,
    "bloquesEnterosOriginal" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosFabricaOriginal" INTEGER NOT NULL DEFAULT 0,
    "sueltosEntero" DECIMAL NOT NULL DEFAULT 0,
    "sueltosTajado" DECIMAL NOT NULL DEFAULT 0,
    "precioPorBloqueEntero" DECIMAL NOT NULL DEFAULT 0,
    "precioPorBloqueTajado" DECIMAL NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "metodoPagoLote" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "estadoPagoFlete" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "metodoPagoFlete" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lote_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lote" ("bloquesEnteros", "bloquesEnterosOriginal", "bloquesTajados", "bloquesTajadosDeFabrica", "bloquesTajadosFabricaOriginal", "cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoSeparadores", "costoTajado", "createdAt", "deletedAt", "estado", "estadoPago", "fechaIngreso", "id", "metodoPagoLote", "precioCompraBaseKg", "precioPorBloqueEntero", "precioPorBloqueTajado", "producto", "proveedorId", "stockDisponibleKg", "sueltosEntero", "sueltosTajado", "updatedAt", "version") SELECT "bloquesEnteros", "bloquesEnterosOriginal", "bloquesTajados", "bloquesTajadosDeFabrica", "bloquesTajadosFabricaOriginal", "cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoSeparadores", "costoTajado", "createdAt", "deletedAt", "estado", "estadoPago", "fechaIngreso", "id", "metodoPagoLote", "precioCompraBaseKg", "precioPorBloqueEntero", "precioPorBloqueTajado", "producto", "proveedorId", "stockDisponibleKg", "sueltosEntero", "sueltosTajado", "updatedAt", "version" FROM "Lote";
DROP TABLE "Lote";
ALTER TABLE "new_Lote" RENAME TO "Lote";
CREATE INDEX "Lote_deletedAt_idx" ON "Lote"("deletedAt");
CREATE INDEX "Lote_proveedorId_idx" ON "Lote"("proveedorId");
CREATE INDEX "Lote_estado_idx" ON "Lote"("estado");
CREATE TABLE "new_Tajado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loteId" TEXT NOT NULL,
    "cantidadBloques" INTEGER NOT NULL,
    "precioPorBloque" DECIMAL NOT NULL DEFAULT 1500,
    "tajador" TEXT NOT NULL,
    "costoTotal" DECIMAL NOT NULL DEFAULT 0,
    "separadoresKg" DECIMAL NOT NULL DEFAULT 0,
    "costoSeparadores" DECIMAL NOT NULL DEFAULT 0,
    "costoEmpaques" DECIMAL NOT NULL DEFAULT 0,
    "recortesKg" DECIMAL NOT NULL DEFAULT 0,
    "reempacados" INTEGER NOT NULL DEFAULT 0,
    "estadoPago" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tajado_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Tajado" ("cantidadBloques", "costoSeparadores", "costoTotal", "createdAt", "fecha", "id", "loteId", "precioPorBloque", "separadoresKg", "tajador") SELECT "cantidadBloques", "costoSeparadores", "costoTotal", "createdAt", "fecha", "id", "loteId", "precioPorBloque", "separadoresKg", "tajador" FROM "Tajado";
DROP TABLE "Tajado";
ALTER TABLE "new_Tajado" RENAME TO "Tajado";
CREATE INDEX "Tajado_loteId_idx" ON "Tajado"("loteId");
CREATE INDEX "Tajado_fecha_idx" ON "Tajado"("fecha");
CREATE INDEX "Tajado_estadoPago_idx" ON "Tajado"("estadoPago");
CREATE TABLE "new_Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT,
    "sedeId" TEXT,
    "cantidadTotalKg" DECIMAL NOT NULL DEFAULT 0,
    "ingresoTotal" DECIMAL NOT NULL DEFAULT 0,
    "costoAplicado" DECIMAL NOT NULL DEFAULT 0,
    "gananciaBruta" DECIMAL NOT NULL DEFAULT 0,
    "valorDomicilio" DECIMAL NOT NULL DEFAULT 0,
    "costoDomiciliario" DECIMAL NOT NULL DEFAULT 0,
    "domiciliario" TEXT NOT NULL DEFAULT '',
    "metodoPago" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "metodoPagoAbono" TEXT,
    "abono" DECIMAL NOT NULL DEFAULT 0,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Venta_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("abono", "cantidadTotalKg", "clienteId", "costoAplicado", "costoDomiciliario", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "metodoPago", "observaciones", "valorDomicilio") SELECT "abono", "cantidadTotalKg", "clienteId", "costoAplicado", "costoDomiciliario", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "metodoPago", "observaciones", "valorDomicilio" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
CREATE INDEX "Venta_fecha_idx" ON "Venta"("fecha");
CREATE INDEX "Venta_clienteId_idx" ON "Venta"("clienteId");
CREATE INDEX "Venta_metodoPago_idx" ON "Venta"("metodoPago");
CREATE INDEX "Venta_clienteId_fecha_idx" ON "Venta"("clienteId", "fecha");
CREATE INDEX "Venta_sedeId_idx" ON "Venta"("sedeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Sede_clienteId_idx" ON "Sede"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Sede_clienteId_nombre_deletedAt_key" ON "Sede"("clienteId", "nombre", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nombre_deletedAt_key" ON "Cliente"("nombre", "deletedAt");

