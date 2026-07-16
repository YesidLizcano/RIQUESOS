-- CreateIndex
-- Unique constraint on (nombre, deletedAt) allows:
--   - Only one ACTIVE record per nombre (both have deletedAt = NULL)
--   - Multiple DELETED records with the same nombre (different deletedAt timestamps)
--   - Re-creating a record after soft-deletion (active deletedAt=NULL won't conflict with deleted deletedAt=timestamp)
CREATE UNIQUE INDEX "Cliente_nombre_deletedAt_key" ON "Cliente"("nombre", "deletedAt");

-- CreateIndex
-- Same pattern for Proveedor
CREATE UNIQUE INDEX "Proveedor_nombre_deletedAt_key" ON "Proveedor"("nombre", "deletedAt");