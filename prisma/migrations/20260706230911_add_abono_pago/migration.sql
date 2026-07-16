-- CreateTable
CREATE TABLE "AbonoPago" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT NOT NULL,
    "monto" DECIMAL NOT NULL DEFAULT 0,
    "metodoPago" TEXT NOT NULL DEFAULT 'EFECTIVO',
    "observacion" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbonoPago_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AbonoPago_ventaId_idx" ON "AbonoPago"("ventaId");

-- CreateIndex
CREATE INDEX "AbonoPago_fecha_idx" ON "AbonoPago"("fecha");
