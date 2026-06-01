'use client';

import { useEffect, useRef } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

const CELL = 40;
const COLS = 20;
const ROWS = 20;
const CANVAS_W = CELL * COLS; // 800
const CANVAS_H = CELL * ROWS; // 800
const BASE_INTERVAL = 150;
const MIN_INTERVAL = 60;
const INTERVAL_STEP = 10;
const SCORE_PER_FRUIT = 10;
const POINTS_PER_LEVEL = 50;

// ── Skin system ───────────────────────────────────────────────────────────────

export type SkinId = 'classic' | 'neon' | 'retro';

interface SnakeSkin {
  bg: string;
  grid: string;
  headColor: string;
  // body gradient from-to (head→tail)
  bodyFrom: [number, number, number];
  bodyTo: [number, number, number];
  eyeColor: string;
  fruitFallback: string;
  glow: boolean;
  glowColor: string;
}

const SKINS: Record<SkinId, SnakeSkin> = {
  classic: {
    bg: '#0a1628',
    grid: 'rgba(255,255,255,0.04)',
    headColor: '#39ff14',
    bodyFrom: [57, 255, 20],
    bodyTo: [20, 110, 10],
    eyeColor: '#0a1628',
    fruitFallback: '#ff4d6a',
    glow: false,
    glowColor: '',
  },
  neon: {
    bg: '#0a0a0f',
    grid: 'rgba(0,245,255,0.06)',
    headColor: '#00f5ff',
    bodyFrom: [0, 245, 255],
    bodyTo: [0, 50, 100],
    eyeColor: '#0a0a0f',
    fruitFallback: '#ff006e',
    glow: true,
    glowColor: '#00f5ff',
  },
  retro: {
    bg: '#001a00',
    grid: 'rgba(0,180,0,0.08)',
    headColor: '#33ff33',
    bodyFrom: [51, 255, 51],
    bodyTo: [0, 80, 0],
    eyeColor: '#001a00',
    fruitFallback: '#88ff44',
    glow: false,
    glowColor: '',
  },
};

// ── Sprite atlas (inlined from public/games/snake/sprites.js) ─────────────────

type SpriteFrame = { x: number; y: number; w: number; h: number };

const FRUIT_ATLAS: Record<string, SpriteFrame> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

const FRUIT_KEYS = Object.keys(FRUIT_ATLAS);

// ── Types ─────────────────────────────────────────────────────────────────────

type Point = { x: number; y: number };
type Dir = { dx: number; dy: number };

// ── Component ─────────────────────────────────────────────────────────────────

export interface SnakeGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export default function SnakeGame({
  paused,
  onScoreChange,
  onLevelChange,
  onGameOver,
  skin = 'classic',
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useRef(paused);
  const onScoreRef = useRef(onScoreChange);
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

    // ── Fruit image ──────────────────────────────────────────────────────────
    const alive = { current: true };
    const fruitImg = new Image();
    let imgLoaded = false;
    fruitImg.onload = () => {
      if (alive.current) imgLoaded = true;
    };
    fruitImg.onerror = () =>
      console.error('SnakeGame: fruits.png failed to load');
    fruitImg.src = '/games/snake/fruits.png';

    // ── Game state ───────────────────────────────────────────────────────────
    const snake: Point[] = [
      { x: 11, y: 10 },
      { x: 10, y: 10 },
      { x: 9, y: 10 },
    ];
    let dir: Dir = { dx: 1, dy: 0 };
    let nextDir: Dir = { dx: 1, dy: 0 };
    let fruit: Point = { x: 0, y: 0 };
    let fruitSprite: SpriteFrame = FRUIT_ATLAS.apple;
    let score = 0;
    let level = 1;
    let gameOverFired = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    // ── Helpers ──────────────────────────────────────────────────────────────
    function getInterval() {
      return Math.max(
        MIN_INTERVAL,
        BASE_INTERVAL - (level - 1) * INTERVAL_STEP
      );
    }

    function spawnFruit() {
      const key = FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
      fruitSprite = FRUIT_ATLAS[key];
      let pos: Point;
      do {
        pos = {
          x: Math.floor(Math.random() * COLS),
          y: Math.floor(Math.random() * ROWS),
        };
      } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
      fruit = pos;
    }

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
      const s = SKINS[skinRef.current];

      // Background
      ctx.fillStyle = s.bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Retro scanlines
      if (skinRef.current === 'retro') {
        for (let y = 0; y < CANVAS_H; y += 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(0, y, CANVAS_W, 1);
        }
      }

      // Subtle grid
      ctx.strokeStyle = s.grid;
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, CANVAS_H);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(CANVAS_W, r * CELL);
        ctx.stroke();
      }

      // Fruit
      const fx = fruit.x * CELL;
      const fy = fruit.y * CELL;
      if (imgLoaded) {
        const sf = fruitSprite;
        ctx.drawImage(
          fruitImg,
          sf.x,
          sf.y,
          sf.w,
          sf.h,
          fx + 4,
          fy + 4,
          CELL - 8,
          CELL - 8
        );
      } else {
        ctx.fillStyle = s.fruitFallback;
        ctx.beginPath();
        ctx.arc(fx + CELL / 2, fy + CELL / 2, CELL / 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Snake
      const len = Math.max(snake.length - 1, 1);
      snake.forEach((seg, i) => {
        const isHead = i === 0;
        const t = i / len;

        if (s.glow && isHead) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = s.glowColor;
        } else {
          ctx.shadowBlur = 0;
        }

        if (isHead) {
          ctx.fillStyle = s.headColor;
        } else {
          const [r1, g1, b1] = s.bodyFrom;
          const [r2, g2, b2] = s.bodyTo;
          const r = Math.round(r1 + (r2 - r1) * t);
          const g = Math.round(g1 + (g2 - g1) * t);
          const b = Math.round(b1 + (b2 - b1) * t);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }

        const pad = isHead ? 2 : 3;
        ctx.fillRect(
          seg.x * CELL + pad,
          seg.y * CELL + pad,
          CELL - pad * 2,
          CELL - pad * 2
        );
        ctx.shadowBlur = 0;

        // Eyes on head
        if (isHead) {
          ctx.fillStyle = s.eyeColor;
          const ex = seg.x * CELL;
          const ey = seg.y * CELL;
          if (dir.dx === 1) {
            ctx.fillRect(ex + CELL - 11, ey + 8, 5, 5);
            ctx.fillRect(ex + CELL - 11, ey + CELL - 13, 5, 5);
          } else if (dir.dx === -1) {
            ctx.fillRect(ex + 6, ey + 8, 5, 5);
            ctx.fillRect(ex + 6, ey + CELL - 13, 5, 5);
          } else if (dir.dy === -1) {
            ctx.fillRect(ex + 8, ey + 6, 5, 5);
            ctx.fillRect(ex + CELL - 13, ey + 6, 5, 5);
          } else {
            ctx.fillRect(ex + 8, ey + CELL - 11, 5, 5);
            ctx.fillRect(ex + CELL - 13, ey + CELL - 11, 5, 5);
          }
        }
      });
    }

    // ── Game step ────────────────────────────────────────────────────────────
    function step() {
      if (pausedRef.current || gameOverFired) return;

      dir = nextDir;
      const head = snake[0];
      const newHead = { x: head.x + dir.dx, y: head.y + dir.dy };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= COLS ||
        newHead.y < 0 ||
        newHead.y >= ROWS
      ) {
        triggerGameOver();
        return;
      }

      // Self collision
      if (snake.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        triggerGameOver();
        return;
      }

      snake.unshift(newHead);

      if (newHead.x === fruit.x && newHead.y === fruit.y) {
        score += SCORE_PER_FRUIT * level;
        onScoreRef.current(score);

        const newLevel = Math.floor(score / POINTS_PER_LEVEL) + 1;
        if (newLevel !== level) {
          level = newLevel;
          onLevelRef.current(level);
          // Restart interval at new speed
          if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = setInterval(step, getInterval());
          }
        }

        spawnFruit();
      } else {
        snake.pop();
      }

      draw();
    }

    function triggerGameOver() {
      gameOverFired = true;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      draw();
      onGameOverRef.current(score);
    }

    // ── Keyboard ─────────────────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      if (pausedRef.current) return;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (dir.dy !== 1) nextDir = { dx: 0, dy: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (dir.dy !== -1) nextDir = { dx: 0, dy: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (dir.dx !== 1) nextDir = { dx: -1, dy: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (dir.dx !== -1) nextDir = { dx: 1, dy: 0 };
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // ── Boot ─────────────────────────────────────────────────────────────────
    spawnFruit();
    draw();
    intervalId = setInterval(step, getInterval());

    return () => {
      alive.current = false;
      if (intervalId !== null) clearInterval(intervalId);
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
