# SPEC 09 — Integración del juego SNAKE

> **Estado:** Implementado
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-05-27
> **Objetivo:** Integrar SNAKE como juego jugable en Arcade Vault, construyendo el canvas desde cero con los assets de frutas y conectando el leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `snake` en la tabla `games` de Supabase (seed manual via SQL).
- Copiar `references/source-assets/snake-assets/fruits.png` y `sprites.js` a
  `public/games/snake/` para ser accesibles vía URL desde el navegador.
- Crear `app/components/games/SnakeGame.tsx` — componente React que encapsula el canvas
  de 800×800 (rejilla 20×20 celdas de 40px), centrado en pantalla. Acepta props: `paused`, `onScoreChange`,
  `onLevelChange`, `onGameOver`.
- Crear `app/games/snake/play/page.tsx` — play-page específica para este juego.
  Gestiona el estado (score, level, pausa, game over) y pasa callbacks al componente canvas.
- Controles: flechas `↑ ↓ ← →` y WASD. Registrados con `document.addEventListener`;
  limpiados en el `return` del `useEffect`.
- Puntuación: 10 puntos × nivel actual por cada fruta comida.
- Nivel: sube cada 50 puntos; cada nivel aumenta la velocidad del game loop.
- Game over: la serpiente choca con los bordes del canvas o con su propia cola.
- Wiring del modal de game over: pre-rellenar nombre desde
  `localStorage.getItem('av_player_name')`; al confirmar, guardar nombre en localStorage
  e insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela
  el `setInterval` del game loop.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Vidas múltiples — Snake clásico de una sola vida.
- HUD dibujado dentro del canvas — solo el HUD React externo es visible.
- Múltiples frutas simultáneas en el tablero — una fruta a la vez.
- Serpiente de longitud inicial mayor a 3 segmentos.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'snake', 'SNAKE', 'Crece comiendo frutas antes de morderte la cola.',
  'Guía a la serpiente para que devore frutas del jardín. Cada bocado alarga tu cuerpo y acelera el ritmo. Un solo error — golpear la pared o tu propia cola — termina la partida.',
  'ARCADE', 'cover-snake', 'green'
);
```

### Props del componente `SnakeGame`

```ts
interface SnakeGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow`
de `lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase + assets** — ejecutar el INSERT de la fila `snake` en el SQL Editor
   de Supabase. Copiar `references/source-assets/snake-assets/fruits.png` y `sprites.js`
   a `public/games/snake/`.
   Verificación: la card de SNAKE aparece en `/games`.

2. **Crear `app/components/games/SnakeGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas>` de 800×800 referenciado con `useRef`, centrado en pantalla.
   - Implementa el game loop con `setInterval`; el intervalo inicial es 150ms y se reduce
     10ms por cada nivel (mínimo 60ms).
   - Estado interno: array de segmentos `{x, y}` para la serpiente, posición de la fruta
     activa, dirección actual, score, level.
   - Fruta: se elige aleatoriamente de los 22 sprites de `SPRITE_ATLAS.fruits` cargados
     desde `public/games/snake/sprites.js`; la imagen se carga desde
     `public/games/snake/fruits.png`.
   - Dibuja en canvas: fondo oscuro, rejilla opcional, segmentos de la serpiente, fruta
     con sprite.
   - Recibe prop `paused: boolean` — si es `true`, el `setInterval` se limpia; cuando
     vuelve a `false`, se reinicia.
   - Llama `onScoreChange` y `onLevelChange` cada vez que esos valores cambian.
   - Llama `onGameOver(score)` cuando la serpiente colisiona con borde o cola.
   - Los handlers `keydown` para flechas y WASD se registran con
     `document.addEventListener` y se limpian en el `return` del `useEffect`.
     Verificación: el juego arranca en `/games/snake/play` y es jugable con teclado.

3. **Crear `app/games/snake/play/page.tsx`** — play-page específica:
   - Importa `SnakeGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal (`over === true`), lee `localStorage.getItem('av_player_name')`
     y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`:
     `{ game_id: 'snake', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que
     `app/games/arkanoid/play/page.tsx`.
     Verificación: el HUD React muestra score y level en tiempo real; tras una partida el
     score aparece en `/games/snake` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript.
   Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de SNAKE aparece en `/games`.
- [ ] `/games/snake` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/snake/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con flechas y WASD.
- [ ] La fruta se muestra con un sprite aleatorio de `fruits.png`.
- [ ] Comer una fruta suma `10 × nivel` puntos y alarga la serpiente.
- [ ] El nivel sube cada 50 puntos y la velocidad del game loop aumenta.
- [ ] El HUD React refleja en tiempo real score y level.
- [ ] Chocar con el borde del canvas provoca game over.
- [ ] Chocar con la propia cola provoca game over.
- [ ] El botón "PAUSA" congela el game loop; "REANUDAR" lo reanuda.
- [ ] Al perder, aparece el modal React de game over con la puntuación final.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero.
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de
      localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/snake` y en `/hall-of-fame` al recargar.
- [ ] `/hall-of-fame` muestra un tab para SNAKE.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLevelChange`, `onGameOver` cuando el estado cambia.
  Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas`, `setInterval` y eventos de teclado no existen en el entorno Node.js
  de Next.js SSR.

- **Sí: Play-page específica `app/games/snake/play/page.tsx`** — en lugar de modificar
  la ruta genérica `[id]/play`.
  Razón: evita condicionales en la ruta genérica; Next.js App Router da prioridad a rutas
  estáticas sobre dinámicas.

- **Sí: Assets en `public/games/snake/`** — `fruits.png` y `sprites.js` se copian a
  `public/` para ser accesibles vía URL desde el navegador.
  Razón: Next.js solo sirve archivos estáticos desde `public/`; los assets no son
  importables directamente como módulos.

- **Sí: `setInterval` en lugar de `requestAnimationFrame`** — el game loop de Snake es
  discreto (la serpiente se mueve celda a celda en pasos fijos).
  Razón: `setInterval` con intervalo variable por nivel es el modelo natural para Snake;
  `requestAnimationFrame` es más adecuado para juegos con movimiento continuo.

- **Sí: Solo HUD React externo** — score y level no se dibujan en el canvas.
  Razón: coherencia con el patrón de Tetris y Arkanoid.

- **Sí: Puntuación `10 × nivel`** — más nivel, más recompensa por fruta.
  Razón: incentiva jugar más tiempo y añade progresión sin complejidad extra.

- **No: Vidas múltiples** — Snake clásico de una sola vida.
  Razón: la tensión de perderlo todo de un error es la esencia del juego.

- **No: Teletransportación en bordes** — los bordes matan.
  Razón: decisión confirmada por el usuario; aumenta la dificultad.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio.
  Razón: YAGNI; generalizar sin suficientes casos de uso confirmados.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06.
  Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.
