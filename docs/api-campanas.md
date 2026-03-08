# API Documentation - Modulo de Campanas (Frontend)

## Contexto
Este documento describe exactamente lo que el frontend envia y consume en el modulo de campanas (pantalla de organizador).

Pantalla principal:
- `src/modules/campaigns/screens/OrganizerCampaignsScreen.tsx`

Servicios API usados:
- `src/services/api/campaignsService.ts`
- `src/services/api/eventsService.ts` (dependencia para seleccionar evento)
- `src/services/api/httpClient.ts`

## Base URL
El frontend usa:
- `EXPO_PUBLIC_API_URL`

Base por defecto:
- `http://localhost:3000/api/v1`

Nota de red en Expo:
- Si la URL tiene `localhost` o `127.0.0.1`, el cliente HTTP intenta resolver automaticamente la IP host para que funcione en emulador/dispositivo.

## Headers enviados por frontend
En este modulo se envia:
- `Content-Type: application/json`

Header opcional soportado por cliente HTTP (no usado en este modulo actualmente):
- `Authorization: Bearer <token>`

---

## 1) Cargar campanas

### Endpoint
`GET /campaigns`

### Query params enviados por frontend
- `page` (number)
- `limit` (number)

### Uso actual
La pantalla llama:
- `getCampaigns()`

Eso envia por defecto:
- `page=1`
- `limit=50`

### Ejemplo request
```http
GET /api/v1/campaigns?page=1&limit=50
Content-Type: application/json
```

### Respuesta esperada por frontend
```json
{
  "data": [
    {
      "id": 10,
      "name": "Kits de ayuda",
      "description": "Recoleccion para familias afectadas",
      "campaignType": "mixed",
      "goalMoney": 5000000,
      "collectedMoney": 750000,
      "eventId": 3,
      "createdBy": 1
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

## 2) Crear campana

### Endpoint
`POST /campaigns`

### Body que envia actualmente el frontend
```json
{
  "name": "string",
  "description": "string",
  "campaignType": "money | physical_items | mixed",
  "goalMoney": 0,
  "eventId": 0,
  "createdBy": 1
}
```

### Mapeo real desde UI
- `name`: `campaignName.trim()`
- `description`: `campaignDescription.trim() || "Campana humanitaria"`
- `campaignType`: fijo en `"mixed"`
- `goalMoney`: numero parseado de `goalMoney` (input texto, se quita todo lo no numerico)
- `eventId`: `selectedEventId`
- `createdBy`: fijo en `1` (temporal hasta integrar auth real)

### Validaciones en frontend antes de enviar
- Debe existir `selectedEventId`
- `campaignName.trim().length >= 3`

### Ejemplo request
```http
POST /api/v1/campaigns
Content-Type: application/json
```

```json
{
  "name": "Kits de ayuda para inundaciones",
  "description": "Entrega de kits de primera necesidad",
  "campaignType": "mixed",
  "goalMoney": 3000000,
  "eventId": 3,
  "createdBy": 1
}
```

### Respuesta esperada por frontend
```json
{
  "id": 22,
  "name": "Kits de ayuda para inundaciones",
  "description": "Entrega de kits de primera necesidad",
  "campaignType": "mixed",
  "goalMoney": 3000000,
  "collectedMoney": 0,
  "eventId": 3,
  "createdBy": 1
}
```

---

## 3) Dependencia API para selector de eventos

El modulo de campanas necesita eventos existentes para asociar la campana.

### Endpoint
`GET /events`

### Llamada actual
- `getEvents()` con defaults del servicio:
  - `page=1`
  - `limit=50`

### Ejemplo request
```http
GET /api/v1/events?page=1&limit=50
Content-Type: application/json
```

Respuesta usada por frontend:
- `id`
- `name`
- `city`
- (tambien incluye `disasterType`, `description`, `date`, `createdBy`)

---

## 4) Modelo de datos usado por frontend (campanas)

```ts
export type CampaignType = 'money' | 'physical_items' | 'mixed';

export type Campaign = {
  id: number;
  name: string;
  description: string;
  campaignType: CampaignType;
  goalMoney: number;
  collectedMoney: number;
  eventId: number;
  createdBy: number;
};
```

Fuente:
- `src/services/api/campaignsService.ts`

---

## 5) Funcionalidades del modulo que aun NO pegan al backend

En la UI de campanas hay acciones que hoy son solo estado local (sin request HTTP):
- `Agregar fondos`
- `Agregar items`
- `Chat` de campana

Estas funciones actualizan estado en memoria y no llaman API por ahora.

---

## 6) Manejo de errores actual

- Si falla carga inicial (`events + campaigns`):
  - Muestra: `No fue posible cargar eventos y campanas. Verifica el backend.`
- Si falla creacion de campana:
  - Muestra: `No se pudo crear la campana. Revisa que el backend este disponible.`

El cliente HTTP lanza error con `response.text()` cuando `response.ok === false`.

---

## 7) Resumen rapido de endpoints usados por este modulo

- `GET /campaigns?page=1&limit=50`
- `POST /campaigns`
- `GET /events?page=1&limit=50` (para asociar evento)
