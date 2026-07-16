-- AlterTable
ALTER TABLE "VentaItem" ADD COLUMN "precioEnteroBloque" DECIMAL;
ALTER TABLE "VentaItem" ADD COLUMN "precioTajadoBloque" DECIMAL;

-- CreateTable
CREATE TABLE "PrecioClienteProveedor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteId" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "precioEntero" DECIMAL NOT NULL DEFAULT 0,
    "precioTajado" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PrecioClienteProveedor_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PrecioClienteProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PrecioClienteProveedor_clienteId_idx" ON "PrecioClienteProveedor"("clienteId");

-- CreateIndex
CREATE INDEX "PrecioClienteProveedor_proveedorId_idx" ON "PrecioClienteProveedor"("proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "PrecioClienteProveedor_clienteId_proveedorId_key" ON "PrecioClienteProveedor"("clienteId", "proveedorId");
