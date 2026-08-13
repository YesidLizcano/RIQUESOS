import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { prisma } from '@/infrastructure/db';
import { Prisma } from '@prisma/client';
import { generateReciboInternoPdf } from '@/infrastructure/pdf/templates/recibo-venta';
import type { VentaResponse, VentaItemResponse, VentaTipo } from '@/presentation/dtos/venta.dto';

function ventaItemToResponse(item: {
  id: string;
  ventaId: string;
  loteId: string;
  ventaTipo: string;
  cantidadKg: { toString(): string };
  precioVentaKg: { toString(): string };
  ingreso: { toString(): string };
  costoAplicadoKg: { toString(): string };
  costoAplicado: { toString(): string };
  bloquesEnterosVendidos: number;
  bloquesTajadosVendidos: number;
  bloquesTajadosDeFabricaVendidos: number;
  bloquesTajadosInternosVendidos: number;
  bloquesReempacados: number;
  costoEmpaques: { toString(): string };
  precioEnteroBloque?: { toString(): string } | null;
  precioTajadoBloque?: { toString(): string } | null;
  origenCorte?: string | null;
  origenTajadoGranel?: string | null;
  sueltosEnteroDelta?: { toString(): string } | null;
  sueltosTajadoDelta?: { toString(): string } | null;
}): VentaItemResponse {
  return {
    id: item.id,
    ventaId: item.ventaId,
    loteId: item.loteId,
    ventaTipo: item.ventaTipo as VentaTipo,
    cantidadKg: item.cantidadKg.toString(),
    precioVentaKg: item.precioVentaKg.toString(),
    ingreso: item.ingreso.toString(),
    costoAplicadoKg: item.costoAplicadoKg.toString(),
    costoAplicado: item.costoAplicado.toString(),
    bloquesEnterosVendidos: item.bloquesEnterosVendidos,
    bloquesTajadosVendidos: item.bloquesTajadosVendidos,
    bloquesTajadosDeFabricaVendidos: item.bloquesTajadosDeFabricaVendidos,
    bloquesTajadosInternosVendidos: item.bloquesTajadosInternosVendidos,
    bloquesReempacados: item.bloquesReempacados,
    costoEmpaques: item.costoEmpaques.toString(),
    precioEnteroBloque: item.precioEnteroBloque?.toString() ?? null,
    precioTajadoBloque: item.precioTajadoBloque?.toString() ?? null,
    origenCorte: item.origenCorte ?? 'ENTERO',
    origenTajadoGranel: item.origenTajadoGranel ?? null,
    sueltosEnteroDelta: item.sueltosEnteroDelta?.toString(),
    sueltosTajadoDelta: item.sueltosTajadoDelta?.toString(),
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const ventaId = searchParams.get('ventaId');

  if (!ventaId) {
    return NextResponse.json({ error: 'ventaId is required' }, { status: 400 });
  }

  try {
    const ventaRecord = await prisma.venta.findUnique({
      where: { id: ventaId },
      include: {
        items: true,
        cliente: true,
        sede: true,
      },
    });

    if (!ventaRecord) {
      return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
    }

    const loteIds = ventaRecord.items.map((item) => item.loteId);
    const lotes = await prisma.lote.findMany({
      where: { id: { in: loteIds } },
      include: { proveedor: true },
    });
    const loteMap = new Map(lotes.map((l) => [l.id, l]));

    const saldo = new Prisma.Decimal(ventaRecord.ingresoTotal.toString())
      .minus(new Prisma.Decimal(ventaRecord.abono.toString()))
      .toString();

    const venta: VentaResponse = {
      id: ventaRecord.id,
      fecha: ventaRecord.fecha.toISOString(),
      clienteId: ventaRecord.clienteId,
      clienteNombre: ventaRecord.cliente?.nombre ?? 'Ocasional',
      sedeId: ventaRecord.sedeId ?? null,
      sedeNombre: ventaRecord.sede?.nombre ?? null,
      cantidadTotalKg: ventaRecord.cantidadTotalKg.toString(),
      ingresoTotal: ventaRecord.ingresoTotal.toString(),
      costoAplicado: ventaRecord.costoAplicado.toString(),
      gananciaBruta: ventaRecord.gananciaBruta.toString(),
      valorDomicilio: ventaRecord.valorDomicilio.toString(),
      costoDomiciliario: ventaRecord.costoDomiciliario.toString(),
      domiciliario: ventaRecord.domiciliario,
      metodoPago: ventaRecord.metodoPago,
      metodoPagoAbono: ventaRecord.metodoPagoAbono,
      abono: ventaRecord.abono.toString(),
      saldo,
      observaciones: ventaRecord.observaciones,
      items: ventaRecord.items.map((item) => {
        const lote = loteMap.get(item.loteId);
        return {
          ...ventaItemToResponse(item),
          loteProducto: lote?.producto ?? '',
          loteProveedorNombre: lote?.proveedor?.nombre ?? '',
        };
      }),
    };

    const buffer = await generateReciboInternoPdf(venta, ventaRecord.sede?.nombre ?? undefined);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Recibo_Interno_${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating Recibo Interno PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}