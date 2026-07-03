-- CreateTable
CREATE TABLE "Empaque" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "precio" DECIMAL NOT NULL DEFAULT 0,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "costoRealCalculadoKg" DECIMAL NOT NULL DEFAULT 0,
    "stockDisponibleKg" DECIMAL NOT NULL DEFAULT 0,
    "bloquesEnteros" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajados" INTEGER NOT NULL DEFAULT 0,
    "bloquesTajadosDeFabrica" INTEGER NOT NULL DEFAULT 0,
    "precioPorBloque" DECIMAL NOT NULL DEFAULT 0,
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
CREATE TABLE "new_Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "cantidadVendidaKg" DECIMAL NOT NULL DEFAULT 0,
    "precioVentaKg" DECIMAL NOT NULL DEFAULT 0,
    "ingresoTotal" DECIMAL NOT NULL DEFAULT 0,
    "costoAplicado" DECIMAL NOT NULL DEFAULT 0,
    "gananciaBruta" DECIMAL NOT NULL DEFAULT 0,
    "valorDomicilio" DECIMAL NOT NULL DEFAULT 0,
    "domiciliario" TEXT NOT NULL DEFAULT '',
    "ventaTipo" TEXT NOT NULL DEFAULT 'GRANEL',
    "bloquesReempacados" INTEGER NOT NULL DEFAULT 0,
    "costoEmpaques" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Venta_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("cantidadVendidaKg", "clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "loteId", "precioVentaKg", "valorDomicilio", "ventaTipo") SELECT "cantidadVendidaKg", "clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "loteId", "precioVentaKg", "valorDomicilio", "ventaTipo" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Empaque_tipo_key" ON "Empaque"("tipo");

-- CreateIndex
CREATE INDEX "Empaque_deletedAt_idx" ON "Empaque"("deletedAt");
