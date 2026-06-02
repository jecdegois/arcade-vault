'use client';

import { useEffect, useRef } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

const CELL = 32;
const COLS = 15;
const ROWS = 20;
const CANVAS_W = CELL * COLS; // 480
const CANVAS_H = CELL * ROWS; // 640
const TIMER_MAX = 30;

// Row indices in screen space (0 = top of canvas)
const DEST_ROW = 0;
const SAFE_TOP = 1;
const WATER_START = 2;
const WATER_END = 7;
const MEDIAN_ROW = 8;
const ROAD_START = 9;
const ROAD_END = 14;
const SAFE_BOT = 15;
const START_ROW = 18;

// Home column positions in the destination row
const HOME_COLS = [1, 4, 7, 10, 13];

// ── Skin system ───────────────────────────────────────────────────────────────

export type SkinId = 'classic' | 'neon' | 'retro';

interface FroggerSkin {
  bg: string;
  grass: string;
  water: string;
  road: string;
  frog: string;
  frogEye: string;
  log: string;
  turtle: string;
  homeEmpty: string;
  homeFilled: string;
  timerOk: string;
  timerLow: string;
  glow: boolean;
}

const SKINS: Record<SkinId, FroggerSkin> = {
  classic: {
    bg: '#0a1628',
    grass: '#2d5a20',
    water: '#0a2a4a',
    road: '#2a2a3a',
    frog: '#39ff14',
    frogEye: '#0a1628',
    log: '#8B4513',
    turtle: '#228B22',
    homeEmpty: '#1a4a1a',
    homeFilled: '#00ff88',
    timerOk: '#39ff14',
    timerLow: '#ff4444',
    glow: false,
  },
  neon: {
    bg: '#0a0a0f',
    grass: '#0a2a0a',
    water: '#001a3a',
    road: '#111120',
    frog: '#00f5ff',
    frogEye: '#0a0a0f',
    log: '#5a3010',
    turtle: '#00aa44',
    homeEmpty: '#001a10',
    homeFilled: '#00f5ff',
    timerOk: '#00f5ff',
    timerLow: '#ff006e',
    glow: true,
  },
  retro: {
    bg: '#001a00',
    grass: '#003300',
    water: '#001122',
    road: '#111100',
    frog: '#33ff33',
    frogEye: '#001a00',
    log: '#663300',
    turtle: '#115511',
    homeEmpty: '#002200',
    homeFilled: '#88ff44',
    timerOk: '#33ff33',
    timerLow: '#ffaa00',
    glow: false,
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Car {
  x: number;
  row: number;
  w: number;
  speed: number; // px/s, positive = L→R, negative = R→L
  color: string;
}

interface Platform {
  x: number;
  row: number;
  w: number;
  speed: number; // px/s, positive = L→R, negative = R→L
  type: 'log' | 'turtle';
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  skin = 'classic',
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useRef(paused);
  const onScoreRef = useRef(onScoreChange);
  const onLivesRef = useRef(onLivesChange);
  const onLevelRef = useRef(onLevelChange);
  const onGameOverRef = useRef(onGameOver);
  const skinRef = useRef<SkinId>(skin);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onScoreRef.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    onLivesRef.current = onLivesChange;
  }, [onLivesChange]);
  useEffect(() => {
    onLevelRef.current = onLevelChange;
  }, [onLevelChange]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);
  useEffect(() => {
    skinRef.current = skin;
  }, [skin]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // ── Offscreen canvas: static background ───────────────────────────────────
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = CANVAS_W;
    bgCanvas.height = CANVAS_H;
    const bgCtx = bgCanvas.getContext('2d')!;
    const bgState = { lastSkin: null as SkinId | null };

    // ── Offscreen canvas: retro scanlines (built once, skin-independent) ──────
    const scanlineCanvas = document.createElement('canvas');
    scanlineCanvas.width = CANVAS_W;
    scanlineCanvas.height = CANVAS_H;
    const slCtx = scanlineCanvas.getContext('2d')!;
    for (let y = 0; y < CANVAS_H; y += 3) {
      slCtx.fillStyle = 'rgba(0,0,0,0.15)';
      slCtx.fillRect(0, y, CANVAS_W, 1);
    }

    function buildBgCanvas(s: FroggerSkin) {
      // Zone backgrounds
      for (let r = 0; r < ROWS; r++) {
        let bg: string;
        if (r === DEST_ROW) bg = s.grass;
        else if (r === SAFE_TOP) bg = s.grass;
        else if (r >= WATER_START && r <= WATER_END) bg = s.water;
        else if (r === MEDIAN_ROW) bg = s.grass;
        else if (r >= ROAD_START && r <= ROAD_END) bg = s.road;
        else bg = s.grass;
        bgCtx.fillStyle = bg;
        bgCtx.fillRect(0, r * CELL, CANVAS_W, CELL);
      }
      // Road lane dividers
      bgCtx.setLineDash([6, 6]);
      bgCtx.strokeStyle = 'rgba(255,255,255,0.12)';
      bgCtx.lineWidth = 1;
      for (let r = ROAD_START; r <= ROAD_END; r++) {
        const y = r * CELL + CELL / 2;
        bgCtx.beginPath();
        bgCtx.moveTo(0, y);
        bgCtx.lineTo(CANVAS_W, y);
        bgCtx.stroke();
      }
      bgCtx.setLineDash([]);
      // Water ripple lines
      bgCtx.strokeStyle = 'rgba(100,160,255,0.18)';
      bgCtx.lineWidth = 1;
      for (let r = WATER_START; r <= WATER_END; r++) {
        const y = r * CELL + CELL / 2;
        bgCtx.beginPath();
        bgCtx.moveTo(0, y);
        bgCtx.lineTo(CANVAS_W, y);
        bgCtx.stroke();
      }
    }

    // ── Game state ────────────────────────────────────────────────────────────
    let score = 0;
    let lives = 3;
    let level = 1;
    let gameOverFired = false;

    // Frog: frogX is continuous px (left edge), frogRow is screen row
    let frogX = 7 * CELL;
    let frogRow = START_ROW;
    let timeLeft = TIMER_MAX;
    let lastTs = 0;
    let dying = false; // guard against re-entrant loseLife

    const homesFilled = [false, false, false, false, false];

    let cars: Car[] = [];
    let platforms: Platform[] = [];

    // ── Obstacle creation ─────────────────────────────────────────────────────
    function speedMul() {
      return 1 + (level - 1) * 0.3;
    }

    function initObstacles() {
      const m = speedMul();
      cars = [];

      // Road rows 9-14: alternating direction per lane
      const roadDefs = [
        { speed: -120, color: '#ff4444', count: 2, cw: 2 },
        { speed: 80, color: '#ffaa00', count: 3, cw: 1 },
        { speed: -100, color: '#ff6600', count: 2, cw: 2 },
        { speed: 140, color: '#ff2222', count: 2, cw: 2 },
        { speed: -70, color: '#ffcc00', count: 3, cw: 1 },
        { speed: 90, color: '#44aaff', count: 2, cw: 2 },
      ];
      roadDefs.forEach((d, i) => {
        const row = ROAD_START + i;
        const spacing = CANVAS_W / d.count;
        for (let j = 0; j < d.count; j++) {
          cars.push({
            x:
              j * spacing +
              (d.speed > 0 ? j * 20 : CANVAS_W - d.cw * CELL - j * 20),
            row,
            w: d.cw * CELL,
            speed: d.speed * m,
            color: d.color,
          });
        }
      });

      platforms = [];

      // Water rows 2-7: alternating direction
      const waterDefs = [
        { speed: 60, type: 'log' as const, count: 2, pw: 3 },
        { speed: -80, type: 'turtle' as const, count: 3, pw: 2 },
        { speed: 50, type: 'log' as const, count: 2, pw: 4 },
        { speed: -70, type: 'turtle' as const, count: 3, pw: 2 },
        { speed: 90, type: 'log' as const, count: 2, pw: 3 },
        { speed: -60, type: 'turtle' as const, count: 2, pw: 3 },
      ];
      waterDefs.forEach((d, i) => {
        const row = WATER_START + i;
        const spacing = CANVAS_W / d.count;
        for (let j = 0; j < d.count; j++) {
          platforms.push({
            x: j * spacing,
            row,
            w: d.pw * CELL,
            speed: d.speed * m,
            type: d.type,
          });
        }
      });
    }

    // ── Normalization helper ──────────────────────────────────────────────────
    function normX(x: number): number {
      return ((x % CANVAS_W) + CANVAS_W) % CANVAS_W;
    }

    // ── Frog helpers ──────────────────────────────────────────────────────────
    function resetFrog() {
      frogX = 7 * CELL;
      frogRow = START_ROW;
      timeLeft = TIMER_MAX;
      dying = false;
    }

    function loseLife() {
      if (dying || gameOverFired) return;
      dying = true;
      lives -= 1;
      onLivesRef.current(lives);
      if (lives <= 0) {
        gameOverFired = true;
        onGameOverRef.current(score);
        return;
      }
      resetFrog();
    }

    function getPlatformUnder(): Platform | null {
      if (frogRow < WATER_START || frogRow > WATER_END) return null;
      const fc = frogX + CELL / 2; // frog center
      for (const p of platforms) {
        if (p.row !== frogRow) continue;
        const px = normX(p.x);
        // No wrap case
        if (px + p.w <= CANVAS_W) {
          if (fc >= px && fc <= px + p.w) return p;
        } else {
          // Wraps around screen edge
          const overW = px + p.w - CANVAS_W;
          if (fc >= px || fc <= overW) return p;
        }
      }
      return null;
    }

    function checkCarCollision() {
      if (frogRow < ROAD_START || frogRow > ROAD_END) return;
      const fl = frogX + 4;
      const fr = frogX + CELL - 4;
      for (const car of cars) {
        if (car.row !== frogRow) continue;
        const cx = normX(car.x);
        const cr = cx + car.w;
        if (cr <= CANVAS_W) {
          if (fl < cr && fr > cx) {
            loseLife();
            return;
          }
        } else {
          const overW = cr - CANVAS_W;
          if (fl < overW || fr > cx) {
            loseLife();
            return;
          }
        }
      }
    }

    // ── Move frog (discrete, one cell at a time) ──────────────────────────────
    function moveFrog(dc: number, dr: number) {
      if (gameOverFired || dying) return;

      const newX = frogX + dc * CELL;
      const newRow = frogRow + dr;

      if (newX < 0 || newX + CELL > CANVAS_W) return;
      if (newRow < 0 || newRow >= ROWS) return;

      if (dr < 0) {
        score += 10;
        onScoreRef.current(score);
      }

      frogX = newX;
      frogRow = newRow;

      // Landing on destination row
      if (frogRow === DEST_ROW) {
        const col = Math.round(frogX / CELL);
        const hi = HOME_COLS.indexOf(col);
        if (hi === -1 || homesFilled[hi]) {
          loseLife();
          return;
        }
        homesFilled[hi] = true;
        const timeBonus = Math.floor(timeLeft) * 10;
        score += 50 + timeBonus;
        onScoreRef.current(score);

        if (homesFilled.every(Boolean)) {
          score += 200;
          onScoreRef.current(score);
          level += 1;
          onLevelRef.current(level);
          homesFilled.fill(false);
          initObstacles();
        }
        resetFrog();
        return;
      }

      // Immediate collision after jump
      if (frogRow >= WATER_START && frogRow <= WATER_END) {
        if (!getPlatformUnder()) loseLife();
      } else if (frogRow >= ROAD_START && frogRow <= ROAD_END) {
        checkCarCollision();
      }
    }

    // ── Game update ───────────────────────────────────────────────────────────
    function update(dt: number) {
      if (gameOverFired) return;

      for (const car of cars) car.x += car.speed * dt;
      for (const p of platforms) p.x += p.speed * dt;

      // Drag frog with platform
      if (frogRow >= WATER_START && frogRow <= WATER_END) {
        const plat = getPlatformUnder();
        if (plat) {
          frogX += plat.speed * dt;
          if (frogX < -CELL / 2 || frogX + CELL > CANVAS_W + CELL / 2) {
            loseLife();
            return;
          }
          // Clamp to canvas
          frogX = Math.max(-CELL + 1, Math.min(CANVAS_W - 1, frogX));
        } else {
          loseLife();
          return;
        }
      }

      // Continuous car collision check
      if (frogRow >= ROAD_START && frogRow <= ROAD_END) {
        checkCarCollision();
      }

      // Timer countdown
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        loseLife();
      }
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
      const currentSkin = skinRef.current;
      const s = SKINS[currentSkin];

      // Rebuild bg offscreen canvas when skin changes, then blit
      if (currentSkin !== bgState.lastSkin) {
        buildBgCanvas(s);
        bgState.lastSkin = currentSkin;
      }
      ctx.drawImage(bgCanvas, 0, 0);

      // Retro scanlines: single drawImage from prebuilt offscreen canvas
      if (currentSkin === 'retro') {
        ctx.drawImage(scanlineCanvas, 0, 0);
      }

      // Platforms (logs and turtles) — no glow
      for (const p of platforms) {
        const px = normX(p.x);
        const py = p.row * CELL;
        ctx.fillStyle = p.type === 'log' ? s.log : s.turtle;

        const drawPlatRect = (lx: number, lw: number) => {
          ctx.fillRect(lx, py + 3, lw, CELL - 6);
          ctx.fillStyle =
            p.type === 'log'
              ? 'rgba(255,200,150,0.25)'
              : 'rgba(150,255,150,0.25)';
          for (let seg = 0; seg < Math.floor(lw / CELL); seg++) {
            ctx.fillRect(lx + seg * CELL + 4, py + 7, CELL - 8, CELL - 14);
          }
          ctx.fillStyle = p.type === 'log' ? s.log : s.turtle;
        };

        if (px + p.w <= CANVAS_W) {
          drawPlatRect(px, p.w);
        } else {
          const overW = px + p.w - CANVAS_W;
          drawPlatRect(px, CANVAS_W - px);
          drawPlatRect(0, overW);
        }
      }

      // Cars — no glow
      for (const car of cars) {
        const cx = normX(car.x);
        const cy = car.row * CELL;

        const drawCar = (lx: number, lw: number) => {
          if (lw <= 0) return;
          ctx.fillStyle = car.color;
          ctx.fillRect(lx + 1, cy + 6, lw - 2, CELL - 12);
          ctx.fillStyle = 'rgba(180,220,255,0.55)';
          ctx.fillRect(lx + 3, cy + 8, Math.max(lw / 3, 4), CELL - 16);
        };

        if (cx + car.w <= CANVAS_W) {
          drawCar(cx, car.w);
        } else {
          drawCar(cx, CANVAS_W - cx);
          drawCar(0, cx + car.w - CANVAS_W);
        }
      }

      // Destination homes base (no glow)
      for (let i = 0; i < HOME_COLS.length; i++) {
        const hx = HOME_COLS[i] * CELL;
        const hy = DEST_ROW * CELL;
        ctx.fillStyle = homesFilled[i] ? s.homeFilled : s.homeEmpty;
        ctx.fillRect(hx + 2, hy + 2, CELL - 4, CELL - 4);
        ctx.fillStyle = homesFilled[i]
          ? 'rgba(255,255,255,0.3)'
          : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(hx + CELL / 2, hy + CELL / 2, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Frog position (used both in non-glow and glow sections)
      let frogFx = 0;
      let frogFy = 0;
      if (!gameOverFired) {
        frogFy = frogRow * CELL;
        frogFx = Math.max(0, Math.min(CANVAS_W - CELL, frogX));
        // Frog body — non-neon only
        if (!s.glow) {
          ctx.fillStyle = s.frog;
          ctx.fillRect(frogFx + 4, frogFy + 5, CELL - 8, CELL - 10);
        }
      }

      // Timer bar background (always) + bar (non-neon only)
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, CANVAS_H - 7, CANVAS_W, 7);
      if (!s.glow) {
        const barW = (Math.max(0, timeLeft) / TIMER_MAX) * CANVAS_W;
        ctx.fillStyle = timeLeft > 10 ? s.timerOk : s.timerLow;
        ctx.fillRect(0, CANVAS_H - 7, barW, 7);
      }

      // ── Neon glow pass — ONE activation, ONE deactivation ──────────────────
      if (s.glow) {
        ctx.shadowBlur = 12; // ← single activation
        // Filled homes glow arcs
        ctx.shadowColor = s.homeFilled;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        for (let i = 0; i < HOME_COLS.length; i++) {
          if (!homesFilled[i]) continue;
          ctx.beginPath();
          ctx.arc(
            HOME_COLS[i] * CELL + CELL / 2,
            DEST_ROW * CELL + CELL / 2,
            7,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        // Frog body glow
        if (!gameOverFired) {
          ctx.shadowColor = s.frog;
          ctx.fillStyle = s.frog;
          ctx.fillRect(frogFx + 4, frogFy + 5, CELL - 8, CELL - 10);
        }
        // Timer bar glow (value change, still active)
        ctx.shadowBlur = 6;
        const barW = (Math.max(0, timeLeft) / TIMER_MAX) * CANVAS_W;
        ctx.shadowColor = timeLeft > 10 ? s.timerOk : s.timerLow;
        ctx.fillStyle = timeLeft > 10 ? s.timerOk : s.timerLow;
        ctx.fillRect(0, CANVAS_H - 7, barW, 7);
        ctx.shadowBlur = 0; // ← single deactivation
      }

      // Frog eyes + legs (always drawn after glow reset — never glowing)
      if (!gameOverFired) {
        ctx.fillStyle = s.frogEye;
        ctx.fillRect(frogFx + 6, frogFy + 7, 4, 4);
        ctx.fillRect(frogFx + CELL - 10, frogFy + 7, 4, 4);
        ctx.fillStyle = s.frog;
        ctx.fillRect(frogFx + 1, frogFy + 14, 4, 8);
        ctx.fillRect(frogFx + CELL - 5, frogFy + 14, 4, 8);
      }
    }

    // ── Keyboard ──────────────────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (pausedRef.current || gameOverFired) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          moveFrog(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          moveFrog(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          moveFrog(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          moveFrog(1, 0);
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // ── Game loop ─────────────────────────────────────────────────────────────
    let rafId: number;

    function loop(ts: number) {
      if (!lastTs) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;

      if (!pausedRef.current) update(dt);
      draw();

      if (!gameOverFired) rafId = requestAnimationFrame(loop);
    }

    // ── Boot ──────────────────────────────────────────────────────────────────
    initObstacles();
    resetFrog();
    onLivesRef.current(3);
    onScoreRef.current(0);
    onLevelRef.current(1);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        display: 'block',
        margin: '0 auto',
        background: SKINS[skin].bg,
      }}
    />
  );
}
