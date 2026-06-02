# SPEC 12 — Performance de Frogger: React.memo + offscreen canvas

> **Estado:** Implementado
>
> **Depende de:** game-jam/frogger (implementación del juego)
>
> **Fecha:** 2026-06-02
>
> **Objetivo:** Eliminar re-renders innecesarios de React en el reproductor de Frogger y reducir el coste por frame del canvas draw cacheando el fondo estático y las scanlines retro a offscreen canvases.

---

## Scope

**In:**

- Convertir `score`, `lives` y `level` en `FroggerPlayPage` de `useState` a

  `useRef` + refs al nodo DOM del HUD; actualizarlos con `node.textContent`

  directamente desde los callbacks, sin disparar re-renders.
- Eliminar `React.memo` (ya no hace falta: `FroggerPlayPage` no re-renderiza

  durante el gameplay).
- Crear un offscreen canvas para el **fondo estático** (zonas de hierba, agua,

  carretera) — se renderiza una sola vez por skin y se vuelca con `drawImage`

  cada frame.
- Crear un offscreen canvas para el **overlay de scanlines** de la skin `retro`

  — se crea una sola vez al inicio.
- Refactorizar `draw()` para usar ambos offscreen canvases.
- Agrupar las operaciones de `shadowBlur` en la skin `neon`: una sola

  activación y una sola desactivación por llamada a `draw()`.

**Fuera de alcance:**

- Otros juegos (Asteroids, Tetris, Arkanoid, Snake).
- Mover la lógica del juego a un Web Worker.
- Cambios visuales en el HUD, layout del reproductor o skins.
- Optimizaciones de carga inicial o de red.

---

## Plan de implementación

1. **Convertir HUD state a refs en `FroggerPlayPage`** — reemplazar

  `useState` de `score`, `lives` y `level` por `useRef(0)` / `useRef(3)` /

   `useRef(1)`. Añadir refs DOM (`scoreElRef`, `livesElRef`, `levelElRef`)

   apuntando a los nodos del HUD. Los callbacks `onScoreChange`,

   `onLivesChange`, `onLevelChange` actualizarán `ref.current` y

   `domRef.current.textContent` directamente, sin `setState`.
2. **Mantener como `useState` solo lo estrictamente necesario** — `paused`,

  `over`, `saved`, `gameKey`, `skin` y `playerName` siguen siendo state

   porque condicionan el árbol JSX (mostrar modal, texto del botón, skin

   activa, etc.).
3. **Offscreen canvas del fondo** — al inicio del `useEffect` de

  `FroggerGame`, crear un canvas de `CANVAS_W × CANVAS_H`. Extraer el bucle

   de zonas a `buildBgCanvas(skin)`. Invalidar y reconstruir cuando

   `skinRef.current !== lastBuiltSkin`.
4. **Offscreen canvas de scanlines** — crear una sola vez al inicio del

  `useEffect`; no depende de la skin.
5. **Refactorizar `draw()`** — sustituir el bucle de zonas por

  `ctx.drawImage(bgCanvas, 0, 0)` y el bucle de scanlines por

   `ctx.drawImage(scanlineCanvas, 0, 0)`.
6. **Agrupar `shadowBlur` en neon** — activar `ctx.shadowBlur` una sola vez

  antes del primer objeto con glow; desactivar una sola vez al final.

---

## Criterios de aceptación

- [ ] En React DevTools Profiler, `FroggerPlayPage` no re-renderiza mientras
  ```
  la rana salta ni cuando cambia el score/lives/level durante el gameplay.
  ```
- [ ] `score`, `lives` y `level` no son `useState` en `FroggerPlayPage`.
- [ ] El HUD muestra valores actualizados en tiempo real (vía `textContent`).
- [ ] La skin `retro` vuelca scanlines con un único `drawImage` por frame.
- [ ] La skin `neon` tiene máximo 1 activación y 1 desactivación de
  ```
  `shadowBlur` por llamada a `draw()`.
  ```
- [ ] Cambiar skin durante el juego actualiza el fondo correctamente.
- [ ] No hay regresiones en colisiones, timer ni game over.

---

## Decisiones tomadas y descartadas

- `**useRef` + DOM directo en lugar de `React.memo`.** Memo solo evita que

  `FroggerGame` re-renderice; mover score/lives/level a refs evita que

  `FroggerPlayPage` re-renderice en absoluto durante el gameplay. Más efectivo

  y más coherente con el principio de minimizar `useState`.
- **Offscreen canvas en lugar de dirty-rect / partial redraw.** Dibujar solo

  las zonas que cambian es más complejo y frágil. Cachear el fondo completo y

  volcarlo con `drawImage` es una operación GPU-acelerada más simple y segura.
- **Sin Web Worker.** El bucle `requestAnimationFrame` queda en el hilo

  principal. Mover la lógica a un Worker requeriría serializar el estado en

  cada frame y añade complejidad desproporcionada al problema actual.
- **Offscreen canvas de scanlines creado una sola vez.** Las scanlines no

  dependen de la skin (mismo color, mismo pitch), así que no hay razón para

  reconstruirlas al cambiar de skin.

---

## Riesgos

- **Invalidación del bg offscreen al cambiar skin.** Si `draw()` no detecta

  el cambio de skin y reconstruye el canvas de fondo, se verá la skin anterior

  hasta el próximo rebuild. Mitigación: comparar `skinRef.current` con una

  variable `lastBuiltSkin` antes de cada `drawImage`; reconstruir si difieren.
- `**textContent` y nodos DOM nulos.** Si el HUD está oculto en móvil

  (`hidden md:block`), los refs DOM pueden apuntar a nodos no montados.

  Mitigación: guardar el valor en el ref de datos (`scoreRef.current`) y

  actualizar `textContent` solo si `domRef.current` existe.

