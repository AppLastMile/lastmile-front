# Integracion Backend - Campanas, Inventario y Subastas

## 1. Objetivo
Este documento define:
- Los endpoints que el frontend debe conectar para reemplazar el mock actual.
- Los contratos sugeridos (request/response).
- Las reglas de negocio de campanas, donaciones fisicas y subastas.
- La estrategia de concurrencia para garantizar compra unica en subastas.

Contexto actual frontend:
- Donaciones monetarias: ya hay llamada a `POST /donations/money`.
- Donaciones fisicas: hoy estan en store local (mock).
- Subastas: hoy estan en store local (mock) con bloqueo en memoria.

## 2. Modulos y flujo funcional
### 2.1 Campanas
- Organizador: crea y configura campanas.
- Donante: ve campanas activas, dona dinero, dona articulos fisicos, crea subastas y compra subastas.

### 2.2 Inventario fisico
- Donante registra articulos (ej: cama, colchon, cobijas).
- Inventario se acumula por campana.
- Organizador visualiza resumen de elementos donados por campana.

### 2.3 Subastas
- Donante (o usuario autorizado) publica una subasta dentro de una campana.
- Cualquier usuario puede intentar comprarla.
- Solo una compra puede concretarse (compra unica).

## 3. Endpoints recomendados
## 3.1 Donaciones monetarias
Endpoint existente sugerido:
- `POST /donations/money`

Request sugerido:
```json
{
  "campaignId": 10,
  "donorId": 3,
  "amount": 50000
}
```

Response sugerida:
```json
{
  "id": 120,
  "campaignId": 10,
  "donorId": 3,
  "amount": 50000,
  "createdAt": "2026-03-08T15:20:00.000Z"
}
```

## 3.2 Donaciones de articulos fisicos
### Crear donacion fisica
- `POST /donations/items`

Request sugerido:
```json
{
  "campaignId": 10,
  "donorId": 3,
  "itemType": "cobija",
  "quantity": 12,
  "notes": "Donacion para familias en albergue"
}
```

Response sugerida:
```json
{
  "id": 81,
  "campaignId": 10,
  "donorId": 3,
  "itemType": "cobija",
  "quantity": 12,
  "status": "pending",
  "createdAt": "2026-03-08T15:35:00.000Z"
}
```

### Resumen de inventario por campana
- `GET /campaigns/:campaignId/items-summary`

Response sugerida:
```json
{
  "campaignId": 10,
  "items": [
    { "itemType": "cama", "quantity": 2 },
    { "itemType": "colchon", "quantity": 5 },
    { "itemType": "cobija", "quantity": 20 }
  ],
  "updatedAt": "2026-03-08T16:00:00.000Z"
}
```

## 3.3 Subastas por campana
### Crear subasta
- `POST /campaigns/:campaignId/auctions`

Request sugerido:
```json
{
  "sellerId": 3,
  "itemName": "Nevera",
  "description": "Nevera en buen estado",
  "price": 350000,
  "currency": "COP"
}
```

Response sugerida:
```json
{
  "id": 44,
  "campaignId": 10,
  "sellerId": 3,
  "itemName": "Nevera",
  "description": "Nevera en buen estado",
  "price": 350000,
  "currency": "COP",
  "status": "active",
  "buyerId": null,
  "createdAt": "2026-03-08T16:05:00.000Z",
  "soldAt": null,
  "version": 1
}
```

### Listar subastas de campana
- `GET /campaigns/:campaignId/auctions?status=active|sold|all&page=1&limit=50`

Response sugerida:
```json
{
  "data": [
    {
      "id": 44,
      "campaignId": 10,
      "sellerId": 3,
      "itemName": "Nevera",
      "price": 350000,
      "currency": "COP",
      "status": "active",
      "buyerId": null,
      "createdAt": "2026-03-08T16:05:00.000Z",
      "soldAt": null,
      "version": 1
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50, "totalPages": 1 }
}
```

### Comprar subasta (compra unica)
- `POST /auctions/:auctionId/buy`

Request sugerido:
```json
{
  "buyerId": 12,
  "idempotencyKey": "d5ab5f2f-96f5-46d9-80d9-e9f0e4f5f9b5"
}
```

Response exitosa sugerida:
```json
{
  "id": 44,
  "campaignId": 10,
  "status": "sold",
  "buyerId": 12,
  "soldAt": "2026-03-08T16:10:00.000Z",
  "price": 350000,
  "currency": "COP"
}
```

Errores esperados:
- `404 Not Found` si la subasta no existe.
- `409 Conflict` si la subasta ya fue vendida.
- `422 Unprocessable Entity` si request invalida.

## 4. Concurrencia: como resolver compra unica
La compra unica debe resolverse en backend con transaccion en DB, no en frontend.

### 4.1 Regla principal
En `POST /auctions/:id/buy`:
1. Abrir transaccion.
2. Bloquear la fila de la subasta (`SELECT ... FOR UPDATE`) o usar update atomico condicionado.
3. Validar `status = active`.
4. Cambiar estado a `sold`, guardar `buyerId`, `soldAt`.
5. Registrar donacion monetaria asociada a la campana por el valor de la subasta.
6. Confirmar transaccion.

Si la subasta ya esta vendida, devolver `409 Conflict`.

### 4.2 Estrategia recomendada (PostgreSQL)
Opcion A (pesimista):
- `SELECT * FROM auction WHERE id = $1 FOR UPDATE`.
- Evita carrera al serializar compradores sobre la misma fila.

Opcion B (atomica por condicion):
- `UPDATE auction SET status='sold', buyer_id=$buyer, sold_at=NOW(), version=version+1 WHERE id=$id AND status='active' RETURNING *`.
- Si `RETURNING` viene vacio, estaba vendida o no existe.

### 4.3 Idempotencia
Usar `idempotencyKey` por intento de compra para tolerar reintentos de red:
- Tabla `idempotency_records` por endpoint/usuario.
- Si llega misma clave, devolver misma respuesta previa sin duplicar efectos.

### 4.4 Integridad de datos
Recomendaciones:
- Constraint de estado valido (`active`, `sold`, `cancelled`).
- Index por `campaign_id`, `status`, `created_at`.
- Registrar auditoria (`sellerId`, `buyerId`, timestamps).

## 5. Eventos en tiempo real (recomendado)
Para reflejar ventas inmediatamente en todos los clientes:
- Emitir evento `auction.created`.
- Emitir evento `auction.sold`.
- Emitir evento `campaign.inventory.updated`.

Transporte recomendado:
- WebSocket (Gateway NestJS) o SSE.

Fallback frontend:
- Polling corto (ej. cada 10-20s) hasta integrar realtime.

## 6. Mapeo frontend sugerido
Servicios frontend a crear/ajustar:
- `src/services/api/donationsService.ts`
  - `createMoneyDonation(...)` (ya existe)
  - `createItemDonation(...)`
- `src/services/api/auctionsService.ts`
  - `createAuction(...)`
  - `getCampaignAuctions(...)`
  - `buyAuction(...)`
- `src/services/api/campaignsService.ts`
  - `getCampaignItemsSummary(campaignId)`

Pantallas a conectar:
- `src/modules/campaigns/screens/DonorCampaignsScreen.tsx`
  - reemplazar store mock de inventario/subastas por API.
- `src/modules/campaigns/screens/OrganizerCampaignsScreen.tsx`
  - consumir resumen inventario y subastas por campana.

## 7. Criterios de aceptacion
- Una subasta no puede venderse dos veces.
- Dos compras concurrentes sobre misma subasta producen:
  - 1 exito
  - 1 respuesta `409 Conflict`
- Al venderse subasta, campana incrementa fondos correctamente una sola vez.
- Inventario fisico por campana refleja sumas correctas por tipo de articulo.

## 8. Pruebas recomendadas
### 8.1 Unitarias
- Validaciones DTO (price > 0, itemName requerido, buyerId requerido).
- Servicios de dominio para cambio de estado de subasta.

### 8.2 Integracion
- Test transaccional de compra simultanea (dos requests en paralelo).
- Verificar una sola fila afectada.

### 8.3 E2E
- Crear subasta -> listar -> comprar -> verificar estado vendido -> reintentar compra y esperar `409`.

## 9. Migracion desde mock actual
1. Mantener UI actual.
2. Reemplazar operaciones store por llamadas API.
3. Conservar mensajes de feedback actuales.
4. Agregar manejo de errores por codigo HTTP.
5. Integrar realtime o polling para sincronizacion multiusuario.

---
Ultima actualizacion: 2026-03-08
