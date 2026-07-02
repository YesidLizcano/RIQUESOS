import { test, expect } from '@playwright/test';

test.describe('CRUD create dialogs', () => {
  test('can open and submit Proveedor create dialog', async ({ page }) => {
    await page.goto('/proveedores');

    await page.getByRole('button', { name: /agregar proveedor/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nuevo Proveedor' })).toBeVisible();

    await page.getByLabel('Nombre').fill('Proveedor E2E Test');
    await page.getByRole('button', { name: 'Crear Proveedor' }).click();

    await expect(page.getByText('Proveedor creado exitosamente')).toBeVisible();
    await expect(page.getByText('Proveedor E2E Test')).toBeVisible();
  });

  test('can open and submit Cliente create dialog', async ({ page }) => {
    await page.goto('/clientes');

    await page.getByRole('button', { name: /agregar cliente/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).toBeVisible();

    await page.getByLabel('Nombre').fill('Cliente E2E Test');
    await page.getByRole('button', { name: 'Crear Cliente' }).click();

    await expect(page.getByText('Cliente creado exitosamente')).toBeVisible();
    await expect(page.getByText('Cliente E2E Test')).toBeVisible();
  });

  test('can open and submit Gasto Fijo create dialog', async ({ page }) => {
    await page.goto('/gastos');

    await page.getByRole('button', { name: /agregar gasto/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nuevo Gasto Fijo' })).toBeVisible();

    await page.getByLabel('Concepto').fill('Gasto E2E Test');
    await page.getByLabel('Valor ($)').fill('100');
    await page.getByRole('button', { name: 'Registrar Gasto' }).click();

    await expect(page.getByText('Gasto registrado exitosamente')).toBeVisible();
    await expect(page.getByText('Gasto E2E Test')).toBeVisible();
  });

  test('can open Lote create dialog', async ({ page }) => {
    await page.goto('/lotes');

    await page.getByRole('button', { name: /agregar lote/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nuevo Lote' })).toBeVisible();

    // Verify dialog has required form fields
    await expect(page.getByLabel('Tipo de Producto')).toBeVisible();
    await expect(page.getByLabel('Proveedor')).toBeVisible();
    await expect(page.getByLabel('Cantidad Comprada (Kg)')).toBeVisible();
    await expect(page.getByLabel('Precio Compra Base ($/Kg)')).toBeVisible();

    // Close dialog without submitting (complex form)
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('can open Venta create dialog', async ({ page }) => {
    await page.goto('/ventas');

    await page.getByRole('button', { name: /registrar venta/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Registrar Venta' })).toBeVisible();

    // Verify dialog has required form fields
    await expect(page.getByLabel('Cliente')).toBeVisible();
    await expect(page.getByLabel('Lote')).toBeVisible();
    await expect(page.getByLabel('Cantidad Vendida (Kg)')).toBeVisible();
    await expect(page.getByLabel(/precio de venta/i)).toBeVisible();

    // Close dialog without submitting (complex form)
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});