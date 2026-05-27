# SPEC 07 — Integración del juego TETRIS

> **Estado:** Implementado
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-05-27
> **Objetivo:** Integrar TETRIS como juego jugable en Arcade Vault, adaptando su canvas a React y conectando el leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `tetris` en la tabla `games` de Supabase (seed manual via SQL).
- Crear `app/components/games/TetrisGame.tsx` — componente React que encapsula el canvas
  principal (300×600) y el canvas de pieza siguiente (120×120). Acepta props:
  `paused`, `onScoreChange`, `onLinesChange`, `onLevelChange`, `onGameOver`.
- Crear `app/games/tetris/play/page.tsx` — play-page específica para este juego.
  Gestiona el estado (score, lines, level, pausa, game over) y pasa callbacks al componente canvas.
- Wiring del modal de game over: pre-rellenar nombre desde `localStorage.getItem('av_player_name')`;
  al confirmar, guardar nombre en localStorage e insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela el game loop.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- Skins visuales (retro/neon/pastel/pixel) del juego original — se usa únicamente la skin retro.
- Selector de nivel inicial del menú de pausa original — fuera del alcance de este spec.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'tetris', 'TETRIS', 'Apila tetrominos antes de que el techo te aplaste.',
  'Siete piezas, infinitas posibilidades. Rota y desliza tetrominos para completar líneas y mantener el tablero despejado. Cada nivel acelera la caída; cada combo multiplica la puntuación.',
  'PUZZLE', 'cover-tetro', 'cyan'
);
```

### Props del componente `TetrisGame`

```ts
interface TetrisGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow`
de `lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase** — ejecutar el INSERT de la fila `tetris` en el SQL Editor de Supabase.
   Verificación: la card de TETRIS aparece en `/games`.

2. **Crear `app/components/games/TetrisGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas>` principal de 300×600 y un `<canvas>` secundario de 120×120
     para la pieza siguiente, ambos referenciados con `useRef`.
   - Contiene el game loop completo adaptado de `references/started-games/03-tetris/game.js`
     (clases/funciones `createBoard`, `collide`, `rotateCW`, `tryRotate`, `merge`, `clearLines`,
     `ghostY`, `hardDrop`, `softDrop`, `lockPiece`, `spawn`, `draw`, `drawNext`, `loop`, `init`).
   - Recibe prop `paused: boolean` — si es `true`, el loop cancela el `requestAnimationFrame`
     y deja de llamar a `update`; cuando vuelve a `false`, reanuda con `lastTime` reseteado.
   - Llama `onScoreChange`, `onLinesChange`, `onLevelChange` cada vez que esos valores cambian
     (reemplazando las llamadas a `updateHUD()` del original).
   - Llama `onGameOver(score)` cuando `spawn()` detecta colisión inmediata
     (reemplazando la lógica de `endGame()` del original).
   - Elimina toda manipulación DOM del original (`gameoverOverlay`, `pauseOverlay`,
     `scoreEl`, `linesEl`, `levelEl`) — no hay elementos HTML que gestionar.
   - El handler de teclado se registra con `document.addEventListener('keydown', handler)`
     y se limpia en el `return` del `useEffect`. Las teclas `P` y `Escape` se omiten
     del handler (la pausa la controla la plataforma vía prop).
   - Cuando `paused === true` o `gameOver === true`, el listener ignora los inputs de juego.
     Verificación: el juego arranca en `/games/tetris/play` y es jugable con
     ←→ mover, ↑/X rotar, ↓ bajar lento, Space caída instantánea.

3. **Crear `app/games/tetris/play/page.tsx`** — play-page específica:
   - Importa `TetrisGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lines`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal de game over (`over === true`), lee `localStorage.getItem('av_player_name')`
     y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`:
     `{ game_id: 'tetris', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que
     `app/games/asteroids/play/page.tsx`.
     Verificación: el HUD React muestra score, lines y level en tiempo real; tras una partida
     el score aparece en `/games/tetris` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript.
   Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de TETRIS aparece en `/games`.
- [ ] `/games/tetris` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/tetris/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con ←→ mover, ↑/X rotar, ↓ bajar lento, Space caída instantánea.
- [ ] El canvas secundario (120×120) muestra la pieza siguiente en tiempo real.
- [ ] El HUD React de la plataforma refleja en tiempo real score, lines y level.
- [ ] El botón "PAUSA" congela el game loop; "REANUDAR" lo reanuda.
- [ ] Al terminar la partida, aparece el modal React de game over con la puntuación final.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero.
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/tetris` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para TETRIS.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLinesChange`, `onLevelChange`, `onGameOver` cuando el estado cambia,
  reemplazando las llamadas a `updateHUD()` y `endGame()` del original.
  Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/tetris/play/page.tsx`** — en lugar de modificar la ruta
  genérica `[id]/play`. Razón: evita condicionales en la ruta genérica; Next.js App Router
  da prioridad a rutas estáticas sobre dinámicas.

- **Sí: Un único spec combinado (juego + leaderboard)** — las tablas `games` y `scores` ya
  existen; solo se añade la fila del juego y el wiring. Separarlos no aportaría valor visible.

- **No: HUD doble (canvas + React)** — el HUD del juego original es HTML DOM, no canvas.
  `draw()` solo dibuja tablero, pieza actual y ghost. El HUD React es el único HUD visible;
  los callbacks reemplazan `updateHUD()` directamente.

- **No: Overlay de game over en canvas** — el original usa un `<div>` HTML, no un dibujo
  en `draw()`. No hay nada que eliminar del canvas; `onGameOver()` reemplaza `endGame()`.

- **No: Skins visuales (neon/pastel/pixel)** — se porta únicamente la skin retro.
  Razón: las skins dependen de CSS variables del DOM original; portarlas añade complejidad
  sin impacto en la jugabilidad. Pueden añadirse en un spec futuro.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06.
  Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos).
  Razón: se mitiga en el spec futuro de seguridad.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio.
  Razón: YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.
