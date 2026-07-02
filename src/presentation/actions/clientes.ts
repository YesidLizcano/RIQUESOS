'use server';

// Cliente Server Actions — thin controllers, delegate to use cases
import { revalidatePath } from 'next/cache';
import { requireSession } from './auth';
import { PrismaClienteRepo } from '@/infrastructure/repositories/PrismaClienteRepo';
import { GestionarClientes } from '@/application/use-cases/GestionarClientes';
import { crearClienteSchema, actualizarClienteSchema, eliminarClienteSchema } from '@/presentation/validations/cliente.schema';
import type { CrearClienteRequest, ActualizarClienteRequest, ClienteResponse } from '../dtos';
import { handlePrismaError } from './utils';
import { recordAuditLog } from './audit-log';
import { logger } from '@/infrastructure/pino-logger';

async function getGestionarClientesUseCase() {
  const clienteRepo = new PrismaClienteRepo();
  return new GestionarClientes(clienteRepo);
}

function clienteToResponse(cliente: import('@/domain/entities/Cliente').Cliente): ClienteResponse {
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    tipo: cliente.tipo,
    precioDobleCrema: cliente.precioDobleCrema?.value ?? null,
    precioSemisalado: cliente.precioSemisalado?.value ?? null,
    deletedAt: cliente.deletedAt?.toISOString() ?? null,
  };
}

export async function crearCliente(formData: FormData) {
  const session = await requireSession();

  const parsed = crearClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: CrearClienteRequest = {
    nombre: parsed.data.nombre,
    tipo: parsed.data.tipo,
    precioDobleCrema: parsed.data.precioDobleCrema || undefined,
    precioSemisalado: parsed.data.precioSemisalado || undefined,
  };

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.crear(request);
    await recordAuditLog({ entityType: 'Cliente', entityId: cliente.id, action: 'CREATE', userId: (session.user as { id?: string }).id });
    revalidatePath('/clientes');
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error creating cliente');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error creating cliente',
    };
  }
}

export async function actualizarCliente(formData: FormData) {
  const session = await requireSession();

  const parsed = actualizarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const request: ActualizarClienteRequest = {
    id: parsed.data.id,
    nombre: parsed.data.nombre || undefined,
    precioDobleCrema: parsed.data.precioDobleCrema || undefined,
    precioSemisalado: parsed.data.precioSemisalado || undefined,
  };

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.actualizar(request);
    await recordAuditLog({ entityType: 'Cliente', entityId: cliente.id, action: 'UPDATE', userId: (session.user as { id?: string }).id });
    revalidatePath('/clientes');
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error updating cliente');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error updating cliente',
    };
  }
}

export async function eliminarCliente(formData: FormData) {
  const session = await requireSession();

  const parsed = eliminarClienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const useCase = await getGestionarClientesUseCase();
    await useCase.eliminar(parsed.data.id);
    await recordAuditLog({ entityType: 'Cliente', entityId: parsed.data.id, action: 'DELETE', userId: (session.user as { id?: string }).id });
    revalidatePath('/clientes');
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, 'Error deleting cliente');
    const prismaError = handlePrismaError(error);
    if (prismaError) {
      return { success: false, error: 'No se puede eliminar un cliente con ventas asociadas' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error deleting cliente',
    };
  }
}

export async function restaurarCliente(formData: FormData) {
  const session = await requireSession();

  const id = formData.get('id') as string;

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.restaurar(id);
    await recordAuditLog({ entityType: 'Cliente', entityId: id, action: 'RESTORE', userId: (session.user as { id?: string }).id });
    revalidatePath('/clientes');
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error restoring cliente');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error restoring cliente',
    };
  }
}

export async function getClientes() {
  await requireSession();

  try {
    const useCase = await getGestionarClientesUseCase();
    const clientes = await useCase.obtenerTodos();
    return { success: true, clientes: clientes.map(clienteToResponse) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching clientes');
    return { success: false, error: 'Error fetching clientes', clientes: [] };
  }
}

export async function getClientesIncludeDeleted() {
  await requireSession();

  try {
    const clienteRepo = new PrismaClienteRepo();
    const deletedClientes = await clienteRepo.findDeleted();
    const activeResult = await getClientes();
    const active = activeResult.success && activeResult.clientes ? activeResult.clientes : [];
    return { success: true, clientes: [...active, ...deletedClientes.map(clienteToResponse)] };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching clientes including deleted');
    return { success: false, error: 'Error fetching clientes', clientes: [] };
  }
}

export async function getClienteById(id: string) {
  await requireSession();

  try {
    const useCase = await getGestionarClientesUseCase();
    const cliente = await useCase.obtenerPorId(id);
    if (!cliente) {
      return { success: false, error: 'Cliente not found' };
    }
    return { success: true, cliente: clienteToResponse(cliente) };
  } catch (error) {
    logger.error({ err: error }, 'Error fetching cliente');
    return { success: false, error: 'Error fetching cliente' };
  }
}