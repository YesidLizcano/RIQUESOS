'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { crearEmpaque, getEmpaques } from '@/presentation/actions/empaques';
import { registrarCompraInsumo } from '@/presentation/actions/compra-insumo';
import { crearEmpaqueSchema } from '@/presentation/validations/empaque.schema';
import { registrarCompraSchema } from '@/presentation/validations/compra-insumo.schema';
import { toast } from 'sonner';
import { CategoriaInsumo } from '@/domain/enums';
import { categoriaInsumoLabel } from '@/domain/labels';
import type { EmpaqueResponse } from '@/presentation/dtos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlusIcon } from 'lucide-react';

export function CrearEmpaqueDialog() {
  const refreshData = useRefresh();
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState<CategoriaInsumo>(CategoriaInsumo.BOLSA);
  const [stock, setStock] = useState('');
  const [precio, setPrecio] = useState('');
  const [existingEmpaques, setExistingEmpaques] = useState<EmpaqueResponse[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stockLabel = categoria === CategoriaInsumo.SEPARADOR ? 'Cantidad (kg)' : 'Cantidad (unidades)';
  const stockStep = categoria === CategoriaInsumo.SEPARADOR ? '0.01' : '1';

  // Find existing empaque of the selected category
  const existingEmpaque = existingEmpaques.find(
    (e) => e.categoria === categoria && !e.deletedAt
  );

  const fetchEmpaques = useCallback(async () => {
    const result = await getEmpaques();
    if (result.success && result.empaques) {
      setExistingEmpaques(result.empaques);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchEmpaques();
    }
  }, [open, fetchEmpaques]);

  // Re-fetch when category changes to avoid stale data
  useEffect(() => {
    if (open) {
      fetchEmpaques();
    }
  }, [categoria, open, fetchEmpaques]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Validate against the appropriate schema depending on whether an existing empaque exists
    let result;
    if (existingEmpaque) {
      result = registrarCompraSchema.safeParse({
        empaqueId: existingEmpaque.id,
        cantidad: stock === '' ? undefined : Number(stock),
        precioUnitario: precio === '' ? undefined : Number(precio),
      });
    } else {
      result = crearEmpaqueSchema.safeParse({
        categoria,
        stock: stock === '' ? undefined : Number(stock),
        precio: precio === '' ? undefined : Number(precio),
      });
    }

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0]?.toString();
        if (field && !fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      toast.error(fieldErrors[Object.keys(fieldErrors)[0]] || 'Error de validación');
      return;
    }

    setErrors({});

    if (existingEmpaque) {
      // Register a CompraInsumo to add stock to the existing empaque
      const formData = new FormData();
      formData.set('empaqueId', existingEmpaque.id);
      formData.set('cantidad', stock);
      formData.set('precioUnitario', precio);
      const actionResult = await registrarCompraInsumo(formData);
      if (actionResult.success) {
        toast.success('Compra registrada exitosamente');
        refreshData();
        setOpen(false);
        setCategoria(CategoriaInsumo.BOLSA);
        setStock('');
        setPrecio('');
      } else {
        toast.error(actionResult.error || 'Error al registrar compra');
      }
    } else {
      // No existing empaque — create a new one with initial stock
      const formData = new FormData();
      formData.set('categoria', categoria);
      formData.set('stock', stock);
      formData.set('precio', precio);
      const actionResult = await crearEmpaque(formData);
      if (actionResult.success) {
        toast.success('Insumo registrado exitosamente');
        refreshData();
        setOpen(false);
        setCategoria(CategoriaInsumo.BOLSA);
        setStock('');
        setPrecio('');
      } else {
        toast.error(actionResult.error || 'Error al registrar insumo');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon className="size-4" />
        Registrar Compra
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Compra de Insumo</DialogTitle>
          <DialogDescription>
            Registre la compra de insumos. Se suma al stock existente de la categoría seleccionada.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select name="categoria" value={categoria} onValueChange={(v) => {
              setCategoria(v as CategoriaInsumo);
              if (errors.categoria) setErrors(prev => { const next = {...prev}; delete next.categoria; return next; });
            }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione categoría">{categoriaInsumoLabel[categoria]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(CategoriaInsumo).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoriaInsumoLabel[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {existingEmpaque && (
              <p className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                Se agregará al stock existente de {categoria === CategoriaInsumo.SEPARADOR
                  ? `${Number(existingEmpaque.stock).toLocaleString('es-AR')} kg`
                  : `${Math.round(Number(existingEmpaque.stock))} unidades`}
              </p>
            )}
            {errors.categoria && <p className="text-sm text-destructive">{errors.categoria}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="stock">{stockLabel}</Label>
            <Input
              id="stock"
              name="stock"
              type="number"
              step={stockStep}
              min="0"
              placeholder="0"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                if (errors.stock) setErrors(prev => { const next = {...prev}; delete next.stock; return next; });
                if (errors.cantidad) setErrors(prev => { const next = {...prev}; delete next.cantidad; return next; });
              }}
            />
            {errors.stock && <p className="text-sm text-destructive">{errors.stock}</p>}
            {errors.cantidad && <p className="text-sm text-destructive">{errors.cantidad}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="precio">Precio unitario ($)</Label>
            <Input
              id="precio"
              name="precio"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={precio}
              onChange={(e) => {
                setPrecio(e.target.value);
                if (errors.precio) setErrors(prev => { const next = {...prev}; delete next.precio; return next; });
                if (errors.precioUnitario) setErrors(prev => { const next = {...prev}; delete next.precioUnitario; return next; });
              }}
            />
            {errors.precio && <p className="text-sm text-destructive">{errors.precio}</p>}
            {errors.precioUnitario && <p className="text-sm text-destructive">{errors.precioUnitario}</p>}
            <p className="text-xs text-muted-foreground">
              {categoria === CategoriaInsumo.SEPARADOR ? 'Precio por kg de separador' : 'Precio por unidad de bolsa'}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Compra</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}