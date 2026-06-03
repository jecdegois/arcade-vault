# SPEC — Integración del juego DONKEY KONG ENDLESS CLIMB (Game Jam)

> **Estado:** Borrador
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-06-02
> **Tema del game jam:** Donkey Kong
> **Objetivo:** Integrar DONKEY KONG ENDLESS CLIMB como juego jugable en Arcade Vault, construyendo el canvas desde cero y conectando el leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `donkey-kong-endless` en la tabla `games` de Supabase (seed manual via SQL).
- Crear `app/components/games/DonkeyKongEndlessGame.tsx` — componente React que encapsula
  el canvas de 480×640. Acepta props: `paused`, `onScoreChange`, `onLivesChange`, `onGameOver`.
- Crear `app/games/donkey-kong-endless/play/page.tsx` — play-page específica.
  Gestiona el estado (score, lives, pausa, game over) y pasa callbacks al componente canvas.
- Wiring del modal de game over: pre-rellenar nombre desde `localStorage.getItem('av_player_name')`;
  al confirmar, guardar nombre en localStorage e insertar score en la tabla `scores` vía cliente browser.
- Botón de pausa de la plataforma pasa el flag `paused` al componente canvas, que congela el game loop.
- No hay overlay "GAME OVER" en canvas — solo existe el modal React de la plataforma.

**Fuera de alcance:**

- Crear las tablas `games` o `scores` en Supabase — ya existen (spec 06).
- Supabase Auth — `user_id` se almacena como `null` en todos los scores.
- RLS (Row Level Security) — se configura en un spec futuro de seguridad.
- Realtime — el leaderboard no se actualiza en vivo; solo al cargar la página.
- Paginación del leaderboard — se muestran los top 10 fijos.
- Controles táctiles o mobile.
- Actualización automática de `best` y `plays` en la tabla `games` — campos estáticos.
- Cover CSS dedicado — se reutiliza `cover-bricks`; añadir `cover-dk` queda fuera de alcance.
- Sprites/assets gráficos reales — todo se dibuja con primitivas canvas 2D.
- Sonidos — fuera de alcance de este spec.
- Campo `level` en HUD — esta variante no tiene niveles fijos; el HUD solo expone `score` y `lives`.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'donkey-kong-endless',
  'DONKEY KONG ENDLESS CLIMB',
  'Sube sin fin mientras el gorila no para de lanzar.',
  'El andamio se genera solo: nuevas vigas y escaleras aparecen hacia arriba sin límite mientras tú subes. El gorila te sigue. Los barriles se aceleran. No hay final — solo resistir hasta que uno falle. ¿Hasta qué altura llegas?',
  'ARCADE', 'cover-bricks', 'magenta'
);
```

### Props del componente `DonkeyKongEndlessGame`

```ts
interface DonkeyKongEndlessGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onGameOver: (finalScore: number) => void;
}
```

No se introducen nuevas tablas ni tipos TypeScript — se reutilizan `GameRow` y `ScoreRow`
de `lib/supabase/types.ts`.

---

## Implementation plan

1. **Seed en Supabase** — ejecutar el INSERT de la fila `donkey-kong-endless` en el SQL Editor.
   Verificación: la card de DONKEY KONG ENDLESS CLIMB aparece en `/games`.

2. **Crear `app/components/games/DonkeyKongEndlessGame.tsx`** — componente `"use client"` que:

   **Canvas y layout:**
   - Renderiza un `<canvas>` de 480×640, referenciado con `useRef<HTMLCanvasElement>`.
   - Vista con scroll vertical: el mundo tiene altura ilimitada; la cámara sigue al jugador
     con un margen de 200 px desde el borde superior del canvas.
   - `cameraY` = coordenada Y del mundo que se mapea al borde superior del canvas.
   - Toda posición en canvas = posición en mundo − `cameraY`.

   **Estructuras de datos del estado:**
   - `player`: `{ worldX, worldY, vx, vy, onGround, onLadder, hasHammer, hammerTimer, facingRight }`.
   - `barrels[]`: `{ worldX, worldY, vx, vy, onFloor }` — máximo 10 simultáneos en pantalla.
   - `fireballs[]`: `{ worldX, worldY, vx, vy }` — se añaden desde height > 1500 px.
   - `platforms[]`: array de vigas generadas proceduralmente (descripción abajo).
   - `ladders[]`: array de escaleras generadas proceduralmente.
   - `hammers[]`: `{ worldX, worldY, active, collected }` — 1 mazo cada ~800 px de altura.
   - `dk`: `{ worldX, worldY, targetPlatformIdx }` — DK sube cuando el jugador sube.
   - `cameraY`: número — posición vertical de la cámara en coords de mundo.
   - `highestY`: número — record de altura del jugador en esta partida (para score).
   - `score`, `lives` (inicia en 3), `speed` — multiplicador de velocidad global.
   - `state`: `'idle' | 'playing' | 'paused' | 'gameover'`.
   - `worldHeight`: número — altura máxima generada hasta el momento; se extiende al vuelo.

   **Generación procedural de plataformas:**
   - Al inicializar: se generan 12 vigas en `worldY` de 0 a −2400 (negativo = arriba).
   - Algoritmo `generatePlatforms(fromY, toY)`:
     - Cada ~180-220 px de altura (aleatorio), colocar una viga de longitud 120-280 px
       en una x aleatoria dentro de [20, 460 − w].
     - La viga siguiente garantiza ser alcanzable desde la anterior: la diferencia de x
       entre bordes es ≤ 120 px Y la diferencia de altura ≤ 160 px.
     - Cada 2-4 vigas, añadir una escalera vertical de 120-160 px de alto conectando
       la viga superior con la inferior (posición x = borde izquierdo de la viga superior ± 20 px).
     - Pendiente de viga: ±2° (aleatoria), sin superar ±4° acumulados en 5 vigas seguidas.
   - Cuando `player.worldY < worldHeight + 400`, llamar a `generatePlatforms` para extender
     el mundo 800 px más hacia arriba.
   - Plataformas con `worldY < cameraY − 800` se eliminan del array (culling).

   **Mecánica de DK persiguiendo al jugador:**
   - DK siempre ocupa la viga más alta generada.
   - Cuando el jugador supera la posición Y de DK − 300 px, DK "salta" a la viga
     inmediatamente superior (transición animada de 400 ms) y lanza 2 barriles adicionales.
   - DK nunca desciende por debajo del jugador; si el jugador baja, DK queda en su posición.

   **Spawn de barriles:**
   - DK lanza un barril cada `max(0.8, 2.5 − score/5000)` segundos (se acelera con el score).
   - Barril spawn: `worldX = dk.worldX`, `worldY = dk.worldY + 40`.
   - `vx` inicial = ±(1.5 + score/8000) alternando dirección; `vy = 0`.
   - Los barriles ruedan por las vigas con misma pendiente; al llegar al borde, caen con gravedad.
   - Barril que cae > 200 px por debajo del `cameraY + 640` se destruye.

   **Scoring procedural:**
   - Punto de altura: cada 10 px que el jugador sube por encima de `highestY` → +1 pt.
     (Solo se puntúa al subir, nunca al bajar.)
   - Barril esquivado (saltado): +50 pts.
   - Barril destruido con mazo: +300 pts.
   - Supervivencia: cada 10 s de tiempo vivo → +100 pts (bonus de resistencia).
   - Hito de altura: cada 500 px de `highestY` → +500 pts (milestone bonus, mostrado como
     texto flotante en canvas durante 1 s).

   **Escalada de dificultad continua (sin niveles):**
   - `speed = 1 + score / 3000` (máximo efectivo ~3× a score=6000).
   - A `highestY > 1500` px: aparecen fireballs patrullando las vigas.
   - A `highestY > 3000` px: las vigas reducen su longitud media (más saltos de fe).
   - A `highestY > 5000` px: DK lanza 2 barriles a la vez.
   - Sin límite superior — la partida termina solo por pérdida de vidas.

   **Colisiones:**
   - AABB entre `player` y `barrels[]` / `fireballs[]` → vida perdida; `lives--`.
   - Si `lives > 0`: respawn del jugador en la última viga pisada (guardada en `lastSafePos`).
   - Floor snap: `player` se apoya en el borde superior de la viga más cercana por debajo.
   - Escalera: `player.onLadder = true` si el centro horizontal del jugador está dentro de
     `[ladder.worldX − 6, ladder.worldX + 6]` y el jugador está en rango vertical de la escalera.

   **HUD interno en canvas:**
   - Fila superior (y=8): "SCORE " + score en x=8; "LIVES " + ♥×lives en x=340.
   - Indicador de altura: `"ALT " + Math.abs(Math.floor(player.worldY / 10)) + "m"` en x=8, y=24.
   - Milestone bonus: texto flotante `"+500"` en magenta, posición canvas centrada, opacidad
     decrece de 1 a 0 en 1000 ms.

   **Bucle de juego:**
   - `requestAnimationFrame`; `update(dt)` solo si `!paused && state === 'playing'`.
   - `dt` cap a 50 ms.
   - `onScoreChange(score)` y `onLivesChange(lives)` emitidos cada vez que cambian
     (comparar con ref del valor anterior).
   - `onGameOver(score)` cuando `lives <= 0`.

   **Gestión de teclado:**
   - `document.addEventListener('keydown', handler)` y `keyup` en `useEffect`.
   - Teclas: `←` / `→` mover, `↑` subir escalera / saltar, `↓` bajar escalera, `Space` saltar.
   - `P` y `Escape` omitidos (pausa la controla la plataforma vía prop).
   - Limpieza de listeners en el `return` del `useEffect`.

   Verificación: el juego arranca en `/games/donkey-kong-endless/play`; el personaje sube,
   las plataformas se generan al volar, DK sube también.

3. **Crear `app/games/donkey-kong-endless/play/page.tsx`** — play-page específica:
   - Importa `DonkeyKongEndlessGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal de game over (`over === true`), lee `localStorage.getItem('av_player_name')`
     y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`:
     `{ game_id: 'donkey-kong-endless', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que
     `app/games/asteroids/play/page.tsx`.
   - HUD React muestra: SCORE, LIVES. (Sin campo LEVEL — esta variante no tiene niveles.)
     Verificación: el HUD React muestra los valores en tiempo real; tras una partida el score
     aparece en `/games/donkey-kong-endless` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript.
   Ninguna ruta existente devuelve 500.

---

## Descripción del render canvas

El `draw()` transforma todas las coordenadas de mundo a canvas restando `cameraY`.
Solo se dibujan elementos con `canvasY = worldY − cameraY` en rango `[−60, 700]`.

**Capa 1 — Fondo:**

- Degradado vertical dinámico: `createLinearGradient(0, 0, 0, 640)`.
  - `0%` → `#000010` (oscuro arriba, el cielo de la construcción).
  - `100%` → `#1a0a00` (oscuro abajo, el suelo lejano).
- Cada 300 px de altura de mundo: una línea horizontal tenue `rgba(255,255,255,0.04)` como
  indicador de piso de construcción.

**Capa 2 — Plataformas (vigas):**

- `fillStyle = '#c84820'`, rectángulo h=8 px con pendiente visual (transformación de contexto
  `save()/rotate(angle)/restore()`).
- Escaleras: dos líneas verticales `strokeStyle = '#888'`, `lineWidth = 5`, separadas 10 px,
  con travesaños horizontales cada 16 px.

**Capa 3 — Elementos interactivos:**

- Mazo: icono "T" amarillo `font = '16px monospace'`, parpadeante (visible / invisible cada 500 ms)
  cuando queda < 1 s de tiempo de mazo activo.
- Milestone bonus flotante: `fillStyle = '#ff006e'`, `font = '14px monospace'`,
  posición canvas centrada, `globalAlpha` decrece de 1 a 0 en 1 s.

**Capa 4 — Enemigos:**

- DK: rectángulo marrón 36×36 px con "DK" en blanco; durante la transición de subida, `globalAlpha`
  oscila entre 0.4 y 1 en 400 ms (efecto de teleportación retro).
- Barriles: elipse 14×10 px `fillStyle = '#8B4513'` con franja diagonal, rotación acumulada
  según `barrel.vx * dt`.
- Fireballs: círculo r=7 `fillStyle = '#ff4400'` con `shadowBlur=10, shadowColor='#ff8800'`.

**Capa 5 — Jugador:**

- Rectángulo 12×20 px `fillStyle = '#f5ff00'`.
- Cabeza: círculo r=5 `fillStyle = '#ffccaa'`.
- En subida de escalera: posición x centra sobre la escalera; animación de piernas (alternado
  offset ±2 px cada 120 ms).
- Mazo activo: línea "T" sobre la cabeza `strokeStyle='#aaa'`, `lineWidth=3`.
- Al morir: `globalAlpha` parpadea 4× en 600 ms antes de respawn o game over.

**Capa 6 — HUD canvas:**

- `fillStyle = '#fff'`, `font = '11px monospace'`, `textBaseline = 'top'`.
- y=8: `"SCORE " + score` en x=8; `"♥".repeat(lives)` en x=340, `fillStyle = '#ff006e'`.
- y=24: `"ALT " + altMeters + "m"` en x=8, `fillStyle = '#00f5ff'`.
- Milestone bonus flotante (ver capa 3 — mismo paso de draw).

**Scroll de cámara:**

- `cameraY` se actualiza en `update()`: si `player.worldY < cameraY + 200`, entonces
  `cameraY = player.worldY − 200` (cámara sube con el jugador).
- La cámara nunca baja (una vez que ha subido, no retrocede).

---

## Edge cases

- **Jugador cae por debajo de la viga más baja visible:** si `player.worldY > cameraY + 700`,
  el jugador muere instantáneamente (caída al vacío), `lives--`; respawn en `lastSafePos`.
- **Plataforma no alcanzable:** el algoritmo de generación garantiza alcanzabilidad, pero si
  por algún motivo no hay plataforma a ≤160 px sobre el jugador, se inserta una viga de emergencia
  de 160 px en `worldX=player.worldX − 80`.
- **DK fuera de pantalla:** DK puede estar varias pantallas por encima del jugador. Solo se
  dibuja si su `canvasY` está en rango visible; el spawn de barriles ocurre igualmente.
- **Barrel spawn fuera de pantalla:** los barriles se crean desde la posición de DK aunque
  no sea visible; se simulan hasta que entren en el rango `cameraY ± 800`.
- **Array overflow:** si `barrels.length >= 10`, DK no lanza hasta que haya menos de 10.
- **Score overflow visual:** si `score > 999999`, se muestra `"999999+"` en el HUD.
- **Tab oculto:** `dt` cap a 50 ms.
- **Pausa durante respawn:** si el prop `paused` llega a `true` durante la animación de muerte
  (600 ms), la animación se congela y reanuda al despausar.
- **Mazo activo al morir:** si el jugador muere con mazo activo, el mazo se cancela al respawnear.

---

## Estados del juego

| Estado     | Descripción                                                                  |
| ---------- | ---------------------------------------------------------------------------- |
| `idle`     | Pantalla de título: "ENDLESS CLIMB" + instrucciones + "ESPACIO PARA EMPEZAR" |
| `playing`  | Game loop activo; generación procedural en marcha                            |
| `paused`   | `update()` suspendido; `draw()` continúa con overlay oscuro semitransparente |
| `gameover` | `update()` detenido; `onGameOver(score)` disparado; modal React visible      |

Transiciones:

- `idle` → `playing` al pulsar Space.
- `playing` → `paused` cuando `paused prop = true`.
- `paused` → `playing` cuando `paused prop = false`.
- `playing` → `gameover` cuando `lives <= 0` (tras animación de muerte de 600 ms).

No hay estado `levelClear` — la partida es continua hasta que el jugador agota sus vidas.

---

## Integración con Supabase scores

El score final se inserta en la tabla `scores` desde `app/games/donkey-kong-endless/play/page.tsx`
con el cliente browser de Supabase (`lib/supabase/client.ts`):

```ts
await supabase.from('scores').insert({
  game_id: 'donkey-kong-endless',
  player_name: name,
  score: finalScore,
  user_id: null,
});
```

El leaderboard top 10 se lee en `app/games/donkey-kong-endless/page.tsx` (Server Component)
con el cliente server (`lib/supabase/server.ts`), ordenado por `score DESC, created_at ASC`.

---

## Acceptance criteria

- [ ] La card de DONKEY KONG ENDLESS CLIMB aparece en `/games`.
- [ ] `/games/donkey-kong-endless` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/donkey-kong-endless/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con ← → mover, ↑ subir / saltar, ↓ bajar, Space saltar.
- [ ] El mundo se desplaza hacia arriba siguiendo al jugador sin límite visible de altura.
- [ ] Se generan nuevas vigas y escaleras al vuelo cuando el jugador se acerca al borde superior generado.
- [ ] DK sube cuando el jugador se acerca a él y lanza barriles desde su nueva posición.
- [ ] Los barriles ruedan por las vigas generadas proceduralmente con pendiente aleatoria.
- [ ] La velocidad de barriles aumenta conforme sube el score.
- [ ] Las fireballs aparecen al superar los 1500 px de altura.
- [ ] El HUD interno del canvas muestra score, vidas y altitud en metros.
- [ ] Los milestone bonuses (+500 pts cada 500 px) aparecen como texto flotante en canvas.
- [ ] El HUD React de la plataforma refleja en tiempo real score y lives.
- [ ] El botón "PAUSA" congela el game loop; "REANUDAR" lo reanuda.
- [ ] Al agotar las 3 vidas, aparece el modal React de game over con la puntuación final.
- [ ] No hay overlay "GAME OVER" dibujado en canvas.
- [ ] Al morir con vidas restantes, el jugador reaparece en `lastSafePos` tras 600 ms de animación.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero (mundo nuevo, score 0, 3 vidas).
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/donkey-kong-endless` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para DONKEY KONG ENDLESS CLIMB.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLivesChange`, `onGameOver` cuando el estado cambia.
  Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/donkey-kong-endless/play/page.tsx`** — en lugar de
  modificar la ruta genérica `[id]/play`.
  Razón: evita condicionales en la ruta genérica; Next.js App Router da prioridad a rutas
  estáticas sobre dinámicas.

- **Sí: HUD doble (canvas + React)** — el HUD canvas incluye altitud en metros y milestones
  flotantes que solo tienen sentido dentro del contexto visual del juego; el HUD React expone
  score y lives para la plataforma.
  Razón: la altitud es información específica de la variante endless que no tiene equivalente
  directo en el HUD estándar de la plataforma.

- **Sí: Generación procedural con garantía de alcanzabilidad** — el algoritmo verifica que
  cada viga nueva es accesible desde la anterior (diferencia de x ≤ 120 px, diferencia de
  altura ≤ 160 px) antes de insertarla.
  Razón: un juego endless injugable por diseño de niveles roto destruiría la experiencia.

- **Sí: DK sigue al jugador hacia arriba** — a diferencia del classic donde DK es fijo,
  aquí DK asciende dinámicamente para mantener la presión constante.
  Razón: sin este comportamiento, una vez lejos de DK el juego pierde tensión.

- **Sí: Respawn en lugar de vuelta al inicio** — al perder una vida el jugador reaparece en
  `lastSafePos` (última viga pisada), no en el suelo.
  Razón: en un endless con scroll vertical no hay "suelo" al que volver; reiniciar al inicio
  sería penalizador hasta el punto de hacerlo injugable.

- **No: Campo `level` en HUD** — esta variante no tiene niveles; la progresión es continua
  por score y altura.
  Razón: exponer un campo sin valor semántico confundiría al jugador y al HUD de la plataforma.

- **No: Overlay "GAME OVER" en canvas** — el modal React lo reemplaza.
  Razón: coherencia con el patrón de la plataforma.

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06.
  Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos).
  Razón: se mitiga en el spec futuro de seguridad.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio.
  Razón: YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.

- **No: Sonidos** — fuera de alcance de este spec; pueden añadirse en un spec de audio futuro.

- **?: Cover CSS dedicado (`cover-dk`)** — se aplaza. Se usa `cover-bricks` como aproximación
  temática. Un `cover-dk` propio puede añadirse en un spec de UI futuro.
