# Lote Management Specification

## Purpose

Manage cheese inventory batches (Lotes), including creation with cost calculation, stock tracking in Kilograms, and status transitions.

## Requirements

### Requirement: Lote Creation

The system SHALL create a Lote with provider, product type, quantity in Kg, and cost components (base price, freight, slicing, packaging). The system MUST calculate `Costo_Real_Por_Kg = (Precio_Base × Cantidad + Flete + Tajado + Empaques) / Cantidad` upon creation and persist it.

#### Scenario: Create Lote with all cost components

- GIVEN valid provider, product type, quantity > 0, and all cost components
- WHEN creating a Lote
- THEN the Lote is persisted with status ACTIVO and the calculated Costo_Real_Por_Kg

#### Scenario: Create Lote with zero optional costs

- GIVEN valid provider, product type, quantity > 0, and Flete=Tajado=Empaques=0
- WHEN creating a Lote
- THEN Costo_Real_Por_Kg equals Precio_Base

#### Scenario: Reject Lote with zero quantity

- GIVEN a creation request with quantity = 0
- WHEN creating a Lote
- THEN the system MUST reject the request with a validation error

### Requirement: Stock Tracking

The system MUST track remaining stock (Cantidad_Disponible) in Kg per Lote. Stock SHALL decrease atomically when a Venta is registered against the Lote.

#### Scenario: Stock decreases on sale

- GIVEN a Lote with 100 Kg available
- WHEN a Venta deducts 25 Kg from this Lote
- THEN Cantidad_Disponible becomes 75 Kg

#### Scenario: Reject sale exceeding stock

- GIVEN a Lote with 10 Kg available
- WHEN a Venta attempts to deduct 15 Kg
- THEN the system MUST reject the Venta with a stock validation error

### Requirement: Status Transition

The system SHALL transition Lote status from ACTIVO to AGOTADO when stock reaches zero. The system MUST NOT allow manual status override.

#### Scenario: Automatic status transition

- GIVEN a Lote with 5 Kg available and status ACTIVO
- WHEN a Venta deducts the remaining 5 Kg
- THEN the Lote status becomes AGOTADO

#### Scenario: AGOTADO Lote rejects further sales

- GIVEN a Lote with status AGOTADO
- WHEN a Venta targets this Lote
- THEN the system MUST reject the Venta with a status error

### Requirement: Lote Listing

The system SHALL provide filtered Lote listings by status (ACTIVO, AGOTADO) and by provider.

#### Scenario: List active Lotes

- GIVEN multiple Lotes exist with mixed statuses
- WHEN requesting Lotes filtered by status ACTIVO
- THEN only ACTIVO Lotes are returned