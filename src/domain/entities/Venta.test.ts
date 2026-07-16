import { describe, it, expect } from 'vitest';
import { Venta } from './Venta';
import { VentaItem } from './VentaItem';
import { MetodoPago } from '../enums';

describe('Venta', () => {
  const validItemProps = {
    loteId: 'lote-1',
    ventaTipo: 'GRANEL' as const,
    cantidadKg: '10',
    precioVentaKg: '5000',
    costoAplicadoKg: '3000',
  };

  describe('constructor — financial calculation from items', () => {
    it('should calculate totals from a single item', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1' },
        [item]
      );
      // Ingreso = 10 * 5000 = 50000, costoAplicado = 10 * 3000 = 30000
      expect(venta.ingresoTotal.value).toBe('50000');
      expect(venta.costoAplicado.value).toBe('30000');
      expect(venta.gananciaBruta.value).toBe('20000');
      expect(venta.cantidadTotalKg.value).toBe('10');
    });

    it('should calculate totals from multiple items', () => {
      const item1 = new VentaItem({
        ...validItemProps,
        loteId: 'lote-1',
        cantidadKg: '10',
        precioVentaKg: '5000',
        costoAplicadoKg: '3000',
      });
      const item2 = new VentaItem({
        ...validItemProps,
        loteId: 'lote-2',
        cantidadKg: '5',
        precioVentaKg: '4000',
        costoAplicadoKg: '2500',
      });
      const venta = new Venta(
        { clienteId: 'cliente-1' },
        [item1, item2]
      );
      // item1: ingreso = 50000, costo = 30000
      // item2: ingreso = 20000, costo = 12500
      // total ingreso = 70000 + valorDomicilio(0) = 70000
      // total costo = 30000 + 12500 = 42500
      // ganancia = 70000 - 42500 = 27500
      expect(venta.ingresoTotal.value).toBe('70000');
      expect(venta.costoAplicado.value).toBe('42500');
      expect(venta.gananciaBruta.value).toBe('27500');
      expect(venta.cantidadTotalKg.value).toBe('15');
    });

    it('should add valorDomicilio to ingresoTotal', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', valorDomicilio: '5000', domiciliario: 'Juan' },
        [item]
      );
      // ingreso = 50000 + 5000 = 55000
      expect(venta.ingresoTotal.value).toBe('55000');
      expect(venta.valorDomicilio.value).toBe('5000');
      expect(venta.domiciliario).toBe('Juan');
    });

    it('should include item costoEmpaques in costoAplicado', () => {
      const item = new VentaItem({
        ...validItemProps,
        costoEmpaques: '2000',
      });
      const venta = new Venta(
        { clienteId: 'cliente-1' },
        [item]
      );
      // costo from items = 30000 + 2000(empaques) = 32000
      expect(venta.costoAplicado.value).toBe('32000');
    });

    it('should handle zero gananciaBruta when price equals cost', () => {
      const item = new VentaItem({
        ...validItemProps,
        cantidadKg: '5',
        precioVentaKg: '3000',
        costoAplicadoKg: '3000',
      });
      const venta = new Venta({ clienteId: 'cliente-1' }, [item]);
      expect(venta.ingresoTotal.value).toBe('15000');
      expect(venta.costoAplicado.value).toBe('15000');
      expect(venta.gananciaBruta.value).toBe('0');
    });

    it('should default domicilio fields to zero and empty string', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1' }, [item]);
      expect(venta.valorDomicilio.value).toBe('0');
      expect(venta.domiciliario).toBe('');
    });

    it('should default metodoPago to EFECTIVO', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1' }, [item]);
      expect(venta.metodoPago).toBe(MetodoPago.EFECTIVO);
    });

    it('should default abono to ingresoTotal for EFECTIVO', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1' }, [item]);
      expect(venta.abono.value).toBe(venta.ingresoTotal.value);
      expect(venta.saldo.value).toBe('0');
    });

    it('should default abono to ingresoTotal for NEQUI', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1', metodoPago: 'NEQUI' }, [item]);
      expect(venta.metodoPago).toBe(MetodoPago.NEQUI);
      expect(venta.abono.value).toBe(venta.ingresoTotal.value);
      expect(venta.saldo.value).toBe('0');
    });

    it('should default abono to 0 for CREDITO when no abono given', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1', metodoPago: 'CREDITO' }, [item]);
      expect(venta.metodoPago).toBe(MetodoPago.CREDITO);
      expect(venta.abono.value).toBe('0');
      expect(venta.saldo.value).toBe(venta.ingresoTotal.value);
    });

    it('should accept abono for CREDITO', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '20000', metodoPagoAbono: 'EFECTIVO' }, [item]);
      expect(venta.abono.value).toBe('20000');
      expect(venta.saldo.value).toBe('30000'); // 50000 - 20000
    });

    it('should accept explicit abono for non-CREDITO methods', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1', metodoPago: 'EFECTIVO', abono: '40000' }, [item]);
      expect(venta.abono.value).toBe('40000');
      expect(venta.saldo.value).toBe('10000');
    });

    it('should default observaciones to empty string', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1' }, [item]);
      expect(venta.observaciones).toBe('');
    });

    it('should accept observaciones', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1', observaciones: 'Cliente pide factura' }, [item]);
      expect(venta.observaciones).toBe('Cliente pide factura');
    });

    it('should compute saldo as ingresoTotal - abono', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '15000', metodoPagoAbono: 'NEQUI' }, [item]);
      expect(venta.ingresoTotal.value).toBe('50000');
      expect(venta.abono.value).toBe('15000');
      expect(venta.saldo.value).toBe('35000');
    });
  });

  describe('constructor — metodoPagoAbono', () => {
    it('should require metodoPagoAbono when CREDITO with abono > 0', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '20000', metodoPagoAbono: 'EFECTIVO' },
        [item]
      );
      expect(venta.metodoPagoAbono).toBe(MetodoPago.EFECTIVO);
    });

    it('should accept NEQUI as metodoPagoAbono', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '20000', metodoPagoAbono: 'NEQUI' },
        [item]
      );
      expect(venta.metodoPagoAbono).toBe(MetodoPago.NEQUI);
    });

    it('should accept BRE_B as metodoPagoAbono', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '20000', metodoPagoAbono: 'BRE_B' },
        [item]
      );
      expect(venta.metodoPagoAbono).toBe(MetodoPago.BRE_B);
    });

    it('should throw if CREDITO with abono > 0 and no metodoPagoAbono', () => {
      const item = new VentaItem(validItemProps);
      expect(() => new Venta(
        { clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '20000' },
        [item]
      )).toThrow('metodoPagoAbono is required when metodoPago is CREDITO and abono > 0');
    });

    it('should throw if metodoPagoAbono is CREDITO', () => {
      const item = new VentaItem(validItemProps);
      expect(() => new Venta(
        { clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '20000', metodoPagoAbono: 'CREDITO' },
        [item]
      )).toThrow(/metodoPagoAbono must be one of/);
    });

    it('should set metodoPagoAbono to null for CREDITO with abono = 0', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', metodoPago: 'CREDITO', abono: '0' },
        [item]
      );
      expect(venta.metodoPagoAbono).toBeNull();
    });

    it('should set metodoPagoAbono to null for CREDITO with no abono (defaults to 0)', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', metodoPago: 'CREDITO' },
        [item]
      );
      expect(venta.abono.value).toBe('0');
      expect(venta.metodoPagoAbono).toBeNull();
    });

    it('should set metodoPagoAbono to null for non-CREDITO methods', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', metodoPago: 'EFECTIVO' },
        [item]
      );
      expect(venta.metodoPagoAbono).toBeNull();
    });

    it('should ignore metodoPagoAbono for non-CREDITO methods even if provided', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { clienteId: 'cliente-1', metodoPago: 'EFECTIVO', metodoPagoAbono: 'NEQUI' },
        [item]
      );
      expect(venta.metodoPagoAbono).toBeNull();
    });

    it('should reconstruct metodoPagoAbono from DB props for CREDITO with abono', () => {
      const venta = new Venta({
        id: 'v-1',
        clienteId: 'cliente-1',
        cantidadTotalKg: '10',
        ingresoTotal: '50000',
        costoAplicado: '30000',
        gananciaBruta: '20000',
        metodoPago: 'CREDITO',
        metodoPagoAbono: 'EFECTIVO',
        abono: '20000',
      });
      expect(venta.metodoPagoAbono).toBe(MetodoPago.EFECTIVO);
    });

    it('should reconstruct metodoPagoAbono as null for non-CREDITO DB props', () => {
      const venta = new Venta({
        id: 'v-1',
        clienteId: 'cliente-1',
        cantidadTotalKg: '10',
        ingresoTotal: '50000',
        costoAplicado: '30000',
        gananciaBruta: '20000',
        metodoPago: 'EFECTIVO',
        metodoPagoAbono: null,
        abono: '50000',
      });
      expect(venta.metodoPagoAbono).toBeNull();
    });
  });

  describe('constructor — reconstruction from DB props', () => {
    it('should reconstruct from computed props without items', () => {
      const venta = new Venta({
        id: 'v-1',
        clienteId: 'cliente-1',
        cantidadTotalKg: '10',
        ingresoTotal: '50000',
        costoAplicado: '30000',
        gananciaBruta: '20000',
        valorDomicilio: '0',
        domiciliario: '',
        metodoPago: 'CREDITO',
        metodoPagoAbono: 'EFECTIVO',
        abono: '20000',
        observaciones: 'Fiado',
      });
      expect(venta.id).toBe('v-1');
      expect(venta.cantidadTotalKg.value).toBe('10');
      expect(venta.ingresoTotal.value).toBe('50000');
      expect(venta.costoAplicado.value).toBe('30000');
      expect(venta.gananciaBruta.value).toBe('20000');
      expect(venta.metodoPago).toBe(MetodoPago.CREDITO);
      expect(venta.metodoPagoAbono).toBe(MetodoPago.EFECTIVO);
      expect(venta.abono.value).toBe('20000');
      expect(venta.saldo.value).toBe('30000'); // 50000 - 20000
      expect(venta.observaciones).toBe('Fiado');
    });
  });

  describe('constructor — validation', () => {
    it('should reject missing clienteId', () => {
      expect(() => new Venta({ clienteId: '' })).toThrow(
        'Venta clienteId is required'
      );
    });
  });

  describe('immutability', () => {
    it('should have readonly properties', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta(
        { id: 'v-1', clienteId: 'cliente-1' },
        [item]
      );
      expect(venta.clienteId).toBe('cliente-1');
      expect(venta.cantidadTotalKg.value).toBe('10');
      expect(venta.ingresoTotal.value).toBe('50000');
      expect(venta.costoAplicado.value).toBe('30000');
      expect(venta.gananciaBruta.value).toBe('20000');
    });

    it('should not have update or delete methods', () => {
      const item = new VentaItem(validItemProps);
      const venta = new Venta({ clienteId: 'cliente-1' }, [item]);
      expect((venta as unknown as Record<string, unknown>)['update']).toBeUndefined();
      expect((venta as unknown as Record<string, unknown>)['delete']).toBeUndefined();
    });
  });
});

describe('VentaItem', () => {
  const validProps = {
    loteId: 'lote-1',
    ventaTipo: 'GRANEL' as const,
    cantidadKg: '10',
    precioVentaKg: '5000',
    costoAplicadoKg: '3000',
  };

  describe('constructor — financial calculation', () => {
    it('should calculate ingreso = cantidadKg × precioVentaKg', () => {
      const item = new VentaItem(validProps);
      expect(item.ingreso.value).toBe('50000');
    });

    it('should calculate costoAplicado = cantidadKg × costoAplicadoKg', () => {
      const item = new VentaItem(validProps);
      expect(item.costoAplicado.value).toBe('30000');
    });

    it('should default bloquesEnterosVendidos to 0', () => {
      const item = new VentaItem(validProps);
      expect(item.bloquesEnterosVendidos).toBe(0);
    });

    it('should default bloquesTajadosVendidos to 0', () => {
      const item = new VentaItem(validProps);
      expect(item.bloquesTajadosVendidos).toBe(0);
    });

    it('should default bloquesReempacados to 0', () => {
      const item = new VentaItem(validProps);
      expect(item.bloquesReempacados).toBe(0);
    });

    it('should default costoEmpaques to 0', () => {
      const item = new VentaItem(validProps);
      expect(item.costoEmpaques.value).toBe('0');
    });

    it('should accept BLOQUES ventaTipo', () => {
      const item = new VentaItem({ ...validProps, ventaTipo: 'BLOQUES' });
      expect(item.ventaTipo).toBe('BLOQUES');
    });
  });

  describe('constructor — validation', () => {
    it('should reject missing loteId', () => {
      expect(() => new VentaItem({ ...validProps, loteId: '' })).toThrow(
        'VentaItem loteId is required'
      );
    });

    it('should reject zero cantidadKg', () => {
      expect(() => new VentaItem({ ...validProps, cantidadKg: '0' })).toThrow(
        'VentaItem cantidadKg cannot be zero'
      );
    });

    it('should reject zero precioVentaKg', () => {
      expect(() => new VentaItem({ ...validProps, precioVentaKg: '0' })).toThrow(
        'VentaItem precioVentaKg must be greater than zero'
      );
    });

    it('should reject negative precioVentaKg', () => {
      expect(() => new VentaItem({ ...validProps, precioVentaKg: '-100' })).toThrow(
        'VentaItem precioVentaKg must be greater than zero'
      );
    });
  });
});