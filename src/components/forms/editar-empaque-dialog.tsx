'use client';

import { useState } from 'react';
import { useRefresh } from '@/components/refresh-context';
import { actualizarEmpaque } from '@/presentation/actions/empaques';
import { actualizarEmpaqueSchema } from '@/presentation/validations/empaque.schema';
import { toast } from 'sonner';
import type { EmpaqueResponse } from '@/presentation/dtos';
import { CategoriaInsumo } from '@/domain/enums';
import { categoriaInsumoLabel } from '@/domain/labels';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface EditarEmpaqueDialogProps {
  empaque: EmpaqueResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarEmpaqueDialog({ empaque, open, onOpenChange }: EditarEmpaqueDialogProps) {
  const refreshData = useRefresh();
  const [categoria, setCategoria] = useState<CategoriaInsumo>(empaque.categoria as CategoriaInsumo);
  const [stock, setStock] = useState(String(empaque.stock));
  const [precio, setPrecio] = useState(empaque.precio);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stockLabel = categoria === CategoriaInsumo.SEPARADOR ? 'Stock (kg)' : 'Stock (unidades)';
  const stockStep = categoria === CategoriaInsumo.SEPARADOR ? '0.01' : '1';

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const result = actualizarEmpaqueSchema.safeParse({
      id: empaque.id,
      categoria,
      stock: stock === '' ? undefined : Number(stock),
      precio: precio === '' ? undefined : Number(precio),
    });

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
    const formData = new FormData(e.currentTarget);
    // Set tipo from categoria label
    formData.set('tipo', categoriaInsumoLabel[categoria]);
    const actionResult = await actualizarEmpaque(formData);
    if (actionResult.success) {
      toast.success('Insumo actualizado exitosamente');
      await refreshData();
      onOpenChange(false);
    } else {
      toast.error(actionResult.error || 'Error al actualizar insumo');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Insumo</DialogTitle>
          <DialogDescription>
            Modifique la categoría, stock o precio del insumo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={empaque.id} />

          <div className="space-y-2">
            <Label htmlFor="edit-categoria">Categoría</Label>
            <Select name="categoria" value={categoria} onValueChange={(v) => {
              setCategoria(v as CategoriaInsumo);
              if (errors.categoria) setErrors(prev => { const next = {...prev}; delete next.categoria; return next; });
            }}>
              <SelectTrigger className="w-full">
                <SelectValue>{categoriaInsumoLabel[categoria]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.values(CategoriaInsumo).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoriaInsumoLabel[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoria && <p className="text-sm text-destructive">{errors.categoria}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-stock">{stockLabel}</Label>
            <Input
              id="edit-stock"
              name="stock"
              type="number"
              step={stockStep}
              min="0"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                if (errors.stock) setErrors(prev => { const next = {...prev}; delete next.stock; return next; });
              }}
            />
            {errors.stock && <p className="text-sm text-destructive">{errors.stock}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-precio">Precio ($)</Label>
            <Input
              id="edit-precio"
              name="precio"
              type="number"
              step="0.01"
              min="0"
              value={precio}
              onChange={(e) => {
                setPrecio(e.target.value);
                if (errors.precio) setErrors(prev => { const next = {...prev}; delete next.precio; return next; });
              }}
            />
            {errors.precio && <p className="text-sm text-destructive">{errors.precio}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar Cambios</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}