# Proyecto de cátedra - Desarrollo de Software Empresarial
Sistema ERP para un taller de costura para el proyecto de cátedra de la materia Desarrollo de Software Empresarial

## Estructura

- `packages/frontend`: aplicación React con Vite y TypeScript.
- `packages/backend`: API Node.js con Express y TypeScript.
- `biome.json`: configuración compartida de lint y formato.
- `turbo.json`: tareas y caché del monorepo.

## Requisitos

- Node.js 20 o superior.
- pnpm 10.16.1.

## Comandos

```bash
pnpm install
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm typecheck
```

La aplicación frontend estará disponible en `http://localhost:5173` y la API en
`http://localhost:3000`. El endpoint público `GET /api/v1/health` permite
verificar el estado del backend. La información del usuario está disponible en
`GET /api/v1/health/userInfo` y requiere autenticación.

## Integrantes
| Nombre | Carnet | 
| :---           | :---:           |           
| Méndez Parada, Luis Antonio   |  MP220885  | 
| Miranda Rodríguez, Leo Fernando      |  MR211604        |
| Nieto Portillo, Jennifer Alejandra     |  NP220636         |
| Valencia Rivera, Némesis Alejandra      |  VR211067         |
| Rivas Tobar, Nelson Steven      |  RT221663         |

