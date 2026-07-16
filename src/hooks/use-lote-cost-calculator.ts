import { useMemo } from 'react';
import { DOBLE_CREMA_BLOCK_KG, isDobleCrema } from '@/domain/constants';

export interface UseLoteCostCalculatorInput {
  /** Product type string (e.g. 'DOBLE_CREMA' or 'SEMISALADO') */
  producto: string;
  /** Number of whole blocks (DC only) */
  bloquesEnteros: number;
  /** Number of factory-sliced blocks (DC only) */
  bloquesTajadosDeFabrica: number;
  /** Total kg purchased */
  cantidadCompradaKg: number;
  /** Price per whole block (DC) */
  precioPorBloqueEntero: number;
  /** Price per sliced block (DC). 0 means "same as entero" */
  precioPorBloqueTajado: number;
  /** Price per kg (SS) or derived from bloque price (DC) */
  precioCompraBaseKg: number;
  /** Freight cost */
  costoFlete: number;
}

export interface LoteCostCalculatorResult {
  isDobleCremaSelected: boolean;
  totalBloques: number;
  effectivePrecioBaseKg: number;
  costoRealCalculadoKg: number | null;
  costoRealPorBloqueEntero: number | null;
  costoRealCalculadoTajadoFabricaKg: number | null;
  costoRealPorBloqueTajado: number | null;
  showTajadoPrice: boolean;
  costoMercancia: number;
  costoFleteNum: number;
  inversionTotal: number;
  hasInversion: boolean;
}

/**
 * Shared cost calculation logic for Lote create/edit dialogs.
 * Accepts numeric primitives and returns all computed cost values.
 * Does NOT manage form state — only derives values from inputs.
 */
export function useLoteCostCalculator(input: UseLoteCostCalculatorInput): LoteCostCalculatorResult {
  const {
    producto,
    bloquesEnteros,
    bloquesTajadosDeFabrica,
    cantidadCompradaKg,
    precioPorBloqueEntero,
    precioPorBloqueTajado,
    precioCompraBaseKg,
    costoFlete,
  } = input;

  const isDobleCremaSelected = isDobleCrema(producto);
  const totalBloques = bloquesEnteros + bloquesTajadosDeFabrica;

  // For DC: derived precioCompraBaseKg from precioPorBloqueEntero
  const effectivePrecioBaseKg = isDobleCremaSelected
    ? precioPorBloqueEntero / DOBLE_CREMA_BLOCK_KG
    : precioCompraBaseKg;

  // Compute costo real calculado — flete distributed equally per block for DC
  const costoRealCalculadoKg = useMemo<number | null>(() => {
    if (!cantidadCompradaKg || cantidadCompradaKg <= 0) return null;

    if (isDobleCremaSelected) {
      if (totalBloques === 0) return null;

      const precioEntero = precioPorBloqueEntero;
      // If precioPorBloqueTajado is 0 (unset), fall back to entero price
      const precioTajado = precioPorBloqueTajado || precioEntero;
      const valorEnteros = precioEntero * bloquesEnteros;
      const valorTajadosFabrica = precioTajado * bloquesTajadosDeFabrica;

      if (valorEnteros + valorTajadosFabrica === 0) {
        // Fallback: simple average with base price
        const base = effectivePrecioBaseKg;
        if (isNaN(base) || base <= 0) return null;
        return (base * cantidadCompradaKg + costoFlete) / cantidadCompradaKg;
      }

      // Flete distributed equally per block
      const fletePorBloque = costoFlete / totalBloques;

      // Costo real entero por kg = (precioPorBloqueEntero + fletePorBloque) / pesoPorBloque
      const costoEnteroPorBloque = precioEntero + fletePorBloque;
      return costoEnteroPorBloque / DOBLE_CREMA_BLOCK_KG;
    }

    // Semisalado: simple average
    if (isNaN(precioCompraBaseKg) || precioCompraBaseKg <= 0) return null;
    return (precioCompraBaseKg * cantidadCompradaKg + costoFlete) / cantidadCompradaKg;
  }, [cantidadCompradaKg, isDobleCremaSelected, totalBloques, precioPorBloqueEntero, precioPorBloqueTajado, bloquesEnteros, bloquesTajadosDeFabrica, effectivePrecioBaseKg, costoFlete, precioCompraBaseKg]);

  const costoRealPorBloqueEntero = isDobleCremaSelected && costoRealCalculadoKg !== null
    ? costoRealCalculadoKg * DOBLE_CREMA_BLOCK_KG
    : null;

  // Costo por bloque tajado de fábrica — flete distributed equally per block
  const costoRealCalculadoTajadoFabricaKg = useMemo<number | null>(() => {
    if (!isDobleCremaSelected) return null;
    if (bloquesTajadosDeFabrica === 0) return null;

    if (totalBloques === 0) return costoRealCalculadoKg;

    // If precioPorBloqueTajado is 0 (unset), fall back to entero price
    const precioTajado = precioPorBloqueTajado || precioPorBloqueEntero;

    // Flete distributed equally per block
    const fletePorBloque = costoFlete / totalBloques;

    // Costo real tajado fábrica por kg = (precioPorBloqueTajado + fletePorBloque) / pesoPorBloque
    const costoTajadoPorBloque = precioTajado + fletePorBloque;
    return costoTajadoPorBloque / DOBLE_CREMA_BLOCK_KG;
  }, [isDobleCremaSelected, bloquesTajadosDeFabrica, totalBloques, costoRealCalculadoKg, precioPorBloqueTajado, precioPorBloqueEntero, costoFlete]);

  const costoRealPorBloqueTajado = costoRealCalculadoTajadoFabricaKg !== null
    ? costoRealCalculadoTajadoFabricaKg * DOBLE_CREMA_BLOCK_KG
    : null;

  const showTajadoPrice = isDobleCremaSelected && (
    (precioPorBloqueTajado > 0 && precioPorBloqueTajado !== precioPorBloqueEntero)
    || bloquesTajadosDeFabrica > 0
  );

  // Calculate investment preview
  const costoMercancia = useMemo(() => {
    if (isDobleCremaSelected) {
      const precioTajado = precioPorBloqueTajado || precioPorBloqueEntero;
      return bloquesEnteros * precioPorBloqueEntero
        + bloquesTajadosDeFabrica * precioTajado;
    }
    return cantidadCompradaKg * precioCompraBaseKg;
  }, [isDobleCremaSelected, bloquesEnteros, precioPorBloqueEntero, bloquesTajadosDeFabrica, precioPorBloqueTajado, cantidadCompradaKg, precioCompraBaseKg]);

  const costoFleteNum = costoFlete;
  const inversionTotal = costoMercancia + costoFleteNum;
  const hasInversion = costoMercancia > 0;

  return {
    isDobleCremaSelected,
    totalBloques,
    effectivePrecioBaseKg,
    costoRealCalculadoKg,
    costoRealPorBloqueEntero,
    costoRealCalculadoTajadoFabricaKg,
    costoRealPorBloqueTajado,
    showTajadoPrice,
    costoMercancia,
    costoFleteNum,
    inversionTotal,
    hasInversion,
  };
}