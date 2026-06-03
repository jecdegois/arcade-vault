# Memoria — game-performance-booster

Bitácora de juegos a los que se han aplicado las optimizaciones de performance del patrón Frogger (spec 12). El agente lee esto al empezar y anexa al terminar. Evita repetir trabajo ya hecho.

## Historial

## 2026-06-02 — Juego: tetris — bg offscreen, scanlines offscreen, HUD refs, shadowBlur agrupado

- TetrisGame.tsx: bgCanvas + scanlineCanvas; drawBlock sin shadowBlur; glow pass al final de draw()
- tetris/play/page.tsx: score/lines/level → useRef+textContent

## 2026-06-02 — Juego: arkanoid — bg offscreen, scanlines offscreen, HUD refs, shadowBlur agrupado

- ArkanoidGame.tsx: bgCanvas + scanlineCanvas; drawGeomBlock/Paddle/Ball sin shadowBlur; glow pass agrupado al final de rama geométrica
- arkanoid/play/page.tsx: score/lives/level → useRef+textContent

## 2026-06-02 — Juego: snake — bg offscreen, scanlines offscreen, HUD refs, shadowBlur agrupado

- SnakeGame.tsx: bgCanvas (fondo+grid) + scanlineCanvas; shadowBlur eliminado del forEach; glow pass solo en head al final
- snake/play/page.tsx: score/level → useRef+textContent

## 2026-06-02 — Juego: asteroids — bg offscreen, scanlines offscreen, HUD refs, shadowBlur agrupado

- AsteroidsGame.tsx: bgCanvas + scanlineCanvas; shadowBlur eliminado de Bullet/Asteroid/Ship.draw(); glow pass por tipo al final de draw()
- asteroids/play/page.tsx: score/lives/level → useRef+textContent
