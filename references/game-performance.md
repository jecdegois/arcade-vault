# Optimizaciones de performance

Registro de cobertura de las optimizaciones del patrón Frogger (spec 12). Actualizado por `@game-performance-booster` tras cada invocación.

| id          | bg offscreen | scanlines offscreen | HUD refs | shadowBlur agrupado | Notas                                                                             |
| ----------- | ------------ | ------------------- | -------- | ------------------- | --------------------------------------------------------------------------------- |
| `frogger`   | ✅           | ✅                  | ✅       | ✅                  | Implementado en spec 12 (2026-06-02). Play page dedicada con refs+textContent.    |
| `tetris`    | ✅           | ✅                  | ✅       | ✅                  | Optimizado 2026-06-02. Glow pass agrupado en draw(); bg+grid en offscreen canvas. |
| `arkanoid`  | ✅           | ✅                  | ✅       | ✅                  | Optimizado 2026-06-02. Glow pass al final de rama geométrica; HUD refs.           |
| `snake`     | ✅           | ✅                  | ✅       | ✅                  | Optimizado 2026-06-02. bg+grid offscreen; glow solo en head al final de draw().   |
| `asteroids` | ✅           | ✅                  | ✅       | ✅                  | Optimizado 2026-06-02. Glow pass por tipo (asteroids→bullets→ship) al final.      |
