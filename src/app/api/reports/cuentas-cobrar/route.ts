import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/infrastructure/auth';
import { getCuentasPorCobrar } from '@/presentation/actions/dashboard';
import { generateCuentasCobrarPdf } from '@/infrastructure/pdf/templates/cuentas-cobrar';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const inicio = searchParams.get('inicio');
  const fin = searchParams.get('fin');

  if (!inicio || !fin) {
    return NextResponse.json({ error: 'inicio and fin are required' }, { status: 400 });
  }

  try {
    const result = await getCuentasPorCobrar(inicio, fin);
    if (!result.success) {
      return NextResponse.json({ error: 'Error al obtener cuentas por cobrar' }, { status: 500 });
    }
    const buffer = await generateCuentasCobrarPdf(result.cuentas, inicio, fin);
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Cuentas_Cobrar_${date}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating Cuentas Cobrar PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}