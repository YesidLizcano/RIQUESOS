-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VentaItem_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VentaItem_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_VentaItem" ("bloquesEnterosVendidos", "bloquesReempacados", "bloquesTajadosVendidos", "cantidadKg", "costoAplicado", "costoAplicadoKg", "costoEmpaques", "createdAt", "id", "ingreso", "loteId", "precioEnteroBloque", "precioTajadoBloque", "precioVentaKg", "ventaId", "ventaTipo") SELECT "bloquesEnterosVendidos", "bloquesReempacados", "bloquesTajadosVendidos", "cantidadKg", "costoAplicado", "costoAplicadoKg", "costoEmpaques", "createdAt", "id", "ingreso", "loteId", "precioEnteroBloque", "precioTajadoBloque", "precioVentaKg", "ventaId", "ventaTipo" FROM "VentaItem";
DROP TABLE "VentaItem";
ALTER TABLE "new_VentaItem" RENAME TO "VentaItem";
CREATE INDEX "VentaItem_ventaId_idx" ON "VentaItem"("ventaId");
CREATE INDEX "VentaItem_loteId_idx" ON "VentaItem"("loteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
