# Memoria — skin-designer

Bitácora de juegos a los que se han añadido/revisado skins. El agente lee esto al empezar y anexa al terminar. Evita repetir trabajo ya hecho.

## Historial

<!-- ## <fecha> — Juego: <id> → Skins: classic, neon, retro — Notas: ... -->

## 2026-06-01 — Juegos: asteroids, tetris, arkanoid, snake → Skins: classic, neon, retro — Notas: implementacion masiva de los 4 juegos en una sola invocacion. Skin via useRef para cambio en tiempo real sin reiniciar el loop. Selector segmentado en .hud-actions con persistencia localStorage (av*skin*<id>). Arkanoid: classic usa sprites PNG, neon/retro usan render geometrico alternativo. Todos incluyen scanlines en retro y shadowBlur/glow en neon.

## 2026-06-01 — Juego: frogger → Skins: classic, neon, retro — Notas: auditoria de implementacion ya existente; cumple patron canonico completo. FroggerSkin interface con campos semanticos (grass, water, road, frog, log, turtle, timerOk, timerLow, glow). skinRef para cambio en tiempo real sin reiniciar loop. neon: glow shadowBlur en rana, homes y timer bar. retro: scanlines cada 3px. Play page: selector segmentado en hud-actions, localStorage key av_skin_frogger, skin pasada como prop. Sin cambios de codigo necesarios.
