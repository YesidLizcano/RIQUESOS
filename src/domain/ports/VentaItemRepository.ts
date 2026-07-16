// Port: VentaItemRepository — interface only, no infrastructure imports
import type { VentaItem } from '../entities/VentaItem';

export interface VentaItemRepository {
  findByVentaId(ventaId: string): Promise<VentaItem[]>;
  findByVentaIds(ventaIds: string[]): Promise<VentaItem[]>;
  save(item: VentaItem): Promise<VentaItem>;
  saveMany(items: VentaItem[]): Promise<VentaItem[]>;
}