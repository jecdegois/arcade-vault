# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Arcade Vault** — plataforma online de juegos arcade retro donde los usuarios compiten por puntuaciones. Stack: Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + pnpm.

## Comandos

```bash
pnpm dev        # servidor dev en localhost:3000
pnpm build      # compilar producción
pnpm start      # servir build de producción
pnpm lint       # ESLint
```

No hay test runner configurado todavía.

## Arquitectura

### `app/` — Next.js App Router
- `layout.tsx` — layout raíz con fuentes Geist (sans + mono) y Tailwind
- `page.tsx` — página de inicio (aún es el scaffold por defecto de Next.js)
- `globals.css` — estilos globales con Tailwind v4

### `resources/templates/` — Prototipo de referencia (spec)
Implementación completa de la UI en vanilla React sin build (cargado vía CDN en `Arcade Vault.html`). **Estas plantillas son la especificación de diseño** que debe migrarse al app de Next.js:

| Archivo | Componente exportado | Descripción |
|---|---|---|
| `data.jsx` | `GAMES`, `CATS`, `seededScores` | Mock data de 8 juegos y generador de puntuaciones |
| `app.jsx` | `App` | Enrutador hash-based; gestiona estado global de usuario y sesión |
| `nav.jsx` | `Nav` | Navegación top con menú móvil |
| `biblioteca.jsx` | `Library` | Grid de tarjetas con filtro por categoría y búsqueda |
| `detalle.jsx` | `GameDetail` | Vista detalle de un juego |
| `reproductor.jsx` | `GamePlayer` | Pantalla de juego con registro de puntuación |
| `auth.jsx` | `Auth` | Login/registro de usuario |
| `salon.jsx` | `HallOfFame` | Tabla de clasificación por juego |
| `styles.css` | — | Design tokens CSS (variables `--ink-*`, `--magenta`, `--cyan`, etc.) |

### Flujo de navegación (del prototipo)
`biblioteca` → `detalle` → `player` → (guarda score en `localStorage:av_scores`)  
`biblioteca` → `salon`  
`nav` → `auth` (login guarda usuario en `localStorage:av_user`)

### Categorías de juegos
`ARCADE` · `PUZZLE` · `SHOOTER` · `VERSUS`

### Metodología
El proyecto usa **Spec Driven Design** con los skills `/spec` y `/spec-impl`. Las plantillas en `resources/templates/` actúan como spec visual; la implementación va en `app/`.
