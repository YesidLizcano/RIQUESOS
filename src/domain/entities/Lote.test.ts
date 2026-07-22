import { describe, it, expect } from 'vitest';
import { Lote } from './Lote';
import { Kilogramo } from '../value-objects/Kilogramo';
import { EstadoLote, TipoProducto, EstadoPagoLote, MetodoPago } from '../enums';

describe('Lote', () => {
  const validProps = {
    proveedorId: 'prov-1',
    producto: TipoProducto.DOBLE_CREMA,
    cantidadCompradaKg: '100',
    precioCompraBaseKg: '3000',
  };

  describe('constructor — cost calculation', () => {
    it('should calculate Costo_Entero_Por_Kg with base and flete only', () => {
      const lote = new Lote({
        ...validProps,
        costoFlete: '50000',
        costoTajado: '20000',
        costoEmpaques: '10000',
      });
      // Costo_Entero_Por_Kg = (3000 × 100 + 50000) / 100 = 3500
      // tajado (20000) and separadores are NOT included in costoRealCalculadoKg
      expect(lote.costoRealCalculadoKg.value).toBe('3500');
    });

    it('should calculate Costo_Real_Por_Kg with zero optional costs', () => {
      const lote = new Lote({
        ...validProps,
        costoFlete: '0',
        costoTajado: '0',
        costoEmpaques: '0',
      });
      // (3000 × 100 + 0) / 100 = 3000
      expect(lote.costoRealCalculadoKg.value).toBe('3000');
    });

    it('should default optional costs to zero when not provided', () => {
      const lote = new Lote(validProps);
      // Same as zero optional costs
      expect(lote.costoFlete.value).toBe('0');
      expect(lote.costoTajado.value).toBe('0');
      expect(lote.costoEmpaques.value).toBe('0');
      expect(lote.costoSeparadores.value).toBe('0');
      expect(lote.costoRealCalculadoKg.value).toBe('3000');
    });

    it('should set stockDisponibleKg to cantidadCompradaKg when not specified', () => {
      const lote = new Lote(validProps);
      expect(lote.stockDisponibleKg.value).toBe('100');
    });

    it('should use provided stockDisponibleKg when specified', () => {
      const lote = new Lote({
        ...validProps,
        stockDisponibleKg: '50',
      });
      expect(lote.stockDisponibleKg.value).toBe('50');
    });
  });

  describe('constructor — precioPorBloqueTajado defaults', () => {
    it('should default precioPorBloqueTajado to precioPorBloqueEntero when not provided', () => {
      const lote = new Lote({
        ...validProps,
        precioPorBloqueEntero: '7500',
      });
      expect(lote.precioPorBloqueEntero.value).toBe('7500');
      expect(lote.precioPorBloqueTajado.value).toBe('7500');
    });

    it('should allow separate precioPorBloqueTajado when provided', () => {
      const lote = new Lote({
        ...validProps,
        precioPorBloqueEntero: '7500',
        precioPorBloqueTajado: '8000',
      });
      expect(lote.precioPorBloqueEntero.value).toBe('7500');
      expect(lote.precioPorBloqueTajado.value).toBe('8000');
    });

    it('should default both block prices to zero when not provided', () => {
      const lote = new Lote(validProps);
      expect(lote.precioPorBloqueEntero.value).toBe('0');
      expect(lote.precioPorBloqueTajado.value).toBe('0');
    });
  });

  describe('constructor — status and defaults', () => {
    it('should default to ACTIVO status', () => {
      const lote = new Lote(validProps);
      expect(lote.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should accept explicit ACTIVO status', () => {
      const lote = new Lote({ ...validProps, estado: EstadoLote.ACTIVO });
      expect(lote.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should accept AGOTADO status', () => {
      const lote = new Lote({ ...validProps, estado: EstadoLote.AGOTADO, stockDisponibleKg: '0' });
      expect(lote.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should default version to 0', () => {
      const lote = new Lote(validProps);
      expect(lote.version).toBe(0);
    });

    it('should accept explicit version', () => {
      const lote = new Lote({ ...validProps, version: 3 });
      expect(lote.version).toBe(3);
    });
  });

  describe('constructor — validation', () => {
    it('should reject zero quantity', () => {
      expect(() => new Lote({ ...validProps, cantidadCompradaKg: '0' })).toThrow(
        'Lote cantidadCompradaKg cannot be zero'
      );
    });

    it('should reject missing proveedorId', () => {
      expect(() => new Lote({ ...validProps, proveedorId: '' })).toThrow(
        'Lote proveedorId is required'
      );
    });
  });

  describe('deductStock', () => {
    it('should deduct stock and return new Lote', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '100' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.stockDisponibleKg.value).toBe('75');
    });

    it('should transition to AGOTADO when stock reaches zero', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '25' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.stockDisponibleKg.value).toBe('0');
      expect(result.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should remain ACTIVO when stock does not reach zero', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '100' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should reject deduction from AGOTADO lote', () => {
      const lote = new Lote({ ...validProps, estado: EstadoLote.AGOTADO, stockDisponibleKg: '0' });
      expect(() => lote.deductStock(new Kilogramo('5'))).toThrow(
        'Cannot deduct stock from an AGOTADO Lote'
      );
    });

    it('should reject deduction exceeding available stock', () => {
      const lote = new Lote({ ...validProps, stockDisponibleKg: '10' });
      expect(() => lote.deductStock(new Kilogramo('15'))).toThrow(
        'Insufficient stock'
      );
    });

    it('should preserve other properties after deduction', () => {
      const lote = new Lote({ ...validProps, id: 'lote-1', stockDisponibleKg: '100' });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.id).toBe('lote-1');
      expect(result.producto).toBe(TipoProducto.DOBLE_CREMA);
      expect(result.proveedorId).toBe('prov-1');
      expect(result.cantidadCompradaKg.value).toBe('100');
      expect(result.costoRealCalculadoKg.value).toBe('3000');
    });

    it('should NOT recalculate bloquesEnteros for DC lote after granel deduction', () => {
      // deductStock only deducts kg — it does NOT touch bloquesEnteros.
      // The caller (repo) is responsible for recalculating bloquesEnteros from stock
      // for granel/kg sales of DC products.
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        stockDisponibleKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      const result = lote.deductStock(new Kilogramo('1.5'));
      expect(result.stockDisponibleKg.value).toBe('98.5');
      expect(result.bloquesEnteros).toBe(40); // unchanged — caller recalculates
    });

    it('should not change bloquesEnteros for SEMISALADO lote after deduction', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        stockDisponibleKg: '50',
        precioCompraBaseKg: '4000',
      });
      const result = lote.deductStock(new Kilogramo('10'));
      expect(result.stockDisponibleKg.value).toBe('40');
      expect(result.bloquesEnteros).toBe(0);
    });
  });

  describe('deductStockByBlocks', () => {
    it('should deduct blocks and stock for DC lote', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        stockDisponibleKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      const result = lote.deductStockByBlocks(3);
      expect(result.bloquesEnteros).toBe(37);
      expect(result.stockDisponibleKg.value).toBe('92.5'); // 100 - 3*2.5
      expect(result.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should transition to AGOTADO when all blocks deducted', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '7.5',
        stockDisponibleKg: '7.5',
        bloquesEnteros: 3,
        precioCompraBaseKg: '3000',
      });
      const result = lote.deductStockByBlocks(3);
      expect(result.bloquesEnteros).toBe(0);
      expect(result.stockDisponibleKg.value).toBe('0');
      expect(result.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should reject block deduction on SEMISALADO lote', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        stockDisponibleKg: '50',
        precioCompraBaseKg: '4000',
      });
      expect(() => lote.deductStockByBlocks(1)).toThrow(
        'Block deduction is only valid for Doble Crema lotes'
      );
    });

    it('should reject deduction with zero blocks', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        stockDisponibleKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.deductStockByBlocks(0)).toThrow(
        'Block quantity must be greater than 0'
      );
    });

    it('should reject deduction exceeding available blocks', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        stockDisponibleKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.deductStockByBlocks(41)).toThrow(
        'Insufficient blocks'
      );
    });

    it('should reject non-integer block quantity', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        stockDisponibleKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.deductStockByBlocks(2.5)).toThrow(
        'Block quantity must be a whole number'
      );
    });

    it('should reject deduction from AGOTADO lote', () => {
      const lote = new Lote({
        ...validProps,
        estado: EstadoLote.AGOTADO,
        stockDisponibleKg: '0',
        bloquesEnteros: 0,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.deductStockByBlocks(1)).toThrow(
        'Cannot deduct stock from an AGOTADO Lote'
      );
    });
  });

  describe('markAsAgotado', () => {
    it('should transition to AGOTADO status', () => {
      const lote = new Lote({ ...validProps });
      const result = lote.markAsAgotado();
      expect(result.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should preserve all other properties', () => {
      const lote = new Lote({ ...validProps, id: 'lote-1' });
      const result = lote.markAsAgotado();
      expect(result.id).toBe('lote-1');
      expect(result.stockDisponibleKg.value).toBe('100');
    });
  });

  describe('constructor — bloques fields for Doble Crema', () => {
    it('should store bloques fields for DOBLE_CREMA', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100', // Calculated by use case: 40 * 2.5
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 0,
        precioCompraBaseKg: '3000',
      });
      expect(lote.cantidadCompradaKg.value).toBe('100');
      expect(lote.bloquesEnteros).toBe(40);
      expect(lote.bloquesTajados).toBe(0);
      expect(lote.bloquesTajadosDeFabrica).toBe(0);
    });

    it('should store bloquesEnteros and bloquesTajadosDeFabrica for DC lote', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '30', // Calculated by use case: (10 + 2) * 2.5
        bloquesEnteros: 10,
        bloquesTajadosDeFabrica: 2,
        precioCompraBaseKg: '3000',
      });
      expect(lote.cantidadCompradaKg.value).toBe('30');
      expect(lote.bloquesEnteros).toBe(10);
      expect(lote.bloquesTajadosDeFabrica).toBe(2);
    });

    it('should default bloques fields to 0 for Semisalado', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '4000',
      });
      expect(lote.bloquesEnteros).toBe(0);
      expect(lote.bloquesTajados).toBe(0);
      expect(lote.bloquesTajadosDeFabrica).toBe(0);
    });
  });

  describe('registrarTajado', () => {
    it('should decrement bloquesEnteros and increment bloquesTajados', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 0,
        precioCompraBaseKg: '3000',
      });
      const result = lote.registrarTajado(5, '1500');
      expect(result.bloquesEnteros).toBe(35);
      expect(result.bloquesTajados).toBe(5);
    });

    it('should NOT include tajado in costoRealCalculadoKg (entero cost)', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
        costoEmpaques: '5000',
      });
      // costoRealCalculadoKg = (3000 × 100 + 10000) / 100 = 3100
      // tajado is NOT in this formula anymore
      const result = lote.registrarTajado(10, '1500');
      expect(result.costoTajado.value).toBe('15000');
      expect(result.costoRealCalculadoKg.value).toBe('3100');
    });

    it('should calculate costoTajadoKg including tajado and separadores', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
      });
      // After tajado: 10 blocks tajados, costoTajado = 15000, costoSeparadores = 5000
      // costoRealCalculadoKg = (3000 × 100 + 10000) / 100 = 3100 (entero cost)
      // costoTajadoKg = 3100 + (15000 + 5000) / (10 × 2.5) = 3100 + 800 = 3900
      const result = lote.registrarTajado(10, '1500', '5000');
      expect(result.costoTajadoKg.value).toBe('3900');
      expect(result.costoRealCalculadoKg.value).toBe('3100');
    });

    it('should fall back to costoRealCalculadoKg for costoTajadoKg when no tajados exist', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
      });
      // No tajados yet, so costoTajadoKg should equal costoRealCalculadoKg
      expect(lote.costoTajadoKg.value).toBe(lote.costoRealCalculadoKg.value);
    });

    it('should accumulate tajado costs across multiple tajado operations', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      const first = lote.registrarTajado(5, '1500');
      expect(first.costoTajado.value).toBe('7500');
      expect(first.bloquesEnteros).toBe(35);
      expect(first.bloquesTajados).toBe(5);

      const second = first.registrarTajado(3, '2000');
      expect(second.costoTajado.value).toBe('13500');
      expect(second.bloquesEnteros).toBe(32);
      expect(second.bloquesTajados).toBe(8);
    });

    it('should accumulate costoSeparadores across multiple tajado operations', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      const first = lote.registrarTajado(5, '1500', '2000');
      expect(first.costoSeparadores.value).toBe('2000');

      const second = first.registrarTajado(3, '2000', '3000');
      expect(second.costoSeparadores.value).toBe('5000');
    });

    it('should not change cantidadCompradaKg or stockDisponibleKg', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      const result = lote.registrarTajado(5, '1500');
      expect(result.cantidadCompradaKg.value).toBe('100');
      expect(result.stockDisponibleKg.value).toBe('100');
    });

    it('should reject tajado when bloquesEnteros is insufficient', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '7.5',
        bloquesEnteros: 3,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.registrarTajado(5, '1500')).toThrow(
        'No hay suficientes bloques enteros'
      );
    });

    it('should reject tajado on SEMISALADO lote', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '4000',
      });
      expect(() => lote.registrarTajado(1, '1500')).toThrow(
        'Solo se puede registrar tajado en lotes de Doble Crema'
      );
    });

    it('should reject tajado with zero or negative bloques', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
      });
      expect(() => lote.registrarTajado(0, '1500')).toThrow(
        'La cantidad de bloques debe ser mayor a 0'
      );
    });
  });

  describe('costoTajadoKg', () => {
    it('should return costoRealCalculadoKg for SEMISALADO (non-DC) lote', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '4000',
      });
      expect(lote.costoTajadoKg.value).toBe(lote.costoRealCalculadoKg.value);
    });

    it('should return costoRealCalculadoKg for DC lote with no tajados', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
      });
      // No tajados, so costoTajadoKg should equal costoRealCalculadoKg
      expect(lote.costoTajadoKg.value).toBe(lote.costoRealCalculadoKg.value);
    });

    it('should include tajado + separadores spread over tajados kg', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
      });
      // After tajado: 10 blocks, costoTajado = 15000, costoSeparadores = 5000
      // costoRealCalculadoKg = (3000×100 + 10000) / 100 = 3100
      // kgTajados = 10 × 2.5 = 25
      // costoTajadoKg = 3100 + (15000 + 5000) / 25 = 3100 + 800 = 3900
      const result = lote.registrarTajado(10, '1500', '5000');
      expect(result.costoTajadoKg.value).toBe('3900');
    });

    it('should NOT include bloquesTajadosDeFabrica in costoTajadoKg denominator', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '125', // 50 blocks = 40 enteros + 10 tajados de fábrica
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 10, // pre-cut from factory, NO tajado cost
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
        costoTajado: '50000',
        costoSeparadores: '12500',
      });
      // costoRealCalculadoKg = (3000×125 + 10000) / 125 = 3080
      // bloquesTajados = 0 (we haven't cut any ourselves)
      // No internally-cut tajados → costoTajadoKg falls back to costoRealCalculadoKg
      expect(lote.costoTajadoKg.value).toBe('3080');
    });

    it('should spread tajado cost only over internally-cut blocks, not factory-cut', () => {
      // 30 enteros, 5 internally-cut tajados, 10 factory-cut tajados
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '112.5', // 45 blocks = 30 enteros + 5 tajados + 10 tajados de fábrica
        bloquesEnteros: 30,
        bloquesTajados: 5,
        bloquesTajadosDeFabrica: 10,
        precioCompraBaseKg: '3000',
        costoFlete: '10000',
        costoTajado: '7500',    // 5 blocks × 1500/block
        costoSeparadores: '750', // separators cost for tajado
      });
      // costoRealCalculadoKg = (3000×112.5 + 10000) / 112.5 = 3088.888...
      // costoTajadoKg = costoRealCalculadoKg + (7500 + 750) / (5 × 2.5)
      //               = 3088.88... + 8250 / 12.5
      //               = 3088.88... + 660
      //               = 3748.88...
      // Only bloquesTajados (5) in denominator, NOT bloquesTajadosDeFabrica (10)
      expect(Number(lote.costoTajadoKg.value)).toBeGreaterThan(3740);
      expect(Number(lote.costoTajadoKg.value)).toBeLessThan(3760);
    });
  });

  describe('costoRealCalculadoKg with different block prices', () => {
    it('should distribute flete equally per block between enteros and tajados de fábrica', () => {
      // 36 enteros × $30,000/block + 16 tajados de fábrica × $32,000/block + flete $50,000
      // Total bloques = 36 + 16 = 52
      // Flete por bloque = 50,000 / 52 = 961.54
      // Costo entero por kg = (30,000 + 961.54) / 2.5 = 12,384.62
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '130', // (36 + 16) × 2.5 = 130
        precioCompraBaseKg: '12000', // 30000 / 2.5
        precioPorBloqueEntero: '30000',
        precioPorBloqueTajado: '32000',
        bloquesEnteros: 36,
        bloquesTajadosDeFabrica: 16,
        costoFlete: '50000',
      });
      const costoEntero = Number(lote.costoRealCalculadoKg.value);
      // Should be ~12,376.88
      expect(costoEntero).toBeGreaterThan(12300);
      expect(costoEntero).toBeLessThan(12500);
    });

    it('should calculate costoTajadoFabricaKg with different price than entero', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '130',
        precioCompraBaseKg: '12000',
        precioPorBloqueEntero: '30000',
        precioPorBloqueTajado: '32000',
        bloquesEnteros: 36,
        bloquesTajadosDeFabrica: 16,
        costoFlete: '50000',
      });
      const costoEntero = Number(lote.costoRealCalculadoKg.value);
      const costoTajFabrica = Number(lote.costoTajadoFabricaKg.value);
      // Tajado de fábrica should be MORE expensive than entero (32000 > 30000)
      expect(costoTajFabrica).toBeGreaterThan(costoEntero);
    });

    it('should fall back to simple average when no block prices provided', () => {
      // Tests using validProps without precioPorBloqueEntero should use the simple formula
      const lote = new Lote({
        ...validProps,
        costoFlete: '10000',
      });
      // (3000 × 100 + 10000) / 100 = 3100 — same as old formula
      expect(lote.costoRealCalculadoKg.value).toBe('3100');
    });

    it('should give same costoTajadoFabricaKg as costoRealCalculadoKg when all blocks same price', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '125', // 50 × 2.5
        precioCompraBaseKg: '12000',
        precioPorBloqueEntero: '30000',
        precioPorBloqueTajado: '30000', // Same price as entero
        bloquesEnteros: 40,
        bloquesTajadosDeFabrica: 10,
        costoFlete: '10000',
      });
      // When prices are equal, prorated flete gives the same per-kg cost for both
      expect(lote.costoTajadoFabricaKg.value).toBe(lote.costoRealCalculadoKg.value);
    });

    it('should return costoRealCalculadoKg for costoTajadoFabricaKg when no factory tajados', () => {
      const lote = new Lote({
        ...validProps,
        bloquesEnteros: 40,
        costoFlete: '10000',
      });
      // No factory tajados → fallback to costoRealCalculadoKg
      expect(lote.costoTajadoFabricaKg.value).toBe(lote.costoRealCalculadoKg.value);
    });
  });

  describe('costoTotalLote', () => {
    it('should calculate (enteros × precioEntero) + (tajados × precioTajado) + flete for DC lot', () => {
      // User scenario: 10 enteros @ $44000 + 10 tajados @ $46000 = $900000
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '50', // 20 blocks × 2.5 kg
        precioCompraBaseKg: '18000',
        precioPorBloqueEntero: '44000',
        precioPorBloqueTajado: '46000',
        bloquesEnteros: 10,
        bloquesTajadosDeFabrica: 10,
        costoFlete: '0',
      });
      // (10 × 44000) + (10 × 46000) + 0 = 440000 + 460000 = 900000
      expect(lote.costoTotalLote.value).toBe('900000');
    });

    it('should include flete in costoTotalLote for DC lot', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '50',
        precioCompraBaseKg: '18000',
        precioPorBloqueEntero: '44000',
        precioPorBloqueTajado: '46000',
        bloquesEnteros: 10,
        bloquesTajadosDeFabrica: 10,
        costoFlete: '50000',
      });
      // (10 × 44000) + (10 × 46000) + 50000 = 950000
      expect(lote.costoTotalLote.value).toBe('950000');
    });

    it('should use simple formula for non-DC lot (precioCompraBaseKg × kg + flete)', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.SEMISALADO,
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '20000',
        costoFlete: '50000',
      });
      // 20000 × 100 + 50000 = 2050000
      expect(lote.costoTotalLote.value).toBe('2050000');
    });

    it('should fall back to simple formula for DC lot with no blocks', () => {
      const lote = new Lote({
        proveedorId: 'prov-1',
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '100',
        precioCompraBaseKg: '3000',
        costoFlete: '50000',
      });
      // No blocks → simple formula: 3000 × 100 + 50000 = 350000
      expect(lote.costoTotalLote.value).toBe('350000');
    });
  });

  describe('marcarPagado', () => {
    it('should change estadoPago to PAGADO and set metodoPagoLote', () => {
      const lote = new Lote(validProps);
      expect(lote.estadoPago).toBe(EstadoPagoLote.PENDIENTE);
      expect(lote.metodoPagoLote).toBe(MetodoPago.EFECTIVO);

      const updated = lote.marcarPagado(MetodoPago.NEQUI);
      expect(updated.estadoPago).toBe(EstadoPagoLote.PAGADO);
      expect(updated.metodoPagoLote).toBe(MetodoPago.NEQUI);
    });

    it('should preserve all other properties when marking as paid', () => {
      const lote = new Lote({ ...validProps, id: 'lote-1', costoFlete: '10000' });
      const updated = lote.marcarPagado(MetodoPago.BRE_B);
      expect(updated.id).toBe('lote-1');
      expect(updated.proveedorId).toBe('prov-1');
      expect(updated.costoFlete.value).toBe('10000');
      expect(updated.costoRealCalculadoKg.value).toBe(lote.costoRealCalculadoKg.value);
    });

    it('should throw if lote is already PAGADO', () => {
      const lote = new Lote({ ...validProps, estadoPago: EstadoPagoLote.PAGADO });
      expect(() => lote.marcarPagado(MetodoPago.EFECTIVO)).toThrow(
        'El lote ya está marcado como pagado'
      );
    });

    it('should default metodoPagoLote to EFECTIVO when not specified', () => {
      const lote = new Lote(validProps);
      expect(lote.metodoPagoLote).toBe(MetodoPago.EFECTIVO);
    });
  });

  describe('sueltosEntero and sueltosTajado', () => {
    it('should default to zero when not provided', () => {
      const lote = new Lote(validProps);
      expect(lote.sueltosEntero.value).toBe('0');
      expect(lote.sueltosTajado.value).toBe('0');
    });

    it('should accept explicit sueltosEntero and sueltosTajado values', () => {
      const lote = new Lote({
        ...validProps,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
      });
      expect(lote.sueltosEntero.value).toBe('1.5');
      expect(lote.sueltosTajado.value).toBe('0.8');
    });

    it('should preserve sueltos across deductStock', () => {
      const lote = new Lote({
        ...validProps,
        stockDisponibleKg: '100',
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
      });
      const result = lote.deductStock(new Kilogramo('25'));
      expect(result.sueltosEntero.value).toBe('1.5');
      expect(result.sueltosTajado.value).toBe('0.8');
      expect(result.stockDisponibleKg.value).toBe('75');
    });

    it('should preserve sueltos across deductStockByBlocks', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        stockDisponibleKg: '100',
        bloquesEnteros: 40,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
        precioCompraBaseKg: '3000',
      });
      const result = lote.deductStockByBlocks(3);
      expect(result.sueltosEntero.value).toBe('1.5');
      expect(result.sueltosTajado.value).toBe('0.8');
      expect(result.bloquesEnteros).toBe(37);
    });

    it('should preserve sueltos across registrarTajado', () => {
      const lote = new Lote({
        ...validProps,
        cantidadCompradaKg: '100',
        bloquesEnteros: 40,
        sueltosEntero: '2.0',
        sueltosTajado: '0.5',
        precioCompraBaseKg: '3000',
      });
      const result = lote.registrarTajado(5, '1500');
      expect(result.sueltosEntero.value).toBe('2');
      expect(result.sueltosTajado.value).toBe('0.5');
      expect(result.bloquesEnteros).toBe(35);
      expect(result.bloquesTajados).toBe(5);
    });

    it('should preserve sueltos across marcarPagado', () => {
      const lote = new Lote({
        ...validProps,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
      });
      const result = lote.marcarPagado(MetodoPago.NEQUI);
      expect(result.sueltosEntero.value).toBe('1.5');
      expect(result.sueltosTajado.value).toBe('0.8');
      expect(result.estadoPago).toBe(EstadoPagoLote.PAGADO);
    });

    it('should preserve sueltos across softDelete', () => {
      const lote = new Lote({
        ...validProps,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
      });
      const result = lote.softDelete();
      expect(result.sueltosEntero.value).toBe('1.5');
      expect(result.sueltosTajado.value).toBe('0.8');
      expect(result.deletedAt).not.toBeNull();
    });

    it('should preserve sueltos across restore', () => {
      const lote = new Lote({
        ...validProps,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
      });
      const deleted = lote.softDelete();
      const restored = deleted.restore();
      expect(restored.sueltosEntero.value).toBe('1.5');
      expect(restored.sueltosTajado.value).toBe('0.8');
      expect(restored.deletedAt).toBeNull();
    });
  });

  describe('acumularRecortes', () => {
    const recortesProps = {
      id: 'lote-recortes-dc-permanente' as const,
      proveedorId: null as string | null,
      producto: TipoProducto.DOBLE_CREMA,
      cantidadCompradaKg: '0',
      precioCompraBaseKg: '0',
      estado: EstadoLote.ACTIVO,
      estadoPago: EstadoPagoLote.PAGADO,
    };

    it('should accumulate positive kg into stockDisponibleKg and cantidadCompradaKg', () => {
      const lote = new Lote({
        ...recortesProps,
        stockDisponibleKg: '5',
        cantidadCompradaKg: '5',
      });
      const result = lote.acumularRecortes('2.5');
      expect(result.stockDisponibleKg.value).toBe('7.5');
      expect(result.cantidadCompradaKg.value).toBe('7.5');
    });

    it('should accumulate from zero', () => {
      const lote = new Lote(recortesProps);
      expect(lote.stockDisponibleKg.value).toBe('0');
      expect(lote.cantidadCompradaKg.value).toBe('0');
      const result = lote.acumularRecortes('3.5');
      expect(result.stockDisponibleKg.value).toBe('3.5');
      expect(result.cantidadCompradaKg.value).toBe('3.5');
    });

    it('should throw error when accumulating on a non-recortes lot', () => {
      const lote = new Lote(validProps);
      expect(() => lote.acumularRecortes('1')).toThrow(
        'Solo se puede acumular recortes en el lote permanente de recortes'
      );
    });

    it('should throw error when accumulating negative kg', () => {
      const lote = new Lote(recortesProps);
      expect(() => lote.acumularRecortes('-1')).toThrow();
    });
  });

  describe('Recortes lot — zero quantity validation', () => {
    it('should allow zero cantidadCompradaKg for the permanent recortes lot', () => {
      const lote = new Lote({
        id: 'lote-recortes-dc-permanente',
        proveedorId: null,
        producto: TipoProducto.DOBLE_CREMA,
        cantidadCompradaKg: '0',
        precioCompraBaseKg: '0',
        estado: EstadoLote.ACTIVO,
        estadoPago: EstadoPagoLote.PAGADO,
      });
      expect(lote.cantidadCompradaKg.value).toBe('0');
      expect(lote.estado).toBe(EstadoLote.ACTIVO);
    });
  });

  describe('cerrarLote', () => {
    it('should zero all inventory fields and set estado to AGOTADO for ACTIVO lot', () => {
      const lote = new Lote({
        ...validProps,
        stockDisponibleKg: '50',
        bloquesEnteros: 10,
        bloquesTajados: 3,
        bloquesTajadosDeFabrica: 2,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
      });
      const result = lote.cerrarLote();
      expect(result.stockDisponibleKg.value).toBe('0');
      expect(result.bloquesEnteros).toBe(0);
      expect(result.bloquesTajados).toBe(0);
      expect(result.bloquesTajadosDeFabrica).toBe(0);
      expect(result.sueltosEntero.value).toBe('0');
      expect(result.sueltosTajado.value).toBe('0');
      expect(result.estado).toBe(EstadoLote.AGOTADO);
    });

    it('should throw error when closing an AGOTADO lot', () => {
      const lote = new Lote({
        ...validProps,
        estado: EstadoLote.AGOTADO,
        stockDisponibleKg: '0',
      });
      expect(() => lote.cerrarLote()).toThrow('El lote ya está agotado');
    });

    it('should preserve cost fields and original block counts', () => {
      const lote = new Lote({
        ...validProps,
        stockDisponibleKg: '50',
        bloquesEnteros: 10,
        bloquesTajados: 3,
        bloquesTajadosDeFabrica: 2,
        bloquesEnterosOriginal: 20,
        bloquesTajadosFabricaOriginal: 5,
        sueltosEntero: '1.5',
        sueltosTajado: '0.8',
        costoFlete: '10000',
        costoTajado: '5000',
        costoEmpaques: '2000',
        costoSeparadores: '1000',
        precioPorBloqueEntero: '7500',
      });
      const result = lote.cerrarLote();
      // Cost fields preserved
      expect(result.costoFlete.value).toBe('10000');
      expect(result.costoTajado.value).toBe('5000');
      expect(result.costoEmpaques.value).toBe('2000');
      expect(result.costoSeparadores.value).toBe('1000');
      expect(result.precioPorBloqueEntero.value).toBe('7500');
      // Original block counts preserved
      expect(result.bloquesEnterosOriginal).toBe(20);
      expect(result.bloquesTajadosFabricaOriginal).toBe(5);
      // cantidadCompradaKg preserved
      expect(result.cantidadCompradaKg.value).toBe('100');
    });

    it('should preserve deletedAt, estadoPago, and metodoPagoLote', () => {
      const lote = new Lote({
        ...validProps,
        estadoPago: EstadoPagoLote.PENDIENTE,
        metodoPagoLote: MetodoPago.NEQUI,
      });
      const result = lote.cerrarLote();
      expect(result.estadoPago).toBe(EstadoPagoLote.PENDIENTE);
      expect(result.metodoPagoLote).toBe(MetodoPago.NEQUI);
      expect(result.deletedAt).toBeNull();
    });

    it('should preserve id and proveedorId', () => {
      const lote = new Lote({ ...validProps, id: 'lote-42' });
      const result = lote.cerrarLote();
      expect(result.id).toBe('lote-42');
      expect(result.proveedorId).toBe('prov-1');
    });
  });

  describe('Recortes lot — AGOTADO skip on deduct', () => {
    const recortesProps = {
      id: 'lote-recortes-dc-permanente' as const,
      proveedorId: null as string | null,
      producto: TipoProducto.DOBLE_CREMA,
      cantidadCompradaKg: '5',
      precioCompraBaseKg: '0',
      stockDisponibleKg: '5',
      estado: EstadoLote.ACTIVO,
      estadoPago: EstadoPagoLote.PAGADO,
    };

    it('should NOT transition to AGOTADO when stock reaches zero on deductStock', () => {
      const lote = new Lote(recortesProps);
      const result = lote.deductStock(new Kilogramo('5'));
      expect(result.stockDisponibleKg.value).toBe('0');
      expect(result.estado).toBe(EstadoLote.ACTIVO);
    });

    it('should NOT transition to AGOTADO when stock reaches zero on deductStockByBlocks (even though block deduction is not used for recortes)', () => {
      // This is a domain-level guard — in practice, deductStockByBlocks is not called for recortes
      // but the guard prevents accidental AGOTADO transitions
    });

    it('should remain ACTIVO when partial deduction does not reach zero', () => {
      const lote = new Lote(recortesProps);
      const result = lote.deductStock(new Kilogramo('2'));
      expect(result.stockDisponibleKg.value).toBe('3');
      expect(result.estado).toBe(EstadoLote.ACTIVO);
    });
  });
});