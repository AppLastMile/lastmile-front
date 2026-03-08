# API Documentation - Inicio, Mapa y Creacion de Eventos (Frontend)

## Contexto
Este documento describe exactamente lo que el frontend envia y consume en la parte de `Inicio` donde estan:
- Home (resumen de eventos)
- Mapa (marcadores de eventos)
- Crear evento desde organizador

## Base URL
El frontend usa la variable de entorno:

`EXPO_PUBLIC_API_URL`

Valor por defecto en el cliente HTTP:

`http://localhost:3000/api/v1`

Archivo referencia:
- `src/services/api/httpClient.ts`

## Headers enviados por el frontend
En este modulo se envian:
- `Content-Type: application/json`

Header opcional soportado por el cliente HTTP (no usado actualmente en este modulo):
- `Authorization: Bearer <token>`

---

## 1) Listar eventos

### Endpoint
`GET /events`

### Query params soportados por frontend
- `page` (number)
- `limit` (number)
- `city` (string, opcional)
- `disasterType` (string, opcional)
- `search` (string, opcional)

### Uso actual por pantalla
- Home: `getEvents({ page: 1, limit: 10 })`
- Mapa: `getEvents({ page: 1, limit: 100 })`
- Crear Evento (para marcadores existentes): `getEvents({ page: 1, limit: 100 })`

### Ejemplo request
```http
GET /api/v1/events?page=1&limit=100
Content-Type: application/json
```

### Respuesta esperada por frontend
```json
{
  "data": [
    {
      "id": 1,
      "name": "Inundacion en Suba",
      "disasterType": "inundacion",
      "city": "Bogota",
      "description": "Desbordamiento del rio",
      "date": "2026-03-08T14:22:11.000Z",
      "createdBy": 1
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 100,
    "totalPages": 1
  }
}
```

---

## 2) Crear evento

### Endpoint
`POST /events`

### Body que envia actualmente el frontend
```json
{
  "name": "string",
  "disasterType": "string",
  "city": "string",
  "description": "string",
  "date": "ISO-8601 string",
  "createdBy": 1
}
```

### Mapeo real desde UI
- `name`: `eventName.trim()`
- `disasterType`: `disasterType.trim()`
- `city`: `selectedCity.name`
- `description`: `eventDescription.trim() || "Evento registrado desde aplicacion movil"`
- `date`: `new Date().toISOString()`
- `createdBy`: `1` (temporal mientras auth backend no esta conectado)

### Ejemplo request
```http
POST /api/v1/events
Content-Type: application/json
```

```json
{
  "name": "Inundacion por lluvias intensas",
  "disasterType": "inundacion",
  "city": "Bogota",
  "description": "Desbordamiento del rio en zona norte",
  "date": "2026-03-08T19:10:32.512Z",
  "createdBy": 1
}
```

### Respuesta esperada por frontend
```json
{
  "id": 25,
  "name": "Inundacion por lluvias intensas",
  "disasterType": "inundacion",
  "city": "Bogota",
  "description": "Desbordamiento del rio en zona norte",
  "date": "2026-03-08T19:10:32.512Z",
  "createdBy": 1
}
```

---

## 3) Modelo de datos usado en frontend

```ts
export type EventSummary = {
  id: number;
  name: string;
  disasterType: string;
  city: string;
  description: string;
  date: string;
  createdBy: number;
};
```

Archivo referencia:
- `src/services/api/eventsService.ts`

---

## 4) Comportamiento por modulo

### Home (`src/modules/missions/screens/HomeScreen.tsx`)
- Hace `GET /events?page=1&limit=10`
- Muestra tarjetas con `name`, `city`, `disasterType`

### Mapa (`src/modules/map/screens/MapScreen.tsx`)
- Hace `GET /events?page=1&limit=100`
- Convierte `city` a coordenadas con catalogo local (`findColombianCityByName`)
- Dibuja marcadores con `title=name` y `description=description`

### Crear Evento (`src/modules/missions/screens/CreateMissionScreen.tsx`)
- Carga eventos existentes al abrir (GET)
- Crea evento con formulario (POST)
- Al exito agrega el evento a estado local y actualiza mapa

---

## 5) Consideraciones importantes

- Si backend devuelve una ciudad que no existe en el catalogo local de ciudades, ese evento no se pinta en el mapa.
- `createdBy` esta fijo en `1` hasta integrar autenticacion real.
- En errores HTTP, el cliente lanza excepcion con el texto retornado por backend (`response.text()`).

---

## 6) Archivos fuente

- `src/services/api/httpClient.ts`
- `src/services/api/eventsService.ts`
- `src/modules/missions/screens/HomeScreen.tsx`
- `src/modules/map/screens/MapScreen.tsx`
- `src/modules/missions/screens/CreateMissionScreen.tsx`
