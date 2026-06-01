# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Arcade Vault** — plataforma online de juegos arcade retro donde los usuarios compiten por puntuaciones.

Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + pnpm.
Backend: **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`) para juegos y leaderboards.
Email: **Resend** para el formulario de contacto.

No hay test runner configurado todavía. Scripts: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm format` (Prettier).

## Skills

- Usa **siempre `/frontend-design`** para construir interfaces de usuario.
- **Spec Driven Design**: `/spec` para escribir specs, `/spec-impl` para implementarlas, `/add-game` para añadir un juego nuevo. (instaladas en `.claude/skills/` y `.agents/skills/`, fijadas en `skills-lock.json` desde `Klerith/fernando-skills`).

## Agentes (`.claude/agents/`)

- **`game-planner`** — planifica, piensa y decide qué juego encaja con la plataforma (analiza huecos del catálogo, evita duplicados). Registra sus sugerencias en `references/game-suggestions-todo.md` y mantiene bitácora de peticiones previas en `.claude/agents/game-planner-memory.md`. No escribe specs ni código; al decidir, sugiere lanzar `/add-game <id>`.
- **`game-jam`** — dado un **tema**, decide autónomamente un juego arcade que encaje y escribe 1 spec completo en `specs/game-jam/<game-id>/<game-id>.md`. Prioriza `references/started-games/`; si ninguno encaja, diseña el juego desde cero. No escribe código; el spec se implementa con `/spec-impl`.
- **`skin-designer`** — dado el id de un juego, garantiza ≥3 skins seleccionables (`classic`=default, `neon`, `retro`) con colores + fondo + efectos; refactoriza el componente canvas y añade un selector con persistencia (`localStorage:av_skin_<id>`) en el reproductor. Implementa código. Mantiene bitácora en `.claude/agents/skin-designer-memory.md`.

## Variables de entorno (`.env.local`, ver `.env.example`)

- `RESEND_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_DB_PASSWORD`

MCP de Supabase configurado en `.mcp.json` (proyecto `gzazmxcmbmjfetlohnyv`).

## Arquitectura

### `app/` — Next.js App Router (implementación principal)

- `layout.tsx` — layout raíz (fuentes Geist), envuelve la app con `UserProvider`
- `page.tsx` — home / landing
- `globals.css` — estilos globales Tailwind v4 + design tokens
- `data.ts` — tipos compartidos: `Category`, `AVUser`, constante `CATS`
- `context.tsx` — `UserProvider` / `useUser` (sesión de usuario en `localStorage:av_user`)
- `components/Nav.tsx` — navegación top
- `components/games/` — componentes canvas de cada juego: `AsteroidsGame`, `ArkanoidGame`, `TetrisGame`, `SnakeGame`
- `games/page.tsx` + `games/LibraryGrid.tsx` — biblioteca (grid con filtro y búsqueda)
- `games/[id]/page.tsx` — detalle de juego
- `games/[id]/play/page.tsx` — reproductor genérico; `games/{asteroids,arkanoid,tetris,snake}/play/page.tsx` — reproductores específicos
- `hall-of-fame/page.tsx` + `HallOfFameClient.tsx` — salón de la fama (leaderboard por juego)
- `auth/page.tsx` — login/registro
- `about/page.tsx` — página "Sobre Nosotros" con formulario de contacto
- `api/contact/route.ts` — endpoint que envía el email del formulario vía Resend

### `lib/supabase/` — Clientes de Supabase

- `client.ts` — cliente de navegador
- `server.ts` — cliente SSR (Server Components / route handlers)
- `types.ts` — tipos de la base de datos

Los juegos y las puntuaciones se leen/escriben en Supabase (no en datos mock). Las páginas de biblioteca, detalle, hall-of-fame y los reproductores consultan Supabase.

### `specs/` — Spec Driven Design (specs versionadas)

`01-mvp-visual` · `02-home-page` · `03-about-contact-resend` · `04-supabase-setup` · `05-asteroids-game` · `06-games-table-leaderboard-supabase` · `07-tetris-game` · `08-arkanoid-game` · `09-snake-game`

### `references/` — Material de referencia (no se ejecuta)

- `templates/` — prototipo original en vanilla React (CDN): `app.jsx`, `nav.jsx`, `biblioteca.jsx`, `detalle.jsx`, `reproductor.jsx`, `auth.jsx`, `salon.jsx`, `data.jsx`, `styles.css`, `Arcade Vault.html`; subcarpeta `home-about/` con el prototipo de home + about
- `started-games/` — implementaciones vanilla JS de referencia (`02-asteroids`, `03-tetris`, `04-arkanoid`)
- `source-assets/` — sprites (p. ej. `snake-assets/`)

### Flujo de navegación

`biblioteca` → `detalle` → `play` (guarda score en Supabase)
`biblioteca` → `hall-of-fame`
`nav` → `auth` (login guarda usuario en `localStorage:av_user`)
`nav` → `about` (formulario de contacto → `api/contact` → Resend)

### Categorías de juegos

`ARCADE` · `PUZZLE` · `SHOOTER` · `VERSUS`

### Juegos jugables (implementados)

Ver lista completa y siempre actualizada en `references/implemented-games.md` (se actualiza en cuanto se añade un juego nuevo).

### Metodología

**Spec Driven Design**: cada feature parte de una spec en `specs/` (skill `/spec`), se implementa con `/spec-impl` y los juegos nuevos con `/add-game`. El prototipo en `references/templates/` es la spec visual de partida.
