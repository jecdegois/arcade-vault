# SPEC 08 — Integración del juego ARKANOID

> **Estado:** Implementado
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-05-27
> **Objetivo:** Integrar ARKANOID como juego jugable en Arcade Vault, adaptando su canvas a React y conectando el leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `arkanoid` en la tabla `games` de Supabase (seed manual via SQL).
- Crear `app/components/games/ArkanoidGame.tsx` — componente React que encapsula el canvas
  de 800×600. Acepta props: `paused`, `onScoreChange`, `onLivesChange`, `onLevelChange`,
  `onGameOver`.
- Crear `app/games/arkanoid/play/page.tsx` — play-page específica para este juego.
  Gestiona el estado (score, lives, level, pausa, game over, win) y pasa callbacks al
  componente canvas.
- Wiring del modal de game over y win: pre-rellenar nombre desde
  `localStorage.getItem('av_player_name')`; al confirmar, guardar nombre en localStorage e
  insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela
  el game loop.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- Selector de nivel del overlay de pausa del canvas original — se elimina; la plataforma
  no tiene equivalente.
- Sonidos (`ball-bounce.mp3`, `break-sound.mp3`) — el canvas original los incluye; no se
  modifican ni eliminan, simplemente se mantienen si el navegador los carga.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'arkanoid', 'ARKANOID', 'Rompe bloques con la paleta antes de perder las 3 vidas.',
  'Cinco niveles de bloques de colores y una sola bola. Mueve la paleta con el ratón o las flechas para que no toque el suelo. Cada nivel acelera la bola; rompe todo para ganar.',
  'ARCADE', 'cover-bricks', 'magenta'
);
```

### Props del componente `ArkanoidGame`

```ts
interface ArkanoidGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow`
de `lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase** — ejecutar el INSERT de la fila `arkanoid` en el SQL Editor de
   Supabase.
   Verificación: la card de ARKANOID aparece en `/games`.

2. **Crear `app/components/games/ArkanoidGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas>` de 800×600 referenciado con `useRef`.
   - Contiene el game loop completo adaptado de
     `references/started-games/04-arkanoid/game.js` y
     `references/started-games/04-arkanoid/levels.js`, incluyendo la lógica de
     `loadSpritesheet`, `initPaddle`, `initBall`, `loadLevel`, `collideAABB`, `update`,
     `draw` y `loop`.
   - Copia los assets del spritesheet (`assets/spritesheet.js` y
     `assets/spritesheet-breakout.png`) a `public/games/arkanoid/` para que sean
     accesibles desde el navegador.
   - Recibe prop `paused: boolean` — si es `true`, el loop congela `update`; cuando vuelve
     a `false`, reanuda con `lastTime` reseteado.
   - Llama `onScoreChange`, `onLivesChange`, `onLevelChange` cada vez que esos valores
     cambian (reemplazando las referencias directas a las variables del original).
   - Llama `onGameOver(score)` cuando `gameState === 'gameover'` o `gameState === 'win'`
     (ambos finales guardan la puntuación).
   - Elimina del `draw()`: `drawOverlay('GAME OVER')`, `drawOverlay('¡Completaste el
juego!')`, `drawPauseOverlay()` y el HUD de texto/sprites (score, nivel, vidas).
   - Los handlers `keydown` y `keyup` se registran con `document.addEventListener` y se
     limpian en el `return` del `useEffect`. Las teclas `P` y `Escape` se omiten. El
     listener `mousemove` se registra en el elemento `canvas` (ref) y también se limpia
     en el `return`.
   - Cuando `paused === true` o `gameOver === true`, los listeners ignoran los inputs de
     juego.
     Verificación: el juego arranca en `/games/arkanoid/play` y es jugable con ←→ teclado
     y ratón.

3. **Crear `app/games/arkanoid/play/page.tsx`** — play-page específica:
   - Importa `ArkanoidGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives`, `level`, `paused`, `over`, `name`, `saved`,
     `gameKey`.
   - Al montar el modal (`over === true`), lee `localStorage.getItem('av_player_name')`
     y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`:
     `{ game_id: 'arkanoid', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que
     `app/games/asteroids/play/page.tsx` y `app/games/tetris/play/page.tsx`.
     Verificación: el HUD React muestra score, lives y level en tiempo real; tras una
     partida el score aparece en `/games/arkanoid` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript.
   Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de ARKANOID aparece en `/games`.
- [ ] `/games/arkanoid` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/arkanoid/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con ←→ teclado y ratón.
- [ ] El HUD React de la plataforma refleja en tiempo real score, lives y level.
- [ ] El botón "PAUSA" congela el game loop; "REANUDAR" lo reanuda.
- [ ] Al perder todas las vidas, aparece el modal React de game over con la puntuación final.
- [ ] Al completar los 5 niveles, también aparece el modal con la puntuación final.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero.
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de
      localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/arkanoid` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para ARKANOID.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` cuando el estado cambia,
  reemplazando las actualizaciones directas al DOM del original.
  Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas`, `requestAnimationFrame` y `Audio` no existen en el entorno Node.js de
  Next.js SSR.

- **Sí: Play-page específica `app/games/arkanoid/play/page.tsx`** — en lugar de modificar
  la ruta genérica `[id]/play`.
  Razón: evita condicionales en la ruta genérica; Next.js App Router da prioridad a rutas
  estáticas sobre dinámicas.

- **Sí: Modal tanto en `gameover` como en `win`** — ambos finales guardan la puntuación.
  Razón: el jugador que completa los 5 niveles merece que su score quede registrado.

- **Sí: Assets en `public/games/arkanoid/`** — el spritesheet y los sonidos se copian a
  `public/` para ser accesibles vía URL desde el navegador.
  Razón: Next.js solo sirve archivos estáticos desde `public/`; los assets del reference
  no son importables directamente como módulos.

- **Sí: Eliminar HUD del canvas** — score, lives y level se exponen vía callbacks al HUD
  React; no se dibujan en el canvas.
  Razón: coherencia con el patrón de Tetris y Asteroids; el HUD React es el único visible.

- **No: Overlay de game over / win en canvas** — `drawOverlay()` y `drawPauseOverlay()`
  se eliminan del `draw()`.
  Razón: el modal React los reemplaza; tener ambos solapados sería confuso.

- **No: Selector de nivel del overlay de pausa** — los botones de nivel 1-5 del canvas
  original se eliminan.
  Razón: la plataforma no tiene UI equivalente; añadirla está fuera del alcance de este spec.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio.
  Razón: YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06.
  Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos).
  Razón: se mitiga en el spec futuro de seguridad.
