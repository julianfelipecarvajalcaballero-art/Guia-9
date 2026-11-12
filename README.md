# Puesto de Chance API

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A518-%23339933?logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4.21.x-000000?logo=express)
![JWT](https://img.shields.io/badge/JWT-jsonwebtoken%209.x-black)
![Swagger UI](https://img.shields.io/badge/Swagger_UI-5.0.x-85EA2D?logo=swagger)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.0.3-6BA539)
![Jest](https://img.shields.io/badge/Jest-29.7.0-C21325?logo=jest)
![Tests](https://img.shields.io/badge/pruebas-20%2F20%20aprobadas-brightgreen)

API REST para la gestión de un **puesto de chance** (juego legalizado en Colombia).
Permite autenticar usuarios con **JWT**, administrar sorteos de tipo **CHANCE** y
**BALOTO**, vender tiquetes con apuestas validadas según las reglas del negocio,
consultarlos, anularlos y pagar los premios ganados, además de generar el **resumen y
cierre diario de caja** de cada vendedor.

Este trabajo corresponde al taller **Documentación Técnica y Trazabilidad de
Requisitos** (ADSO — SENA, clase 9) sobre el repositorio
[`crgonzalez3212/documentacionApi`](https://github.com/crgonzalez3212/documentacionApi):
se añade documentación (README, JSDoc, OpenAPI/Swagger UI, matriz de trazabilidad) sin
refactorizar la aplicación original.

- **Documentación interactiva (Swagger UI):** <http://localhost:3000/api-docs>
- **Especificación OpenAPI en JSON:** <http://localhost:3000/api-docs.json>
- **Matriz de trazabilidad:** [`docs/matriz-trazabilidad.md`](docs/matriz-trazabilidad.md)

---

## Tecnologías y versiones

Las versiones se toman de `package.json` (rangos declarados) y del `package-lock.json`
(versiones exactas instaladas y verificadas en este entorno).

| Tecnología | Uso en el proyecto | Versión declarada (`package.json`) | Instalada (`package-lock.json`) |
|---|---|---|---|
| Node.js (CommonJS) | Entorno de ejecución | — (no declara `engines`) | probado con v24.20.0 |
| [express](https://www.npmjs.com/package/express) | Framework HTTP y enrutamiento | `^4.21.1` | 4.22.3 |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | Firma y verificación de tokens JWT | `^9.0.2` | 9.0.3 |
| [bcryptjs](https://www.npmjs.com/package/bcryptjs) | Hash y comparación de contraseñas | `^2.4.3` | 2.4.3 |
| [dotenv](https://www.npmjs.com/package/dotenv) | Carga de variables de entorno desde `.env` | `^16.4.5` | 16.6.1 |
| [cors](https://www.npmjs.com/package/cors) | Habilitar CORS en todas las respuestas | `^2.8.5` | 2.8.6 |
| [morgan](https://www.npmjs.com/package/morgan) | Registro de peticiones HTTP en desarrollo | `^1.10.0` | 1.12.1 |
| [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express) | Servir la documentación interactiva (añadido en el taller) | `^5.0.1` | 5.0.1 |
| [js-yaml](https://www.npmjs.com/package/js-yaml) | Parsear la especificación `openapi.yaml` (añadido en el taller) | `^5.5.0` | 5.5.0 |
| [jest](https://www.npmjs.com/package/jest) | Framework de pruebas | `^29.7.0` | 29.7.0 |
| [supertest](https://www.npmjs.com/package/supertest) | Pruebas HTTP sin levantar puerto | `^7.0.0` | 7.3.2 |
| [nodemon](https://www.npmjs.com/package/nodemon) | Reinicio automático en desarrollo | `^3.1.7` | 3.1.14 |

La especificación de la API usa **OpenAPI 3.0.3** (compatible con `swagger-ui-express` 5).

## Estructura general

```text
documentacionApi/
├── docs/
│   └── matriz-trazabilidad.md     # Matriz de trazabilidad de requisitos (taller)
├── src/
│   ├── app.js                     # Aplicación Express: middlewares, /health, /api-docs
│   ├── server.js                  # Punto de entrada: escucha en el puerto configurado
│   ├── config/index.js            # Lee las variables de entorno con dotenv y sus defectos
│   ├── routes/index.js            # Rutas de /api/v1 y protección con roles
│   ├── controllers/               # Controladores (auth, sorteos, tiquetes, caja)
│   ├── services/                  # Reglas de negocio (auth, sorteos, tiquetes, caja,
│   │                              #   chance y baloto)
│   ├── middlewares/               # autenticar/permitir (JWT y roles), errorHandler
│   ├── data/store.js              # Base de datos en memoria con semillero de datos
│   ├── utils/                     # AppError y utilidades de fechas
│   └── docs/                      # openapi.yaml + cargador (documentación de la API)
├── tests/                         # 20 pruebas con Jest + Supertest (5 suites)
├── .env.example                   # Ejemplo de variables de entorno
├── .gitignore
├── package.json
└── package-lock.json
```

## Prerrequisitos

- **Node.js 18 o superior** (probado con Node v24.20.0 y npm 11.19.0 en Windows).
- **Git** para clonar el repositorio.
- Un cliente HTTP para las pruebas manuales: `curl`, PowerShell (`Invoke-RestMethod`),
  Postman o la propia interfaz de Swagger UI.

## Instalación local paso a paso

Desde una copia limpia (o un clon nuevo), siga estos pasos en el directorio del proyecto.

1. **Clonar el repositorio** (omitir si ya se tiene una copia local):

   ```bash
   git clone https://github.com/crgonzalez3212/documentacionApi.git
   cd documentacionApi
   ```

2. **Instalar las dependencias** (crea `node_modules/` a partir de `package-lock.json`):

   ```bash
   npm install
   ```

3. **Crear el archivo de configuración local** a partir del ejemplo. Ninguna variable es
   obligatoria: si no se crea el archivo, la API arranca con los valores por defecto.

   ```powershell
   # Windows PowerShell
   Copy-Item .env.example .env
   ```

   ```bash
   # Linux / macOS
   cp .env.example .env
   ```

4. **(Recomendado en producción) Cambiar la clave de firma JWT** editando `JWT_SECRET`
   en el archivo `.env` recién creado. El valor de ejemplo no debe usarse fuera de un
   entorno local.

5. **Verificar la instalación ejecutando la suite de pruebas:**

   ```bash
   npm test
   ```

   Resultado esperado: `Tests: 20 passed, 20 total` (5 suites).

## Configuración

Las variables se leen en `src/config/index.js` con **dotenv** al arrancar la aplicación
(`require('dotenv').config()`), que carga el archivo `.env` de la raíz y luego cada
variable se consume a través de `process.env`. **Ninguna es obligatoria**: todas tienen
valor por defecto en el código; el archivo `.env` sirve para ajustarlas por entorno.

| Variable | Propósito | ¿Obligatoria? | Valor por defecto |
|---|---|---|---|
| `PORT` | Puerto HTTP del servidor. | No | `3000` |
| `JWT_SECRET` | Clave de firma/verificación de los tokens JWT. | No en desarrollo; **sí en producción** | `cambiar-este-secreto` (inseguro, solo desarrollo) |
| `JWT_EXPIRES_IN` | Vigencia del token de sesión (formato de jsonwebtoken). | No | `8h` |
| `ZONA_HORARIA` | Zona horaria para agrupar ventas y cierres por fecha. | No | `America/Bogota` |
| `MINUTOS_ANULACION` | Ventana de anulación de un tiquete tras la venta (solo VENDEDOR). | No | `10` |
| `MINUTOS_CIERRE_VENTAS` | Minutos antes del sorteo en que se cierran las ventas. | No | `15` |
| `APUESTA_MIN_CHANCE` | Valor mínimo de una apuesta de chance, en pesos. | No | `500` |
| `APUESTA_MAX_CHANCE` | Valor máximo de una apuesta de chance, en pesos. | No | `50000` |
| `VALOR_BALOTO` | Precio de cada jugada de Baloto, en pesos. | No | `5700` |
| `DIAS_CADUCIDAD_PREMIO` | Días desde el sorteo jugado en que caduca el premio. | No | `365` |
| `NODE_ENV` | Entorno de ejecución; la app solo lo usa para desactivar el log de morgan en `test`. | No | `undefined` (log activo) |

> **Seguridad:** el archivo `.env` real (con credenciales o secretos) **no se publica**:
> está excluido por `.gitignore`. Solo se versiona `.env.example` con valores de
> ejemplo. El semillero de datos incluye usuarios de prueba (`admin/admin123`,
> `vendedor1/vende123`, `vendedor2/vende456`) que **solo son válidos para desarrollo**.

## Arranque

```bash
# Desarrollo (reinicia al guardar cambios con nodemon)
npm run dev

# Producción / uso normal
npm start
```

El servidor queda escuchando en `http://localhost:<PORT>` (3000 por defecto) y muestra
`Puesto de chance API escuchando en http://localhost:3000`.

## Documentación interactiva (Swagger UI)

La especificación OpenAPI 3.0.3 vive en [`src/docs/openapi.yaml`](src/docs/openapi.yaml)
y se sirve con Swagger UI (paquete `swagger-ui-express`).

| Recurso | URL |
|---|---|
| **Swagger UI (documentación interactiva)** | <http://localhost:3000/api-docs> |
| Especificación en JSON crudo (para Postman o generadores de clientes) | <http://localhost:3000/api-docs.json> |

Para probar desde la interfaz: haga clic en **Authorize**, pegue el token devuelto por
`POST /api/v1/auth/login` (esquema `Bearer`) y ejecute cualquier operación protegida
directamente desde el navegador.

## Ejemplo de uso reproducible

Con el servidor arrancado (`npm start`), este flujo de extremo a extremo usa datos del
semillero: login → venta de chance → consulta del tiquete.

### Con curl

```bash
# 1) Login del vendedor (devuelve el token)
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"vendedor1","password":"vende123"}'

# 2) Venta de un tiquete de chance sobre el sorteo 1 (Lotería de Bogotá)
#    Reemplace <TOKEN> por el valor de "token" del paso anterior.
curl -s -X POST http://localhost:3000/api/v1/tickets/chance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"sorteoId":1,"cliente":"CC 1017234567","apuestas":[{"numero":"1234","modalidad":"DIRECTO","valor":2000}]}'

# 3) Consultar el resumen de caja del día
curl -s http://localhost:3000/api/v1/caja/resumen -H "Authorization: Bearer <TOKEN>"
```

### Con PowerShell

```powershell
# 1) Login del vendedor
$resp = Invoke-RestMethod -Uri http://localhost:3000/api/v1/auth/login `
  -Method Post -ContentType "application/json" `
  -Body '{"usuario":"vendedor1","password":"vende123"}'
$token = $resp.token

# 2) Venta de un tiquete de chance sobre el sorteo 1
$tiquete = Invoke-RestMethod -Uri http://localhost:3000/api/v1/tickets/chance `
  -Method Post -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $token" } `
  -Body '{"sorteoId":1,"cliente":"CC 1017234567","apuestas":[{"numero":"1234","modalidad":"DIRECTO","valor":2000}]}'
$tiquete | ConvertTo-Json -Depth 5

# 3) Resumen de caja del día
Invoke-RestMethod -Uri http://localhost:3000/api/v1/caja/resumen `
  -Headers @{ Authorization = "Bearer $token" } | ConvertTo-Json -Depth 3
```

**Resultado esperado** (paso 2): un JSON con `codigo` con formato `CH-XXXXXXXX`,
`tipo: "CHANCE"`, `total: 2000` y `estado: "ACTIVO"`. Con ese mismo flujo y el rol
`admin` se puede registrar el resultado del sorteo
(`POST /api/v1/sorteos/1/resultado` con `{"resultado":"1234"}`) y pagar el premio
(4 500 000 por la tabla de pagos) con `POST /api/v1/tickets/<codigo>/pagar`.

### Usuarios del semillero de datos (solo desarrollo)

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `vendedor1` | `vende123` | VENDEDOR |
| `vendedor2` | `vende456` | VENDEDOR |

> La base de datos vive en memoria (`src/data/store.js`): cada reinicio restaura los
> sorteos del semillero y borra tiquetes, pagos y cierres.

## Pruebas

```bash
npm test
```

Ejecuta Jest con `--runInBand` (las suites comparten la base de datos en memoria, por
lo que se corren en serie). **20 pruebas en 5 suites**: `auth`, `chance`, `baloto`,
`tickets` y `caja`. El detalle requisito ↔ prueba está en la
[matriz de trazabilidad](docs/matriz-trazabilidad.md).

## Resolución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Cannot find module ...` al arrancar | Dependencias sin instalar | Ejecutar `npm install` |
| Puerto ocupado al arrancar | Otro proceso usa el 3000 | Cambiar `PORT` en `.env` y reiniciar |
| `401 Token requerido` en rutas protegidas | Falta el encabezado `Authorization` | Autenticarse y enviar `Bearer <token>` |
| `403 No tiene permisos para esta acción` | El rol no cubre la operación | Usar `vendedor1` para ventas/caja o `admin` para sorteos |
| `409 Las ventas para este sorteo ya cerraron` | Faltan menos de 15 min para el sorteo | Crear un sorteo nuevo como `admin` o ajustar `MINUTOS_CIERRE_VENTAS` |

## Licencia

**El repositorio no incluye archivo de licencia** (`LICENSE` ausente en la rama `main`
al momento del taller). Sin una licencia declarada, por defecto se reservan todos los
derechos (All Rights Reserved) y el código solo puede usarse conforme a la política del
curso y del autor del repositorio. Se recomienda al equipo docente añadir una licencia
(por ejemplo, MIT) si se quiere permitir el uso del código por otras fichas.

## Referencias

Fuentes consultadas durante el taller, citadas en formato APA (7.ª edición).

- OpenAPI Initiative. (2020, 20 de febrero). *OpenAPI Specification version 3.0.3*. The
  Linux Foundation. <https://spec.openapis.org/oas/v3.0.3>
- JSDoc contributors. (s. f.). *Getting started with JSDoc 3*. Consultado el 12 de
  noviembre de 2026, en <https://jsdoc.app/about-getting-started>
- OpenJS Foundation. (s. f.). *Ruta* [Guía de Express, versión 4.x]. Consultado el 12
  de noviembre de 2026, en <https://expressjs.com/es/guide/routing.html>
- OpenJS Foundation. (2026). *Getting started — Jest*. Consultado el 12 de noviembre de
  2026, en <https://jestjs.io/docs/getting-started>
- Motte, S. (s. f.). *dotenv: Loads environment variables from .env for nodejs
  projects* [Repositorio de código]. GitHub. Consultado el 12 de noviembre de 2026, en
  <https://github.com/motdotla/dotenv>
- swagger-ui-express. (2024). *swagger-ui-express* [Paquete npm, versión 5.0.1].
  <https://www.npmjs.com/package/swagger-ui-express>
- Swagger API. (s. f.). *Swagger UI configuration* [Documentación de uso de Swagger
  UI]. GitHub. Consultado el 12 de noviembre de 2026, en
  <https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md>
