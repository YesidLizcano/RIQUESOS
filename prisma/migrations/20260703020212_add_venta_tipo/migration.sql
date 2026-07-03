-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Venta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Venta_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Venta" ("cantidadVendidaKg", "clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "loteId", "precioVentaKg", "valorDomicilio") SELECT "cantidadVendidaKg", "clienteId", "costoAplicado", "createdAt", "domiciliario", "fecha", "gananciaBruta", "id", "ingresoTotal", "loteId", "precioVentaKg", "valorDomicilio" FROM "Venta";
DROP TABLE "Venta";
ALTER TABLE "new_Venta" RENAME TO "Venta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
