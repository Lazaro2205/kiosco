# FitoShop

SaaS de gestión para comercios (kioscos y similares): **ventas con caja, stock multi-sucursal, compras y contabilidad**. Una sola base de datos para todos los clientes, aislados por organización.

## Modelo de negocio

SaaS multi-empresa con **plan gratuito y planes pagos**. Cada empresa tiene dueño(s), sucursales y empleados, y todos los datos viven en una sola base aislada por `orgId`. El proyecto es **un producto propio, sin fechas externas**: el hito a alcanzar es la **"v1 usable"** (un kiosco real opera una semana sin ayuda del equipo).


### Cómo funciona hoy

- El **propietario** (dueño) crea su empresa (organización), sus **sucursales** y sus **operarios**. Su login con **Clerk** todavía no está integrado: el server monta `devAuth`, que entra siempre como el dueño de la empresa demo.
- Cada **operario** loguea SIN Clerk (código de empresa + usuario + clave, JWT propio). Si tiene una sola sucursal asignada entra directo; si tiene varias, elige con cuál operar.
- El operario **abre la caja** de su sucursal y registra **ventas con baja de stock** (tickets internos con modelo AFIP-ready).
- El **stock** es por sucursal: catálogo de artículos con código, código de barras y precio de venta a nivel empresa; existencias y costo por sucursal.
- Los **precios de compra** entran por el módulo **compras**, que suma stock y recalcula el **costo promedio ponderado**, base de las estadísticas.

### Lo decidido (en desarrollo)

**Planes** (el plan es **por dueño**, no por empresa; el cobro de suscripciones llega después de la v1 y los precios se revisan antes de programarlo):

| Plan | Precio por mes | Qué incluye |
|---|---|---|
| Gratuito | $0 | Punto de venta, carga con lector de código de barras, caja básica (abrir, cerrar y ver el turno) y carga manual de stock hasta **25 productos**. Una empresa y una sucursal |
| Esencial | $19.999 (a revisar) | Todo lo del gratuito sin límite de productos, más stock automático y avisos de faltantes, caja con cierres e historial, **sucursales y operarios ilimitados**, reportes de ventas, costos y margen, y **varias empresas por dueño** |
| Plus o Pro (nombre a definir) | $29.999 (a revisar) | Todo lo de Esencial, más asistente con IA sobre los propios datos, sugerencias de reposición, detección de productos que se frenan y resumen del día |

La **v1 cubre lo del plan Esencial**; la IA y el cobro quedan para después. Sin prueba gratis en los planes pagos (el plan gratuito cumple esa función).

**Cambios al modelo del negocio:**

- **Multi-empresa:** una sola base con `orgId` en cada documento (se abandona una base por empresa). El `orgId` sale siempre del token, nunca del body ni de la URL. Para clientes que lo pidan, a futuro habrá un plan personalizado con cluster propio.
- **Dueños:** una empresa puede tener varios dueños (con acceso total), que se invitan por email. Un dueño con plan pago puede tener varias empresas y elige con cuál trabajar al entrar. Clerk queda **solo para el login del dueño**; dueños y roles viven en nuestra base.
- **Roles y permisos:** el dueño arma roles combinando un **catálogo fijo de permisos** (por ejemplo `pos.vender`, `ventas.anular`, `stock.ajustar`). Cada empresa arranca con los roles "Cajero" y "Encargado", editables. Reemplaza la lista `permissions` por operario.
- **Empleados:** cada empleado pertenece a **una sola sucursal** (hoy puede tener varias). El alta es por **código de invitación** (válido 48 h; la cuenta queda pendiente hasta que el dueño le asigna rol y sucursal) o creándolo el dueño con clave temporal. Siguen entrando sin Clerk.
- **Ventas:** anulación, devolución, descuentos (por ítem o total) y **pago mixto**. **No se vende sin stock**: el POS avisa y permite un *ingreso rápido* (queda con "costo pendiente"). El stock mínimo es solo un aviso.
- **Caja:** retiros e ingresos manuales en cualquier momento del turno y **pagos a proveedores en efectivo desde la caja**. Venta y carga con **lector de código de barras**.
- **Notas de faltantes por sector:** el empleado avisa qué falta en su sector y el dueño decide qué comprar (ya no generan asiento contable).
- **Lotes y vencimientos:** en las categorías con vencimiento se descuenta primero lo que vence antes, con alertas y baja por vencimiento. En la v1 el "sector" es solo una etiqueta.
- **Facturación ARCA:** entra en el alcance, pero **después de la v1**; antes hay que investigarla.
- **Zona horaria:** `America/Argentina/Cordoba`. Se sigue con JavaScript.

## Stack

| Capa | Tecnología |
|---|---|
| Base de datos | MongoDB Atlas (Mongoose) — multi-tenant por `orgId` |
| Backend | Node.js + Express 5 (JavaScript, CommonJS), rutas → controllers → services → models |
| Frontend | React 19 + Vite + Tailwind v4 + shadcn/ui + Zustand + React Router 7 |
| Auth propietario | Clerk (en integración: hoy el panel del dueño usa `devAuth`, ver [Puesta en marcha](#puesta-en-marcha)) |
| Auth operario | JWT propio (bcrypt + jsonwebtoken) |

## Estructura

```
├── server/
│   └── src/
│       ├── index.js / app.js     arranque y montaje de rutas Express
│       ├── config/               db (Atlas o memoria en dev), constantes
│       ├── middlewares/          devAuth / ownerAuth (dueño), operatorAuth (JWT),
│       │                         hybridAuth, checkAccess, errores
│       ├── routes/               una por recurso (auth, branches, users, articles,
│       │                         purchases, pos, stats, ...)
│       ├── controllers/          reciben el request y llaman al service
│       ├── services/             lógica de negocio (stock PPP, ventas, caja, ...)
│       ├── models/               Mongoose: Organization, Branch, User, Article, ...
│       └── scripts/              seed de datos demo
├── client/
│   └── src/
│       ├── api/index.js          axios: apiPos (JWT operario) + apiOwner (Clerk)
│       ├── routes/               router + guards
│       ├── store/                sesión de operario (Zustand)
│       ├── hooks/                acceso a la API por módulo
│       └── pages/                landing, auth, operario (POS) y admin (panel del dueño)
└── docs/                         documentación técnica y decisiones
```

## Puesta en marcha

### Requisitos

- **Git**
- **Node.js 20 o superior** (`node -v` para chequearlo) con **npm**. Usá npm, no pnpm: el repo es un workspace de npm y el lockfile es `package-lock.json`.
- Opcional: una cuenta de **MongoDB Atlas** (si no, se usa una base en memoria).

### 1. Clonar e instalar

```bash
git clone https://github.com/Lazaro2205/kiosco.git
cd kiosco
npm install        # instala server y client (workspaces), se corre una sola vez en la raíz
```

### 2. Crear los archivos de entorno

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

(En Windows PowerShell: `copy server\.env.example server\.env` y `copy client\.env.example client\.env`.)

Después editá `server/.env`. **Lo único obligatorio** es `JWT_SECRET`; generá uno propio con:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

y pegalo en `JWT_SECRET=`. Dejá `MONGODB_URI` **vacía** para arrancar con la base en memoria (ver abajo). Los archivos `.env` están en el `.gitignore`: **nunca los subas**; solo se versionan los `.env.example`.

### 3. Levantar server y client

Dos terminales, desde la raíz del repo:

```bash
npm run dev:server     # API en http://localhost:4000
npm run dev:client     # front en http://localhost:5174
```

Con `MONGODB_URI` vacía, el server levanta un **MongoDB en memoria** con datos demo. La **primera vez** descarga el binario de MongoDB 4.4 (hace falta internet y tarda un rato). Los datos se pierden al apagar el server.

### 4. Verificar que anda

1. `http://localhost:4000/api/health` debe responder `{"success":true,"db":true}`.
2. Abrí `http://localhost:5174/login` y entrá con los datos demo:

| Empresa | Usuario | Clave | Sucursales |
|---|---|---|---|
| `DEMO01` | `juan` | `1234` | Centro (entra directo) |
| `DEMO01` | `maria` | `1234` | Centro y Norte (elige con cuál operar) |

3. Abrí la caja y hacé una venta de prueba en `/pos`.
4. El panel del dueño está en `http://localhost:5174/admin`. Por ahora **no pide login de Clerk**: el server usa `devAuth`, que entra siempre como el dueño de la empresa demo (`DEMO01`). Por eso necesita que los datos demo estén cargados.

### Usar MongoDB Atlas en vez de la base en memoria

1. En [MongoDB Atlas](https://www.mongodb.com/atlas) crear un cluster (el gratuito M0 alcanza).
2. *Database Access*: crear un usuario con permisos de lectura y escritura.
3. *Network Access*: agregar tu IP (o `0.0.0.0/0` solo para pruebas).
4. *Connect → Drivers*: copiar la URI, reemplazar usuario y password, y agregar el nombre de la base antes del `?` (por ejemplo `/kiosko`). Pegarla en `server/.env` → `MONGODB_URI`.
5. Cargar los datos demo (empresa `DEMO01`) una vez:
   ```bash
   npm run seed
   ```
   Si la empresa ya existe, el seed avisa y no hace nada.
6. Reiniciar `npm run dev:server`: debe mostrar `Conectado a MongoDB (Atlas)`.

Atlas ya viene como replica set, que es lo que necesitan las transacciones (venta, compra y cierre de caja).

### Clerk (todavía no hace falta)

La integración de Clerk está en desarrollo, así que **podés dejar `CLERK_SECRET_KEY` y `VITE_CLERK_PUBLISHABLE_KEY` vacías**. Cuando se integre: la Secret Key (`sk_test_...`) va en `server/.env` → `CLERK_SECRET_KEY` y la Publishable Key (`pk_test_...`) en `client/.env` → `VITE_CLERK_PUBLISHABLE_KEY`, ambas desde el dashboard de [clerk.com](https://clerk.com) → tu app → *API Keys*.

### Variables de entorno

| Archivo | Variable | Obligatoria | Para qué sirve |
|---|---|---|---|
| `server/.env` | `PORT` | no (4000) | Puerto de la API |
| `server/.env` | `NODE_ENV` | no | `production` exige `MONGODB_URI` |
| `server/.env` | `CORS_ORIGIN` | no | Origen(es) permitidos del front, separados por coma. Vacío = cualquiera |
| `server/.env` | `MONGODB_URI` | solo en producción | URI de Atlas. Vacía en desarrollo = base en memoria con datos demo |
| `server/.env` | `JWT_SECRET` | **sí** | Firma los tokens de los operarios |
| `server/.env` | `CLERK_SECRET_KEY` | aún no | Verifica la sesión del dueño (Clerk) |
| `client/.env` | `VITE_API_URL` | no (`http://localhost:4000`) | URL de la API |
| `client/.env` | `VITE_CLERK_PUBLISHABLE_KEY` | aún no | Clave pública de Clerk |

Al cambiar un `.env`, reiniciar el proceso correspondiente.

### Scripts (desde la raíz)

| Comando | Qué hace |
|---|---|
| `npm run dev:server` | API en modo desarrollo (reinicia al cambiar código) |
| `npm run dev:client` | Front con Vite en el puerto 5174 |
| `npm run seed` | Carga los datos demo en la base de `MONGODB_URI` |
| `npm run build` | Build de producción del front |

### Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `secretOrPrivateKey must have a value` o el login de operario da error 500 | Falta `JWT_SECRET` en `server/.env` |
| El front muestra error de CORS | `CORS_ORIGIN` no coincide exacto con la URL del front (`http://localhost:5174`, sin `/` final) |
| `Port 5174 is already in use` | El client usa `strictPort`: cerrar lo que ocupa el puerto |
| `EADDRINUSE` en el server | Otro proceso usa el 4000: cambiar `PORT` (y `VITE_API_URL` con él) |
| No conecta a Atlas | Revisar usuario y password de la URI, y que tu IP esté en *Network Access* |
| Falla al arrancar la base en memoria | Probar con Atlas, o ver el mensaje del binario de MongoDB que no se pudo descargar o ejecutar |
| `/admin` no muestra datos | Faltan los datos demo: `npm run seed` (con Atlas) |

## API (resumen)

| Prefijo | Auth | Contenido |
|---|---|---|
| `POST /api/auth/operator/login` | pública | login operario (código empresa + usuario + clave, con selección de sucursal) |
| `/api/organizations` | dueño | `GET /me`, `POST /bootstrap` (onboarding) |
| `/api/branches` | dueño u operario con acceso (pasará a permisos por rol) | CRUD de sucursales |
| `/api/users` | dueño u operario con acceso | CRUD de operarios + asignación de sucursales + reset de clave |
| `/api/articles` | dueño u operario con acceso | CRUD de catálogo (+ stock por sucursal con `?branchId`) |
| `/api/purchases` | dueño u operario con acceso | registrar/listar compras (actualiza stock y costo promedio) |
| `/api/stats` | dueño u operario con acceso | `GET /summary` (balance + margen bruto), `GET /movements` (libro diario) |
| `/api/pos/*` | JWT operario | catálogo con stock, caja (abrir/cerrar), ventas |

Reglas de negocio clave:

| Regla | Hoy | Decidido |
|---|---|---|
| Caja | Una caja abierta por sucursal (índice único parcial) | Sin cambios |
| Precios | Los pone el servidor: el cliente solo manda artículo + cantidad | Sin cambios |
| Margen | Cada ítem vendido guarda `costAtSale` (costo promedio al momento): el margen es exacto aunque los costos cambien | Sin cambios |
| Cierre de caja | Esperado = apertura + ventas en efectivo; el sobrante/faltante va al libro diario | Esperado = apertura + ventas en efectivo + ingresos − retiros − pagos a proveedores |
| Transacciones | Venta, compra y cierre de caja: se aplica todo o nada | Sin cambios |
| Permisos | Lista `permissions` por operario | Roles armados por el dueño con un catálogo fijo de permisos |
| Venta | Un solo `paymentMethod`, sin anulación ni descuentos | Anulación, devolución, descuentos y pago mixto; no se vende sin stock |

## Estado y hoja de ruta

El trabajo está repartido en **37 tarjetas en cinco fases**, en el tablero de Trello [Sistema Kiosko](https://trello.com/b/ZXvEvnmn/tareas). Cada tarjeta indica qué tiene que pasar para darla por hecha. Las reuniones y decisiones completas están en el Notion del equipo (sección *Decisiones técnicas*).

| Fase | Objetivo |
|---|---|
| 0. Puesta a punto | Credenciales y cluster nuevos, `.env.example` y este README, limpieza del repo, que los cuatro levanten el proyecto en local |
| 1. Base segura | `orgId` en todos los modelos y services, tests de separación entre empresas, Clerk (dueño) en back y front, varios dueños |
| 2. Usuarios y roles | Roles y permisos, usuarios con una sola sucursal, invitaciones, sectores, investigación de ARCA |
| 3. Operación diaria | Movimientos de stock, ingreso rápido, anulación y devolución, descuentos y pago mixto, caja con retiros e ingresos, lector en POS y compras, notas de faltantes |
| 4. Cerrar la v1 | Lotes y vencimientos, límites del plan gratuito, deploy y **prueba piloto de una semana** en un kiosco real |

**Pendiente de definir:** dónde se hostea (deploy), el nombre del producto (en el código y docs aparecen FitoShop, Sistema Kiosko y Kiosco Byte) y cómo se separan dos negocios con el mismo CUIT (entra en la investigación de ARCA).

**Flujo de trabajo:** una rama por tarea y PR revisado por un compañero; por ahora el equipo **no mergea a `main`** hasta que todo ande. Quien mergea un PR actualiza la documentación y el `CHANGELOG`.

## Documentación

Ver [`docs/README.md`](docs/README.md): índice de la documentación técnica y de las decisiones del proyecto.