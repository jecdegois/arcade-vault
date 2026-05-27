'use client';

import { useEffect, useRef } from 'react';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const RETRO_COLORS: (string | null)[] = [
  null,
  '#4dd0e1',
  '#ffd54f',
  '#ba68c8',
  '#81c784',
  '#e57373',
  '#90caf9',
  '#ffb74d',
  '#9e9e9e',
];

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
}

export default function TetrisGame({
  paused,
  onScoreChange,
  onLinesChange,
  onLevelChange,
  onGameOver,
}: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useRef(paused);
  const onScoreRef = useRef(onScoreChange);
  const onLinesRef = useRef(onLinesChange);
  const onLevelRef = useRef(onLevelChange);
  const onGameOverRef = useRef(onGameOver);

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
      const color = RETRO_COLORS[colorIndex] as string;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(COLS * BLOCK, r * BLOCK);
        ctx.stroke();
      }

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
    }

    function drawNext() {
      const NB = 30;
      nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
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
