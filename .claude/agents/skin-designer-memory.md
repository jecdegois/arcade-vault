# Memoria — skin-designer

Bitácora de juegos a los que se han añadido/revisado skins. El agente lee esto al empezar y anexa al terminar. Evita repetir trabajo ya hecho.

## Historial

<!-- ## <fecha> — Juego: <id> → Skins: classic, neon, retro — Notas: ... -->

## 2026-06-01 — Juegos: asteroids, tetris, arkanoid, snake → Skins: classic, neon, retro — Notas: implementacion masiva de los 4 juegos en una sola invocacion. Skin via useRef para cambio en tiempo real sin reiniciar el loop. Selector segmentado en .hud-actions con persistencia localStorage (av*skin*<id>). Arkanoid: classic usa sprites PNG, neon/retro usan render geometrico alternativo. Todos incluyen scanlines en retro y shadowBlur/glow en neon.
