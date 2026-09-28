# Despliegue en producción

Arquitectura elegida:

```text
Frontend React/Vite  -> Vercel
Backend Express      -> Render Web Service
PostgreSQL           -> Supabase
Autenticación        -> Clerk
```

El backend debe ejecutarse en un servicio persistente porque crea un servidor
HTTP propio y un WebSocket para el tablero de producción. Vercel alojará los
archivos estáticos del frontend, no el servidor del backend.

## 1. Requisitos previos

- El repositorio está disponible en GitHub, GitLab o Bitbucket.
- Existe un dominio propio, por ejemplo `example.com`.
- Se dispone de un proyecto de producción en Supabase.
- Se dispone de una instancia de producción en Clerk.
- Las migraciones de Prisma necesarias están versionadas en Git.

### Bloqueo actual: migraciones Prisma

El repositorio ignora actualmente `packages/backend/prisma/migrations/` en
`.gitignore`. En el estado revisado solo está versionada la migración más
reciente; la migración inicial y la migración de materiales aparecen como
archivos ignorados.

No se debe desplegar contra una base de datos nueva hasta corregir esto. Las
migraciones deben formar parte del repositorio y ser aplicables mediante:

```bash
pnpm --filter @des-proyecto/backend exec prisma migrate deploy
```

Si la base de datos de Supabase ya contiene tablas creadas manualmente o con
`prisma db push`, no se debe ejecutar `migrate deploy` a ciegas. Primero hay que
comparar el estado de la base de datos con las migraciones y decidir si se debe
hacer un baseline.

No usar `prisma migrate dev` ni `prisma db push` como paso automático de
producción.

## 2. Ajustes de código necesarios antes del despliegue

Estos ajustes todavía deben implementarse en el código antes de seguir las
secciones de despliegue.

### 2.1 URL pública de la API

Actualmente el frontend usa rutas relativas como `/api/v1/clients`. Se debe
centralizar la URL base en el cliente HTTP y agregar:

```env
VITE_API_URL=https://api.example.com
```

La variable debe contener solamente el origen, sin `/api/v1` al final. El
cliente debe conservar las rutas actuales, por ejemplo:

```text
VITE_API_URL + /api/v1/health
```

No colocar `CLERK_SECRET_KEY`, `DATABASE_URL` ni `DIRECT_URL` en variables
`VITE_*`, porque terminarían incluidos en el bundle público.

### 2.2 URL del WebSocket

En producción, el WebSocket no debe usar el host de Vercel. Debe conectarse al
backend de Render:

```env
VITE_WS_URL=wss://api.example.com
```

El código del tablero de producción debe utilizar esta variable al crear la
conexión. Render acepta WebSockets entrantes. Las conexiones pueden cerrarse
durante un redeploy o mantenimiento; el frontend ya tiene lógica de reconexión
y debe conservarse.

### 2.3 Host del servidor Render

El servidor debe escuchar en todas las interfaces de red, no únicamente en
`localhost`:

```ts
server.listen(env.PORT, "0.0.0.0", () => {
  // ...
});
```

Render proporciona `PORT` automáticamente. No es necesario fijar un número de
puerto manualmente.

### 2.4 URL pública mostrada por Scalar

El documento OpenAPI generado actualmente anuncia
`http://localhost:${env.PORT}` como servidor. Debe cambiarse para usar la URL
pública del backend, por ejemplo mediante:

```env
PUBLIC_API_URL=https://api.example.com
```

Así, Scalar en `https://api.example.com/docs` no intentará ejecutar peticiones
contra `localhost`.

### 2.5 SPA routing de Vercel

Como el frontend usa `BrowserRouter`, una recarga directa en `/clients` debe
devolver `index.html` en lugar de un 404.

Agregar una configuración de rewrite para el frontend:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Si el archivo se crea dentro de `packages/frontend`, esa carpeta debe ser el
`Root Directory` del proyecto Vercel.

## 3. Configurar Supabase

1. Crear o seleccionar el proyecto de producción en Supabase.
2. Abrir **Connect** y obtener las cadenas de conexión.
3. Para este backend persistente, preferir una conexión directa o el pooler en
   modo **Session**, normalmente en el puerto `5432`.
4. Reservar una conexión directa o Session para las migraciones.
5. No usar el pooler en modo Transaction (`6543`) salvo que se haya validado
   específicamente con esta configuración de Prisma.

Variables que necesitará el backend:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

`DATABASE_URL` es usada por la aplicación en tiempo de ejecución.
`DIRECT_URL` es usada por `prisma.config.ts` para las migraciones.

Las contraseñas con caracteres especiales deben estar codificadas dentro de la
URL. No subir estas variables al repositorio.

### Aplicar el esquema

Después de corregir y versionar las migraciones:

```bash
pnpm install --frozen-lockfile
pnpm --filter @des-proyecto/backend exec prisma validate
pnpm --filter @des-proyecto/backend exec prisma migrate deploy
```

El último comando debe ejecutarse con `DIRECT_URL` apuntando a producción. Se
puede ejecutar desde una terminal segura o desde el Shell de Render.

## 4. Configurar Clerk

1. Crear o activar una instancia **Production** en Clerk.
2. Asociar el dominio de la aplicación, por ejemplo `app.example.com`.
3. Configurar los métodos de autenticación usados por la aplicación, incluido
   Google si se habilita ese botón.
4. Configurar las URLs permitidas y los redirects.
5. Restringir los orígenes autorizados al dominio real del frontend.
6. Copiar las claves de producción desde **API Keys**.

Variables de producción:

```env
# Vercel
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Render, nunca Vercel
CLERK_SECRET_KEY=sk_live_...
```

La clave publicable puede estar en el bundle del frontend. La clave secreta
nunca debe exponerse al navegador.

Para pruebas iniciales con `*.vercel.app` se puede usar la instancia de
desarrollo de Clerk. La producción debe configurarse con dominio propio y
claves `pk_live_`/`sk_live_`.

## 5. Crear el Web Service en Render

Crear un servicio de tipo **Web Service** conectado al repositorio.

### Configuración

| Campo | Valor |
|---|---|
| Branch | `main` |
| Root Directory | vacío, raíz del repositorio |
| Language | Node |
| Build Command | `pnpm install --frozen-lockfile && pnpm --filter @des-proyecto/backend build` |
| Start Command | `pnpm --filter @des-proyecto/backend start` |
| Health Check Path | `/api/v1/health` |

Se recomienda dejar el `Root Directory` vacío porque el lockfile y la
configuración de pnpm están en la raíz del monorepo. El filtro de pnpm hace que
solo se compile el backend.

### Variables de entorno en Render

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
CLERK_SECRET_KEY=sk_live_...
CORS_ORIGIN=https://app.example.com
PUBLIC_API_URL=https://api.example.com
```

No es necesario agregar `PORT`; Render lo proporciona. No usar `*` como
`CORS_ORIGIN` en producción.

### Primera publicación

1. Guardar las variables de entorno.
2. Ejecutar el primer deploy.
3. Revisar los logs de build y arranque.
4. Confirmar que el servicio queda escuchando en el puerto asignado.
5. Probar:

```bash
curl https://api.example.com/api/v1/health
```

La respuesta esperada es similar a:

```json
{"status":"ok"}
```

También verificar manualmente:

```text
https://api.example.com/docs
```

El servicio debe ser un **Web Service**, no un Static Site, porque necesita
ejecutar Node.js y aceptar conexiones WebSocket.

## 6. Crear el proyecto frontend en Vercel

1. Importar el mismo repositorio desde Git.
2. Seleccionar `packages/frontend` como **Root Directory**.
3. Confirmar que Vercel detecta pnpm mediante `pnpm-lock.yaml` y el campo
   `packageManager` de la raíz.
4. Usar estas opciones:

| Campo | Valor |
|---|---|
| Framework Preset | Vite |
| Build Command | `pnpm build` |
| Output Directory | `dist` |
| Install Command | automático; pnpm detectado desde el lockfile |

Si Vercel no encuentra el workspace desde el directorio del paquete, activar
la opción para incluir archivos fuera del Root Directory durante el build. Como
alternativa, usar la raíz del repositorio y configurar:

```text
Build Command: pnpm --filter @des-proyecto/frontend build
Output Directory: packages/frontend/dist
```

### Variables de entorno en Vercel

Configurar al menos para **Production**:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
```

Después de modificar variables `VITE_*`, crear un nuevo deployment: Vite las
incorpora durante el build y no en tiempo de ejecución.

## 7. Dominios y DNS

Configuración recomendada:

```text
app.example.com  -> dominio personalizado del proyecto Vercel
api.example.com  -> dominio personalizado del Web Service de Render
```

1. Agregar `app.example.com` en Vercel y completar el registro DNS indicado.
2. Agregar `api.example.com` en Render y completar el registro DNS indicado.
3. Esperar la emisión de certificados TLS.
4. Actualizar en Clerk el dominio de producción y las URLs permitidas.
5. Confirmar que `CORS_ORIGIN` coincide exactamente con el origen del frontend,
   incluyendo `https://` y sin una barra final.

No mezclar claves de Clerk de desarrollo con URLs de producción.

## 8. Alternativa: proxy HTTP de Vercel

Si se quiere conservar en el navegador las rutas relativas `/api/v1/...`, se
puede configurar un rewrite externo para HTTP:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.example.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

En este caso, las peticiones HTTP pueden continuar usando `/api/v1/...`, pero
el WebSocket debe seguir configurándose explícitamente con
`wss://api.example.com`. El rewrite HTTP no sustituye la URL del WebSocket.

La opción recomendada para depurar con claridad es usar `VITE_API_URL` y
conectar directamente al dominio de Render.

## 9. Lista de verificación posterior

- [ ] `https://api.example.com/api/v1/health` responde `{"status":"ok"}`.
- [ ] `https://api.example.com/docs` carga Scalar.
- [ ] La URL OpenAPI de Scalar ya no apunta a `localhost`.
- [ ] La página inicial de Vercel carga correctamente.
- [ ] Recargar directamente `/clients`, `/orders` y `/production` no genera 404.
- [ ] El inicio de sesión de Clerk funciona con claves de producción.
- [ ] Una petición autenticada llega al backend y no responde 401.
- [ ] Un usuario `org:member` y uno `org:admin` conservan sus permisos.
- [ ] El tablero establece una conexión `wss://` con Render.
- [ ] Mover un trabajo invalida el tablero en otra pestaña autenticada.
- [ ] La reconexión del WebSocket funciona después de una desconexión.
- [ ] Clientes, pedidos, inventario, ventas y reportes funcionan en producción.
- [ ] Los reportes PDF se descargan correctamente.
- [ ] No hay secretos publicados en el bundle ni en Git.
- [ ] Las migraciones de producción quedaron registradas en `_prisma_migrations`.

## 10. Referencias

- [Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Monorepos en Vercel](https://vercel.com/docs/monorepos)
- [Turborepo en Vercel](https://vercel.com/docs/monorepos/turborepo)
- [Web Services de Render](https://render.com/docs/web-services)
- [WebSockets en Render](https://render.com/docs/websocket)
- [Monorepos en Render](https://render.com/docs/monorepo-support)
- [Prisma con Supabase](https://supabase.com/docs/guides/database/prisma)
- [Conexiones PostgreSQL en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Despliegue de Clerk a producción](https://clerk.com/docs/guides/development/deployment/production)
