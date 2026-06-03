# SPEC — Integración del juego DONKEY KONG CLASSIC (Game Jam)

> **Estado:** Borrador
> **Depende de:** 06-games-table-leaderboard-supabase
> **Fecha:** 2026-06-02
> **Tema del game jam:** Donkey Kong
> **Objetivo:** Integrar DONKEY KONG CLASSIC como juego jugable en Arcade Vault, construyendo el canvas desde cero y conectando el leaderboard de Supabase.

---

## Scope

**In:**

- Insertar la fila `donkey-kong-classic` en la tabla `games` de Supabase (seed manual via SQL).
- Crear `app/components/games/DonkeyKongClassicGame.tsx` — componente React que encapsula
  el canvas de 768×576. Acepta props: `paused`, `onScoreChange`, `onLivesChange`,
  `onLevelChange`, `onGameOver`.
- Crear `app/games/donkey-kong-classic/play/page.tsx` — play-page específica.
  Gestiona el estado (score, lives, level, pausa, game over) y pasa callbacks al componente canvas.
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
- Cover CSS dedicado para plataformas/barril — se reutiliza `cover-bricks` (evoca escaleras y
  andamios de construcción); añadir un `cover-dk` queda fuera de alcance de este spec.
- Sprites/assets gráficos reales del arcade original — todo se dibuja con primitivas canvas 2D.
- Sonidos — fuera de alcance de este spec.

---

## Data model

### Seed en Supabase — tabla `games`

Ejecutar en el SQL Editor de Supabase:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES (
  'donkey-kong-classic',
  'DONKEY KONG CLASSIC',
  'Escala la obra y salva a la chica del gorila.',
  'Sube por las vigas inclinadas esquivando barriles que lanza el gorila desde lo alto. Salta, usa el mazo y gana puntos antes de llegar a la cumbre. Fiel al arcade de 1981: 4 pantallas, vidas y aumento de dificultad por nivel.',
  'ARCADE', 'cover-bricks', 'yellow'
);
```

### Props del componente `DonkeyKongClassicGame`

```ts
interface DonkeyKongClassicGameProps {
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

1. **Seed en Supabase** — ejecutar el INSERT de la fila `donkey-kong-classic` en el SQL Editor.
   Verificación: la card de DONKEY KONG CLASSIC aparece en `/games`.

2. **Crear `app/components/games/DonkeyKongClassicGame.tsx`** — componente `"use client"` que:

   **Canvas y layout:**
   - Renderiza un `<canvas>` de 768×576, referenciado con `useRef<HTMLCanvasElement>`.
   - Fondo negro; paleta retro (amarillo `#f5ff00`, rojo `#ff4444`, blanco, gris).

   **Estructuras de datos del estado:**
   - `player`: `{ x, y, vx, vy, onGround, hasHammer, hammerTimer, facingRight }`.
   - `barrels[]`: `{ x, y, vx, vy, onFloor, rolling }` — máximo 8 simultáneos.
   - `fireballs[]`: `{ x, y, vx, vy }` — aparecen a partir del nivel 3.
   - `platforms[]`: precalculadas al iniciar el nivel; cada elemento `{ x, y, w, h, slopeDir }`.
   - `ladders[]`: `{ x, y, h }`.
   - `hammers[]`: `{ x, y, active }` — 2 por nivel.
   - `dk`: `{ x, y, animFrame }` — Donkey Kong en lo alto.
   - `pauline`: `{ x, y }` — objetivo en la cumbre.
   - `state`: `'idle' | 'playing' | 'paused' | 'levelClear' | 'gameover'`.
   - `score`, `lives` (inicia en 3), `level` (inicia en 1, max 4).

   **Mecánicas del juego (4 pantallas clásicas, nivel mapeado cíclicamente):**

   _Nivel 1 — Girders:_
   - 8 vigas inclinadas (~3° de pendiente) distribuidas verticalmente; 4 escaleras verticales.
   - DK en lo alto lanza barriles cada 2-3 s (aleatoriamente), que ruedan por las vigas y caen
     por los bordes; velocidad base 2 px/frame, aumenta 0.3 px por level.
   - El jugador sube por escaleras (↑ / ↓), camina por vigas (← / →) y salta (Space o ↑ fuera
     de escalera). Gravedad constante 0.4 px²/frame.
   - Saltar barril: +100 pts. Llegar a Pauline: +300 pts + bonus de tiempo.
   - Mazo: activo 5 s; destruye barriles (+500 pts cada uno); el jugador no puede subir escaleras
     mientras lo sostiene.

   _Nivel 2 — Pie Factory (cintas):_
   - 3 cintas transportadoras horizontales; dirección alterna por fila; velocidad 1.5 px/frame.
   - Barriles en llamas (fireballs) patrullan las cintas; velocidad 2 px/frame.
   - Subida por escaleras en los extremos.

   _Nivel 3 — Elevators:_
   - 6 plataformas móviles verticales (elevadores); oscilan entre y_min e y_max ±80 px.
   - DK lanza remos (springs) adicionales que rebotan con física simplificada.
   - Fireballs deambulando.

   _Nivel 4 — Rivets:_
   - Plataformas horizontales fijas; 4 pilares con 2 remaches (rivets) cada uno.
   - Al recoger los 8 remaches, el andamio colapsa y DK cae: screen cleared.
   - No hay barriles; fireballs aumentadas.

   _Progresión:_ tras completar nivel 4, el ciclo vuelve a nivel 1 con velocidad base +0.3 px/frame
   (máximo 3 ciclos visibles; tras el 3.º, el juego no puede ganar — solo perder vidas).

   **Colisiones:**
   - AABB estricto entre `player` y `barrels[]` / `fireballs[]` → pierde vida; `lives--`.
   - AABB entre `player` y `platforms[]` con corrección de posición (floor snap).
   - AABB entre `player` y `ladders[]` para habilitar movimiento vertical.
   - Barril que cae fuera del canvas (y > 576) se destruye.

   **Scoring detallado:**
   - Barril esquivado (pasa por debajo al saltar): +100 pts.
   - Barril destruido con mazo: +500 pts.
   - Remache recogido (nivel 4): +100 pts.
   - Llegar a Pauline: +300 pts + `bonusTimer * 10` pts (bonusTimer cuenta desde 5000 ms al inicio).
   - Cada nivel completado: bonus fijo +1000 pts.

   **HUD interno en canvas** (dibujado en draw() cada frame):
   - Fila superior (y=12): "SCORE" + valor, "HI-SCORE" (máximo local, no persistido), "LEVEL".
   - Iconos de corazón (♥) para las vidas restantes, esquina inferior izquierda.
   - BonusTimer como barra horizontal debajo del HUD de score.

   **Bucle de juego:**
   - `useEffect` con `requestAnimationFrame`; `update(dt)` solo se llama si `!paused && state === 'playing'`; `draw()` se llama siempre.
   - `dt` = tiempo transcurrido en ms (capped a 50 ms para evitar saltos al cambiar de pestaña).
   - Callbacks: `onScoreChange(score)`, `onLivesChange(lives)`, `onLevelChange(level)` emitidos
     cada vez que el valor cambia (comparar con ref del valor anterior antes de emitir).
   - `onGameOver(score)` cuando `lives <= 0` (state → `'gameover'`).

   **Gestión de teclado:**
   - `document.addEventListener('keydown', handler)` y `keyup` registrados en `useEffect`.
   - Teclas: `←` / `→` mover, `↑` subir escalera / saltar, `↓` bajar escalera, `Space` saltar.
   - Las teclas `P` y `Escape` se omiten (pausa la controla la plataforma vía prop).
   - Limpieza de listeners en el `return` del `useEffect`.

   Verificación: el juego arranca en `/games/donkey-kong-classic/play`; el personaje se mueve,
   los barriles ruedan, el salto funciona.

3. **Crear `app/games/donkey-kong-classic/play/page.tsx`** — play-page específica:
   - Importa `DonkeyKongClassicGame` con `dynamic(..., { ssr: false })`.
   - Estado local: `score`, `lives`, `level`, `paused`, `over`, `name`, `saved`, `gameKey`.
   - Al montar el modal de game over (`over === true`), lee `localStorage.getItem('av_player_name')`
     y pre-rellena el campo `name`.
   - Al confirmar, persiste el nombre en `av_player_name` e inserta en `scores`:
     `{ game_id: 'donkey-kong-classic', player_name: name, score, user_id: null }`.
   - Marca `saved: true` para deshabilitar el botón y evitar doble inserción.
   - Reutiliza el mismo layout visual (HUD React + CRT + modal game over) que
     `app/games/asteroids/play/page.tsx`.
   - HUD React muestra: SCORE, LIVES, LEVEL.
     Verificación: el HUD React muestra los valores en tiempo real; tras una partida el score
     aparece en `/games/donkey-kong-classic` y en `/hall-of-fame` al recargar.

4. **Verificación final** — `npm run build` completa sin errores de TypeScript.
   Ninguna ruta existente devuelve 500.

---

## Descripción del render canvas

El `draw()` se ejecuta cada frame independientemente del estado de pausa.

**Capa 1 — Fondo:**

- `fillRect(0, 0, 768, 576)` negro.
- Línea de suelo (y=550): `strokeStyle = '#555'`, `lineWidth = 2`.

**Capa 2 — Plataformas (vigas):**

- Cada plataforma: `fillStyle = '#c84820'` (naranja ladrillo), rectángulo con altura 8 px y
  ligero degradado izquierda/derecha para simular pendiente.
- Escaleras: líneas verticales `strokeStyle = '#888'`, `lineWidth = 6`, separadas 12 px.

**Capa 3 — Elementos interactivos:**

- Hammers: icono "T" en amarillo, `font = '18px monospace'`.
- Remaches (nivel 4): círculos `fillStyle = '#ffcf3a'` r=5.
- Pauline: silueta minimalista en magenta (`#ff006e`), 12×20 px.

**Capa 4 — Enemigos:**

- DK: rectángulo marrón 40×40 px con "DK" en blanco; animación de brazo: alterna posición
  cada 400 ms (flip offset de ±4 px en x).
- Barriles: `fillStyle = '#8B4513'`, elipse 16×12 px con franja diagonal `#fff` simulando
  la textura; rotación incremental según `barrel.vx`.
- Fireballs: círculo `fillStyle = '#ff4400'` r=8 con halo `shadowBlur=8, shadowColor='#ff8800'`.

**Capa 5 — Jugador:**

- Rectángulo 14×22 px `fillStyle = '#f5ff00'` (overol amarillo).
- Cabeza: círculo r=6 `fillStyle = '#ffccaa'`.
- Mientras tiene mazo: línea diagonal sobre la cabeza `strokeStyle='#888'`, `lineWidth=3`.
- Al morir: animación de 4 frames (giro) durante 600 ms antes de reaparecer o mostrar game over.

**Capa 6 — HUD canvas:**

- `fillStyle = '#fff'`, `font = '12px monospace'`, `textBaseline = 'top'`.
- Fila y=8: `"SCORE " + score` en x=10; `"HI " + hiScore` en x=300; `"LVL " + level` en x=660.
- Vidas: ♥ repetido `lives` veces a partir de x=10, y=558.
- Barra de bonus: `fillStyle = '#00f5ff'`, rectángulo de ancho proporcional a `bonusTimer/5000 * 200`
  en x=270, y=560, h=6.

**Estado `'paused'`:** `draw()` dibuja todo y superpone `fillStyle='rgba(0,0,0,0.55)'` +
texto `"PAUSA"` centrado. (El modal de pausa real lo gestiona la plataforma; esto es solo
el oscurecimiento del canvas.)

**Estado `'levelClear'`:** texto "¡NIVEL COMPLETADO!" parpadeante centrado, durante 1800 ms
antes de cargar el siguiente nivel.

---

## Edge cases

- **Jugador en borde de viga:** si `player.x < 0` o `player.x > 768`, el jugador reaparece
  en el lado opuesto (wrap horizontal, como en el arcade original).
- **Barril fuera de canvas:** si `barrel.y > 600`, se elimina del array y no puntúa.
- **Barrel spawn rate overflow:** si `barrels.length >= 8`, DK no lanza uno nuevo hasta que
  haya menos de 8.
- **Hammer timer:** si el jugador cae a un nivel inferior con el mazo activo, el mazo se
  cancela inmediatamente (no hay mazo en caída libre).
- **Lives a 0 con animación pendiente:** la animación de muerte dura 600 ms; si `lives <= 0`
  al terminar, se llama `onGameOver(score)` — no se permite reinicio hasta que el modal aparece.
- **Pausa durante levelClear:** se ignora el input de pausa durante la transición de 1800 ms.
- **Tab oculto:** `dt` se cap a 50 ms para evitar que al volver a la pestaña los enemigos
  hagan un salto de posición enorme.
- **Nivel 4 sin barriles:** si llega algún barrel del nivel anterior al iniciar nivel 4,
  el array se vacía al entrar en el nivel.

---

## Estados del juego

| Estado       | Descripción                                                              |
| ------------ | ------------------------------------------------------------------------ |
| `idle`       | Pantalla de título: "DONKEY KONG CLASSIC" + "PULSA ESPACIO PARA EMPEZAR" |
| `playing`    | Game loop activo; `update()` + `draw()` cada frame                       |
| `paused`     | `update()` suspendido; `draw()` continúa con overlay oscuro              |
| `levelClear` | Animación de 1800 ms; ni `update()` ni input aceptado                    |
| `gameover`   | `update()` detenido; `onGameOver(score)` disparado; modal React visible  |

Transiciones:

- `idle` → `playing` al pulsar Space.
- `playing` → `paused` cuando `paused prop = true`.
- `paused` → `playing` cuando `paused prop = false`.
- `playing` → `levelClear` al contactar con Pauline (o al recoger todos los remaches en nivel 4).
- `levelClear` → `playing` tras 1800 ms (cargando siguiente nivel).
- `playing` → `gameover` cuando `lives <= 0`.

---

## Integración con Supabase scores

El score final se inserta en la tabla `scores` desde `app/games/donkey-kong-classic/play/page.tsx`
con el cliente browser de Supabase (`lib/supabase/client.ts`):

```ts
await supabase.from('scores').insert({
  game_id: 'donkey-kong-classic',
  player_name: name,
  score: finalScore,
  user_id: null,
});
```

El leaderboard top 10 se lee en `app/games/donkey-kong-classic/page.tsx` (Server Component)
con el cliente server (`lib/supabase/server.ts`), ordenado por `score DESC, created_at ASC`.

---

## Acceptance criteria

- [ ] La card de DONKEY KONG CLASSIC aparece en `/games`.
- [ ] `/games/donkey-kong-classic` carga con los datos reales del juego y el leaderboard top 10.
- [ ] `/games/donkey-kong-classic/play` carga sin errores de SSR ni de TypeScript.
- [ ] El canvas renderiza el juego y es jugable con ← → mover, ↑ subir / saltar, ↓ bajar, Space saltar.
- [ ] El HUD interno del canvas muestra score, hi-score, level, vidas y barra de bonus.
- [ ] El HUD React de la plataforma refleja en tiempo real score, lives y level.
- [ ] Los barriles ruedan por las vigas con pendiente y caen cuando llegan al borde.
- [ ] El mazo recogido destruye barriles durante 5 s; al expirar, el personaje vuelve al modo normal.
- [ ] Llegar a Pauline completa el nivel y carga el siguiente con velocidad incrementada.
- [ ] El nivel 4 con remaches termina al recoger los 8 remaches.
- [ ] El botón "PAUSA" congela el game loop; "REANUDAR" lo reanuda.
- [ ] Al agotar las 3 vidas, aparece el modal React de game over con la puntuación final.
- [ ] No hay overlay "GAME OVER" dibujado en canvas.
- [ ] El botón "JUGAR DE NUEVO" reinicia la partida desde cero (nivel 1, 3 vidas, score 0).
- [ ] Al abrir el modal, el campo de nombre se pre-rellena con `av_player_name` de localStorage si existe.
- [ ] Al confirmar, el score se inserta en Supabase y el nombre se persiste en localStorage.
- [ ] El botón "GUARDAR PUNTUACIÓN" se deshabilita tras el primer envío (sin doble inserción).
- [ ] El score guardado aparece en `/games/donkey-kong-classic` y en `/hall-of-fame` al recargar.
- [ ] Cuando no hay scores, el leaderboard muestra "Sé el primero en entrar al salón de la fama".
- [ ] `/hall-of-fame` muestra un tab para DONKEY KONG CLASSIC.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: Callbacks como interfaz de comunicación** — el componente canvas llama a
  `onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver` cuando el estado cambia.
  Razón: desacoplamiento limpio; el juego no sabe nada de React ni de la plataforma.

- **Sí: `dynamic(..., { ssr: false })`** — el componente canvas se carga solo en cliente.
  Razón: `canvas` y `requestAnimationFrame` no existen en el entorno Node.js de Next.js SSR.

- **Sí: Play-page específica `app/games/donkey-kong-classic/play/page.tsx`** — en lugar de
  modificar la ruta genérica `[id]/play`.
  Razón: evita condicionales en la ruta genérica; Next.js App Router da prioridad a rutas
  estáticas sobre dinámicas.

- **Sí: HUD doble (canvas + React)** — el HUD del canvas dibuja score/lives/level con primitivas
  propias (incluyendo barra de bonus y hi-score); el HUD React de la plataforma muestra los
  mismos valores vía callbacks.
  Razón: el HUD canvas es parte de la experiencia retro del juego (posición dentro de la
  pantalla CRT); el HUD React es necesario para integraciones futuras de la plataforma.

- **Sí: 4 pantallas clásicas como 4 niveles** — se replican las 4 fases del arcade original
  (Girders, Pie Factory, Elevators, Rivets) como niveles 1-4 con ciclo repetible.
  Razón: fidelidad al referente; cada pantalla aporta mecánica distinta.

- **Sí: Construcción desde cero con primitivas canvas 2D** — sin sprites externos.
  Razón: no existen assets libres del juego original incluidos en `references/`; las primitivas
  son suficientes para un arcade retro reconocible.

- **No: Overlay "GAME OVER" en canvas** — el modal React lo reemplaza.
  Razón: coherencia con el patrón de la plataforma (Tetris, Arkanoid, Snake).

- **No: Crear tablas nuevas por juego** — se reutilizan `games` y `scores` del spec 06.
  Razón: el modelo es suficientemente genérico para cualquier juego con score numérico.

- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos).
  Razón: se mitiga en el spec futuro de seguridad.

- **No: Componente genérico `CanvasGame`** — cada juego tiene su componente propio.
  Razón: YAGNI; generalizar ahora sería abstraer sin caso de uso suficientemente confirmado.

- **No: Sonidos** — fuera de alcance de este spec; pueden añadirse en un spec de audio futuro.

- **?: Cover CSS dedicado (`cover-dk`)** — se aplaza. Se usa `cover-bricks` como aproximación
  temática. Un `cover-dk` propio (gorila + barril + viga) puede añadirse en un spec de UI futuro.
