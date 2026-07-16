// Infrastructure: PrismaVentaItemRepo — read VentaItem records
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { VentaItem } from '../../domain/entities/VentaItem';
import type { VentaTipo } from '../../domain/entities/Venta';
import { OrigenCorte } from '../../domain/enums';
import type { VentaItemRepository } from '../../domain/ports/VentaItemRepository';

export class PrismaVentaItemRepo implements VentaItemRepository {
  async findByVentaId(ventaId: string): Promise<VentaItem[]> {
    const records = await prisma.ventaItem.findMany({
      where: { ventaId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async findByVentaIds(ventaIds: string[]): Promise<VentaItem[]> {
    if (ventaIds.length === 0) return [];
    const records = await prisma.ventaItem.findMany({
      where: { ventaId: { in: ventaIds } },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => this.toEntity(r));
  }

  async save(item: VentaItem): Promise<VentaItem> {
    const created = await prisma.ventaItem.create({
      data: {
        ventaId: item.ventaId,
        loteId: item.loteId,
        ventaTipo: item.ventaTipo as 'BLOQUES' | 'GRANEL',
        cantidadKg: new Prisma.Decimal(item.cantidadKg.value),
        precioVentaKg: new Prisma.Decimal(item.precioVentaKg.value),
        ingreso: new Prisma.Decimal(item.ingreso.value),
        costoAplicadoKg: new Prisma.Decimal(item.costoAplicadoKg.value),
        costoAplicado: new Prisma.Decimal(item.costoAplicado.value),
        bloquesEnterosVendidos: item.bloquesEnterosVendidos,
        bloquesTajadosVendidos: item.bloquesTajadosVendidos,
        bloquesTajadosDeFabricaVendidos: item.bloquesTajadosDeFabricaVendidos,
        bloquesTajadosInternosVendidos: item.bloquesTajadosInternosVendidos,
        bloquesReempacados: item.bloquesReempacados,
        costoEmpaques: new Prisma.Decimal(item.costoEmpaques.value),
        origenCorte: item.origenCorte,
        sueltosEnteroDelta: new Prisma.Decimal(item.sueltosEnteroDelta),
        sueltosTajadoDelta: new Prisma.Decimal(item.sueltosTajadoDelta),
        precioEnteroBloque: item.precioEnteroBloque ? new Prisma.Decimal(item.precioEnteroBloque.value) : null,
        precioTajadoBloque: item.precioTajadoBloque ? new Prisma.Decimal(item.precioTajadoBloque.value) : null,
      },
    });
    return this.toEntity(created);
  }

  async saveMany(items: VentaItem[]): Promise<VentaItem[]> {
    const results: VentaItem[] = [];
    for (const item of items) {
      const saved = await this.save(item);
      results.push(saved);
    }
    return results;
  }

  private toEntity(record: {
    id: string;
    ventaId: string;
    loteId: string;
    ventaTipo: string;
    cantidadKg: number | { toString(): string };
    precioVentaKg: number | { toString(): string };
    ingreso: number | { toString(): string };
    costoAplicadoKg: number | { toString(): string };
    costoAplicado: number | { toString(): string };
    bloquesEnterosVendidos: number;
    bloquesTajadosVendidos: number;
    bloquesTajadosDeFabricaVendidos: number;
    bloquesTajadosInternosVendidos: number;
    bloquesReempacados: number;
    costoEmpaques: number | { toString(): string };
    origenCorte?: string | null;
    sueltosEnteroDelta?: number | { toString(): string };
    sueltosTajadoDelta?: number | { toString(): string };
    precioEnteroBloque?: number | { toString(): string } | null;
    precioTajadoBloque?: number | { toString(): string } | null;
  }): VentaItem {
    return new VentaItem({
      id: record.id,
      ventaId: record.ventaId,
      loteId: record.loteId,
      ventaTipo: record.ventaTipo as VentaTipo,
      cantidadKg: record.cantidadKg.toString(),
      precioVentaKg: record.precioVentaKg.toString(),
      ingreso: record.ingreso.toString(),
      costoAplicadoKg: record.costoAplicadoKg.toString(),
      costoAplicado: record.costoAplicado.toString(),
      bloquesEnterosVendidos: record.bloquesEnterosVendidos,
      bloquesTajadosVendidos: record.bloquesTajadosVendidos,
      bloquesTajadosDeFabricaVendidos: record.bloquesTajadosDeFabricaVendidos,
      bloquesTajadosInternosVendidos: record.bloquesTajadosInternosVendidos,
      bloquesReempacados: record.bloquesReempacados,
      costoEmpaques: record.costoEmpaques.toString(),
      origenCorte: (record.origenCorte as OrigenCorte) ?? OrigenCorte.ENTERO,
      sueltosEnteroDelta: record.sueltosEnteroDelta?.toString() ?? '0',
      sueltosTajadoDelta: record.sueltosTajadoDelta?.toString() ?? '0',
      precioEnteroBloque: record.precioEnteroBloque?.toString(),
      precioTajadoBloque: record.precioTajadoBloque?.toString(),
    });
  }
}