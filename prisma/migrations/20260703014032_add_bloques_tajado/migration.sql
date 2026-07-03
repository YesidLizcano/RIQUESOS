-- CreateTable
CREATE TABLE "Tajado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loteId" TEXT NOT NULL,
    "cantidadBloques" INTEGER NOT NULL,
    "precioPorBloque" DECIMAL NOT NULL DEFAULT 1500,
    "tajador" TEXT NOT NULL,
    "costoTotal" DECIMAL NOT NULL DEFAULT 0,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Tajado_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lote_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lote" ("cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoTajado", "createdAt", "deletedAt", "estado", "fechaIngreso", "id", "precioCompraBaseKg", "producto", "proveedorId", "stockDisponibleKg", "updatedAt", "version") SELECT "cantidadCompradaKg", "costoEmpaques", "costoFlete", "costoRealCalculadoKg", "costoTajado", "createdAt", "deletedAt", "estado", "fechaIngreso", "id", "precioCompraBaseKg", "producto", "proveedorId", "stockDisponibleKg", "updatedAt", "version" FROM "Lote";
DROP TABLE "Lote";
ALTER TABLE "new_Lote" RENAME TO "Lote";
CREATE INDEX "Lote_deletedAt_idx" ON "Lote"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Tajado_loteId_idx" ON "Tajado"("loteId");

-- CreateIndex
CREATE INDEX "Tajado_fecha_idx" ON "Tajado"("fecha");
