# SPEC — Integración del juego FROGGER (Game Jam)

> **Estado:** Borrador
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-06-01
> **Tema del game jam:** Frogger
> **Objetivo:** Integrar FROGGER como juego jugable en Arcade Vault, construyendo el canvas desde cero y conectando el leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `frogger` en la tabla `games` de Supabase (seed manual via SQL).
- Crear `app/components/games/FroggerGame.tsx` — componente React que encapsula el canvas
  de 480×640 y el game loop. Acepta props: `paused`, `onScoreChange`, `onLivesChange`,
  `onLevelChange`, `onGameOver`.
- Crear `app/games/frogger/play/page.tsx` — play-page específica para este juego.
  Gestiona el estado (score, lives, level, pausa, game over) y pasa callbacks al componente canvas.
- Controles: flechas `↑ ↓ ← →` y WASD. Registrados con `document.addEventListener`;
  limpiados en el `return` del `useEffect`.
- Mecánica: rana salta celda a celda (16 celdas de ancho × 20 celdas de alto, cada celda 32px). Zona inferior de salida segura (2 filas); zona de tráfico (6 filas, coches de izquierda a derecha y derecha a izquierda en carriles alternos); zona de agua (6 filas, troncos y tortugas que se mueven); zona de destino (2 filas con 5 casas-destino). Fila superior e inferior son safe zones.
- Puntuación: +10 por cada salto hacia arriba; +50 por llegar a una casa-destino vacía; +200 bonus por llenar las 5 casas en el nivel. Tiempo límite de 30s por rana (contador regresivo en canvas); +10 puntos por segundo restante al llegar a destino.
- Nivel: sube cuando se llenan las 5 casas-destino; cada nivel aumenta la velocidad de coches y troncos/tortugas.
- Vidas: 3 iniciales. Se pierde una vida si la rana es atropellada, cae al agua sin tronco, o agota el tiempo límite.
- Game over: `lives === 0`.
- Wiring del modal de game over: pre-rellenar nombre desde `localStorage.getItem('av_player_name')`; al confirmar, guardar nombre en localStorage e insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela el game loop.
- No hay overlay "GAME OVER" en canvas (construido desde cero) — el modal React lo maneja.
- HUD interno en canvas: contador de tiempo y casas-destino ocupadas. HUD React externo: score, lives, level.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Animaciones de sprite complejas (rana y obstáculos se dibujan como formas geométricas simples con color).
- Efectos de sonido.
- Power-ups o ítems especiales.
- Tortugas que se sumergen (variante avanzada de la mecánica de agua).
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'frogger', 'FROGGER', 'Cruza el tráfico antes de que te aplaste.',
  'Guía a tu rana a través de seis carriles de coches a toda velocidad y seis filas de río esquivando el agua fatal. Salta sobre troncos y tortugas para llegar sana a las casas del otro lado. Cada nivel acelera el caos — ¿hasta qué nivel aguantas?',
  'ARCADE', 'cover-rana', 'green'
);
```

### Props del componente `FroggerGame`

```ts
interface FroggerGameProps {
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

1. **Seed en Supabase** — ejecutar el INSERT de la fila `frogger` en el SQL Editor de Supabase.
   Verificación: la card de FROGGER aparece en `/games`.

2. **Crear `app/components/games/FroggerGame.tsx`** — componente `"use client"` que:
   - Renderiza un `<canvas>` de 480×640 referenciado con `useRef`.
   - Divide el canvas en 15 filas × 15 columnas (celdas de 32px); las 20 filas en eje Y quedan en canvas de 640px de alto (20 filas × 32px = 640px). Ancho: 15 columnas × 32px = 480px.
   - Estructura de filas (de abajo a arriba): fila 0 = zona segura de inicio; filas 1-6 = tráfico (carriles alternos L→R y R→L); fila 7 = mediana segura; filas 8-13 = río (troncos y tortugas); fila 14 = zona de casas-destino (5 huevos de destino equidistantes).
   - Obstáculos: array de coches y array de plataformas (troncos/tortugas) con `{x, y, w, speed, color}`. Se crean al inicializar y al subir de nivel.
   - Game loop con `requestAnimationFrame`; cada frame actualiza posición de obstáculos (wrapping en bordes), posición de la rana si está sobre plataforma, y cuenta el tiempo restante.
   - Contador de tiempo: 30 segundos por rana. Si llega a 0, se pierde una vida y la rana vuelve a inicio.
   - HUD en canvas: barra de tiempo (rectángulo verde que mengua) y 5 indicadores de casas en la parte superior.
   - Recibe prop `paused: boolean` — si es `true`, el loop no llama a `update()`, solo a `draw()`.
   - Llama `onScoreChange`, `onLivesChange`, `onLevelChange` cada vez que esos valores cambian (comparando con valor anterior antes de disparar).
   - Llama `onGameOver(score)` cuando `lives === 0`.
   - Los handlers `keydown` para flechas y WASD se registran con `document.addEventListener` y se limpian en el `return` del `useEffect`.
   - Al reiniciar (`gameKey` cambia), el estado interno se resetea: rana en posición inicial, vidas = 3, score = 0, level = 1, casas vacías.
     Verificación: el juego arranca en `/games/frogger/play` y es jugable con flechas y WASD.

3. **Crear `app/games/frogger/play/page.tsx`** — play-page específica:
   - Importa `FroggerGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal (`over === true`), lee `localStorage.getItem('av_player_name')` y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`: `{ game_id: 'frogger', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que `app/games/snake/play/page.tsx`.
     Verificación: el HUD React muestra score, lives y level en tiempo real; tras una partida el score aparece en `/games/frogger` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript.
   Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] La card de FROGGER aparece en `/games`.
- [ ] `/games/frogger` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/frogger/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con flechas y WASD.
- [ ] La rana salta celda a celda con cada pulsación de tecla.
- [ ] Los coches circulan en carriles alternos a distintas velocidades.
- [ ] Los troncos y tortugas se mueven en el río; la rana se desplaza con ellos si está encima.
- [ ] Caer al agua (sin tronco/tortuga) resta una vida y devuelve la rana al inicio.
- [ ] Ser atropellado por un coche resta una vida y devuelve la rana al inicio.
- [ ] El contador de 30s retrocede; agotar el tiempo resta una vida.
- [ ] Llegar a una casa-destino vacía suma puntos y coloca la rana en esa casa.
- [ ] Llenar las 5 casas sube de nivel, vacía las casas y aumenta velocidades.
- [ ] El HUD interno del canvas muestra la barra de tiempo y los indicadores de casas.
- [ ] El HUD React de la plataforma refleja en tiempo real score, lives y level.
- [ ] El botón "PAUSA" congela el game loop; "REANUDAR" lo reanuda.
- [ ] Al perder la última vida, aparece el modal React de game over con la puntuación final.
- [ ] No hay overlay "GAME OVER" dibujado en el canvas.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero.
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/frogger` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para FROGGER.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` cuando el estado cambia.
  Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas`, `requestAnimationFrame` y eventos de teclado no existen en el entorno
  Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/frogger/play/page.tsx`** — en lugar de modificar
  la ruta genérica `[id]/play`.
  Razón: evita condicionales en la ruta genérica; Next.js App Router da prioridad a rutas
  estáticas sobre dinámicas.

- **Sí: `requestAnimationFrame` en lugar de `setInterval`** — el movimiento de coches y
  troncos es continuo (no discreto), requiere interpolación suave entre frames.
  Razón: `requestAnimationFrame` es el modelo natural para juegos con movimiento fluido;
  la rana se mueve en pasos discretos pero los obstáculos se deslizan de forma continua.

- **Sí: HUD parcialmente en canvas** — barra de tiempo y casas-destino se dibujan en canvas;
  score, lives y level se exponen al HUD React externo.
  Razón: la barra de tiempo está intrínsecamente ligada al área de juego y su posición visual
  dentro del canvas es parte de la experiencia. Score, lives y level siguen el patrón de la plataforma.

- **Sí: Wrapping horizontal de obstáculos** — coches y plataformas reaparecen por el lado
  contrario al salir del canvas.
  Razón: comportamiento canónico del Frogger clásico; simplifica la gestión de obstáculos.

- **Sí: Formas geométricas simples para gráficos** — rana, coches y plataformas se dibujan
  con rectángulos y círculos coloreados, sin sprites externos.
  Razón: construido desde cero sin assets de referencia; mantiene consistencia con el estilo
  retro neon de la plataforma.

- **No: Overlay "GAME OVER" en canvas** — no aplica; construido desde cero sin ese overlay.
  El modal React de la plataforma gestiona el fin de partida.

- **No: Tortugas que se sumergen** — variante avanzada excluida del alcance inicial.
  Razón: añade complejidad de estado (timing de inmersión) sin valor proporcional para un
  primer spec; puede añadirse en iteración futura.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06.
  Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos).
  Razón: se mitiga en el spec futuro de seguridad.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio.
  Razón: YAGNI; generalizar sin suficientes casos de uso confirmados.
