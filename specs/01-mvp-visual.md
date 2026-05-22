# SPEC 01 — MVP visual completo de Arcade Vault

> **Status:** Implementado · **Depende de:** — · **Fecha:** 2026-05-22
> **Objetivo:** Migrar todas las pantallas del prototipo (`references/templates/`) a Next.js App Router con TypeScript, conservando el diseño pixel-neon del prototipo sin implementar lógica real de juegos.

---

## Scope

**In:**

- Componente `Nav` con menú móvil (slide-in panel + backdrop)
- Página `/` → `Library`: hero, filtros por categoría, búsqueda, grid de tarjetas
- Página `/games/[id]` → `GameDetail`: cover art, stats, leaderboard inline, acciones
- Página `/games/[id]/play` → `GamePlayer`: HUD, pantalla CRT animada, modal game-over con registro de puntuación
- Página `/hall-of-fame` → `HallOfFame`: selector de juego, podio top-3, tabla completa
- Página `/auth` → `Auth`: tabs login/registro, campos de formulario, botones sociales (solo visual)
- `app/data.ts`: tipos TypeScript + mock data (`GAMES`, `CATS`, `seededScores`)
- React Context en el layout raíz para estado de usuario y sesión (`av_user` en localStorage)
- Persistencia de puntuaciones en `localStorage:av_scores`

**Out of scope (para futuros specs):**

- Implementación real de cualquier juego
- Autenticación real (backend, OAuth, JWT)
- Base de datos real (mock data solamente)
- Animaciones de transición entre rutas
- PWA / modo offline

---

## Data model

```ts
// app/data.ts

export type Category = 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';

export interface Game {
  id: string;
  title: string;
  description: string;
  category: Category;
  coverClass: string;   // clase CSS del cover art generado (ej. "cover-bricks")
  players: number;      // jugadores simultáneos (1 o 2)
  difficulty: 1 | 2 | 3;
}

export interface ScoreEntry {
  player: string;
  score: number;
  date: string;         // ISO 8601
}

// localStorage:av_user
export interface AVUser {
  name: string;
}

// localStorage:av_scores → Record<gameId, ScoreEntry[]>
export type AVScores = Record<string, ScoreEntry[]>;

export const GAMES: Game[] = [ /* 8 juegos mock */ ];
export const CATS: Category[] = ['ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS'];
export function seededScores(): AVScores { /* generador determinístico */ }
```

---

## Implementation plan

- [x] 1. Crear `app/data.ts` con tipos, `GAMES` (8 juegos), `CATS` y `seededScores`.
         Test manual: importar desde `app/page.tsx` y hacer `console.log(GAMES)` — sin errores de TS.

- [x] 2. Crear `app/context.tsx` con `UserContext` (provider + hook `useUser`).
         Wrapear el layout raíz en `app/layout.tsx`. Leer/escribir `localStorage:av_user`.

- [x] 3. Crear `app/components/Nav.tsx`.
         Test manual: visible en todas las rutas; menú móvil abre y cierra; link activo resaltado.

- [x] 4. Crear `app/page.tsx` (Library): hero, chips de categoría, búsqueda, grid de `GameCard`.
         Test manual: filtrar por categoría y buscar por nombre muestra el subconjunto correcto.

- [x] 5. Crear `app/games/[id]/page.tsx` (GameDetail): cover art, stats strip, leaderboard inline, botones.
         Test manual: navegar desde Library a un juego muestra su detalle correcto.

- [x] 6. Crear `app/games/[id]/play/page.tsx` (GamePlayer): HUD, pantalla CRT animada, modal game-over.
         Test manual: abrir modal, escribir nombre, guardar → `localStorage:av_scores` contiene la entrada.

- [x] 7. Crear `app/hall-of-fame/page.tsx` (HallOfFame): selector de juego, podio top-3, tabla completa.
         Test manual: cambiar juego en el selector actualiza podio y tabla.

- [x] 8. Crear `app/auth/page.tsx` (Auth): tabs login/registro, campos, botones sociales.
         Test manual: tab login ↔ registro alterna formulario; submit login guarda usuario en contexto y redirige a `/`.

---

## Acceptance criteria

- [ ] `app/data.ts` exporta `GAMES` con exactamente 8 juegos sin errores de TypeScript.
- [ ] El layout raíz renderiza `Nav` y el `UserContext` está disponible en todas las rutas.
- [ ] `Nav` muestra el link activo resaltado en cyan según la ruta actual.
- [ ] `Nav` en mobile (<840px) oculta los links y muestra el hamburger; el panel slide-in abre y cierra.
- [ ] `Library` muestra los 8 juegos; filtrar por categoría reduce el grid al subconjunto correcto.
- [ ] El buscador de `Library` filtra por título en tiempo real.
- [ ] `GameDetail` muestra el cover art, stats strip y leaderboard del juego correspondiente al `id` de la URL.
- [ ] `GamePlayer` muestra el HUD con score, vidas y nivel; la pantalla CRT tiene la animación activa.
- [ ] El modal game-over de `GamePlayer` permite escribir un nombre y al guardar escribe en `localStorage:av_scores`.
- [ ] `HallOfFame` muestra podio top-3 y tabla; cambiar el juego en el selector actualiza ambos.
- [ ] `Auth` alterna entre formulario de login y registro al cambiar de tab.
- [ ] Submit de login en `Auth` guarda el usuario en `localStorage:av_user`, actualiza el contexto y redirige a `/`.
- [ ] Ninguna pantalla lanza errores en consola al cargar en desarrollo.
- [ ] La app es navegable en viewport móvil (375px) sin scroll horizontal.

---

## Decisions

- **Sí:** Rutas de archivo Next.js App Router (`/games/[id]`, etc.) en lugar de hash-routing del prototipo.
  El hash-routing es un workaround para vanilla React sin build; App Router es el patrón nativo de Next.js.

- **Sí:** `app/data.ts` como capa de mock data con tipos TypeScript.
  Estructura preparada para reemplazar con llamadas a base de datos en un spec posterior.

- **Sí:** React Context en el layout raíz para estado de usuario.
  Suficiente para el MVP; sin dependencias extra. Zustand queda descartado por ahora.

- **Sí:** `localStorage:av_user` y `localStorage:av_scores` — mismas claves que el prototipo.
  Permite consistencia con el prototipo de referencia y facilita pruebas cruzadas.

- **No:** Zustand u otra librería de estado global.
  Sobreingenería para el alcance actual.

- **No:** Autenticación real, OAuth o JWT.
  Va en un spec dedicado cuando haya backend.

- **No:** Implementación de juegos reales.
  Cada juego tendrá su propio spec. El player muestra la pantalla CRT animada como placeholder.

- **No:** Animaciones de transición entre rutas.
  Se puede añadir con View Transitions API en un spec posterior sin tocar esta base.

---

## Risks

| Riesgo | Mitigación |
|---|---|
| `localStorage` no existe en SSR (Next.js renderiza en servidor) | Acceder a `localStorage` solo dentro de `useEffect` o con `typeof window !== 'undefined'`. Aplica a `av_user` y `av_scores`. |

---

## What is **not** in this spec

- Implementación real de ningún juego (cada uno tendrá su propio spec).
- Autenticación real con backend.
- Base de datos (todo es mock data en `app/data.ts`).
- Animaciones de transición entre rutas.
- PWA / modo offline.
