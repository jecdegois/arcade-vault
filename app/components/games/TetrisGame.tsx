'use client';

import { useEffect, useRef } from 'react';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

export type SkinId = 'classic' | 'neon' | 'retro';

interface TetrisSkin {
  bg: string;
  grid: string;
  colors: (string | null)[];
  highlight: string;
  glow: boolean;
}

const SKINS: Record<SkinId, TetrisSkin> = {
  classic: {
    bg: 'transparent',
    grid: 'rgba(255,255,255,0.06)',
    colors: [
      null,
      '#4dd0e1',
      '#ffd54f',
      '#ba68c8',
      '#81c784',
      '#e57373',
      '#90caf9',
      '#ffb74d',
      '#9e9e9e',
    ],
    highlight: 'rgba(255,255,255,0.12)',
    glow: false,
  },
  neon: {
    bg: '#0a0a0f',
    grid: 'rgba(0,245,255,0.08)',
    colors: [
      null,
      '#00f5ff',
      '#f5ff00',
      '#ff006e',
      '#00ff88',
      '#ff4400',
      '#aa44ff',
      '#ff9900',
      '#ffffff',
    ],
    highlight: 'rgba(255,255,255,0.25)',
    glow: true,
  },
  retro: {
    bg: '#001400',
    grid: 'rgba(0,180,0,0.1)',
    colors: [
      null,
      '#33ff33',
      '#aaff44',
      '#66dd00',
      '#00cc44',
      '#55ff88',
      '#88ffaa',
      '#ccff66',
      '#44bb44',
    ],
    highlight: 'rgba(255,255,255,0.08)',
    glow: false,
  },
};

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [2, 2],
    [2, 2],
  ],
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ],
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ],
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ],
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ],
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ],
];

const LINE_SCORES = [0, 100, 300, 500, 800];

export interface TetrisGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export default function TetrisGame({
  paused,
  onScoreChange,
  onLinesChange,
  onLevelChange,
  onGameOver,
  skin = 'classic',
}: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useRef(paused);
  const onScoreRef = useRef(onScoreChange);
  const onLinesRef = useRef(onLinesChange);
  const onLevelRef = useRef(onLevelChange);
  const onGameOverRef = useRef(onGameOver);
  const skinRef = useRef<SkinId>(skin);

  const startLoopRef = useRef<(() => void) | null>(null);
  const stopLoopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onScoreRef.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    onLinesRef.current = onLinesChange;
  }, [onLinesChange]);
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
    if (paused) {
      stopLoopRef.current?.();
    } else {
      startLoopRef.current?.();
    }
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const nextCanvas = nextCanvasRef.current!;
    const nextCtx = nextCanvas.getContext('2d')!;

    // ── Offscreen canvas: static background + grid ────────────────────────────
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = COLS * BLOCK;
    bgCanvas.height = ROWS * BLOCK;
    const bgCtx = bgCanvas.getContext('2d')!;
    const bgState = { lastSkin: null as SkinId | null };

    function buildBgCanvas(s: TetrisSkin) {
      if (s.bg === 'transparent') {
        bgCtx.clearRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
      } else {
        bgCtx.fillStyle = s.bg;
        bgCtx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK);
      }
      bgCtx.strokeStyle = s.grid;
      bgCtx.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        bgCtx.beginPath();
        bgCtx.moveTo(c * BLOCK, 0);
        bgCtx.lineTo(c * BLOCK, ROWS * BLOCK);
        bgCtx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        bgCtx.beginPath();
        bgCtx.moveTo(0, r * BLOCK);
        bgCtx.lineTo(COLS * BLOCK, r * BLOCK);
        bgCtx.stroke();
      }
    }

    // ── Offscreen canvas: retro scanlines (built once, skin-independent) ──────
    const scanlineCanvas = document.createElement('canvas');
    scanlineCanvas.width = COLS * BLOCK;
    scanlineCanvas.height = ROWS * BLOCK;
    const slCtx = scanlineCanvas.getContext('2d')!;
    for (let y = 0; y < ROWS * BLOCK; y += 3) {
      slCtx.fillStyle = 'rgba(0,0,0,0.15)';
      slCtx.fillRect(0, y, COLS * BLOCK, 1);
    }

    type Piece = { type: number; shape: number[][]; x: number; y: number };

    let board: number[][];
    let current: Piece;
    let next: Piece;
    let score: number;
    let lines: number;
    let level: number;
    let gameOver: boolean;
    let dropAccum: number;
    let dropInterval: number;
    let lastTime: number;
    let animId: number;
    let prevScore = -1;
    let prevLines = -1;
    let prevLevel = -1;
    let gameOverFired = false;

    function createBoard(): number[][] {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = (PIECES[type] as number[][]).map((row) => [...row]);
      return {
        type,
        shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
      };
    }

    function collide(shape: number[][], ox: number, oy: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]): number[][] {
      const rows = shape.length,
        cols = shape[0].length;
      const result = Array.from({ length: cols }, () =>
        new Array(rows).fill(0)
      );
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      }
    }

    function ghostY(): number {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
      } else {
        lockPiece();
      }
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        gameOver = true;
        if (!gameOverFired) {
          gameOverFired = true;
          onGameOverRef.current(score);
        }
      }
      drawNext();
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function drawBlock(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      colorIndex: number,
      size: number,
      alpha = 1
    ) {
      if (!colorIndex) return;
      const activeSkin = SKINS[skinRef.current];
      const color = activeSkin.colors[colorIndex] as string;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = activeSkin.highlight;
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    }

    function draw() {
      const currentSkin = skinRef.current;
      const activeSkin = SKINS[currentSkin];

      // Rebuild bg offscreen canvas when skin changes, then blit
      if (currentSkin !== bgState.lastSkin) {
        buildBgCanvas(activeSkin);
        bgState.lastSkin = currentSkin;
      }
      ctx.drawImage(bgCanvas, 0, 0);

      // Retro scanlines: single drawImage from prebuilt offscreen canvas
      if (currentSkin === 'retro') {
        ctx.drawImage(scanlineCanvas, 0, 0);
      }

      // Board, ghost, current piece — no glow
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(
              ctx,
              current.x + c,
              gy + r,
              current.shape[r][c],
              BLOCK,
              0.2
            );

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(
            ctx,
            current.x + c,
            current.y + r,
            current.shape[r][c],
            BLOCK
          );

      // ── Neon glow pass — ONE activation, ONE deactivation ──────────────────
      if (activeSkin.glow) {
        ctx.shadowBlur = 10; // ← single activation
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (!board[r][c]) continue;
            const color = activeSkin.colors[board[r][c]] as string;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
          }
        }
        for (let r = 0; r < current.shape.length; r++) {
          for (let c = 0; c < current.shape[r].length; c++) {
            if (!current.shape[r][c]) continue;
            const color = activeSkin.colors[current.shape[r][c]] as string;
            ctx.shadowColor = color;
            ctx.fillStyle = color;
            ctx.fillRect(
              (current.x + c) * BLOCK + 1,
              (current.y + r) * BLOCK + 1,
              BLOCK - 2,
              BLOCK - 2
            );
          }
        }
        ctx.shadowBlur = 0; // ← single deactivation
      }
    }

    function drawNext() {
      const activeSkin = SKINS[skinRef.current];
      const NB = 30;
      if (activeSkin.bg === 'transparent') {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      } else {
        nextCtx.fillStyle = activeSkin.bg;
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
      }
      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
    }

    function loop(ts: number) {
      const dt = ts - lastTime;
      lastTime = ts;
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece();
        }
      }
      if (gameOver) {
        draw();
        return;
      }
      if (score !== prevScore) {
        prevScore = score;
        onScoreRef.current(score);
      }
      if (lines !== prevLines) {
        prevLines = lines;
        onLinesRef.current(lines);
      }
      if (level !== prevLevel) {
        prevLevel = level;
        onLevelRef.current(level);
      }
      draw();
      animId = requestAnimationFrame(loop);
    }

    function init() {
      board = createBoard();
      score = 0;
      lines = 0;
      level = 1;
      dropInterval = 1000;
      dropAccum = 0;
      gameOver = false;
      gameOverFired = false;
      prevScore = -1;
      prevLines = -1;
      prevLevel = -1;
      next = randomPiece();
      spawn();
    }

    function startLoop() {
      if (gameOver) return;
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    }

    function stopLoop() {
      cancelAnimationFrame(animId);
    }

    startLoopRef.current = startLoop;
    stopLoopRef.current = stopLoop;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') return;
      if (pausedRef.current || gameOver) return;
      switch (e.code) {
        case 'ArrowLeft':
          if (!collide(current.shape, current.x - 1, current.y)) current.x--;
          break;
        case 'ArrowRight':
          if (!collide(current.shape, current.x + 1, current.y)) current.x++;
          break;
        case 'ArrowDown':
          softDrop();
          break;
        case 'ArrowUp':
        case 'KeyX':
          tryRotate();
          break;
        case 'Space':
          e.preventDefault();
          hardDrop();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    init();
    startLoop();

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={600}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: 'transparent',
        }}
      />
      <canvas
        ref={nextCanvasRef}
        width={120}
        height={120}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(0,0,0,0.55)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      />
    </div>
  );
}
