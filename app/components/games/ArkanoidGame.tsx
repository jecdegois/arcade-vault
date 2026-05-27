'use client';

import { useEffect, useRef } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (800 - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;
const EXPLOSION_DURATION = 150;

// ── Spritesheet data ─────────────────────────────────────────────────────────

type Frame = { sx: number; sy: number; sw: number; sh: number };

const EXPLOSION_FRAMES: Record<string, Frame[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const SPRITES: Record<string, Frame> = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  block_gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  block_red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  block_yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  block_cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  block_magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  block_hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  block_green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};

// ── Level data ───────────────────────────────────────────────────────────────

type Block = { col: number; row: number; color: string };
type Level = { speed: number; blocks: Block[] };

const LEVELS: Level[] = (() => {
  const rc1 = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
  const rc2 = ['gray', 'cyan', 'hotpink', 'yellow', 'magenta', 'green'];
  const rc4 = ['cyan', 'magenta', 'green', 'yellow', 'hotpink', 'red'];

  const l1: Block[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) l1.push({ col, row, color: rc1[row] });

  const l2: Block[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rc2[row] });

  const l3: Block[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? 'yellow' : 'magenta' });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: Block[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col)) l4.push({ col, row, color: rc4[row] });

  const l5: Block[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({ col, row, color: isCross && !isFrame ? 'hotpink' : 'cyan' });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

// ── Component ─────────────────────────────────────────────────────────────────

export interface ArkanoidGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export default function ArkanoidGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: ArkanoidGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const pausedRef = useRef(paused);
  const onScoreRef = useRef(onScoreChange);
  const onLivesRef = useRef(onLivesChange);
  const onLevelRef = useRef(onLevelChange);
  const onGameOverRef = useRef(onGameOver);
  const lastTimePauseRef = useRef<number | null>(null);

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

  // Reset lastTime when unpausing so the loop doesn't accumulate a huge dt
  useEffect(() => {
    if (!paused) lastTimePauseRef.current = null;
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // ── Spritesheet loading ──────────────────────────────────────────────────
    const alive = { current: true }; // set to false on cleanup to prevent stale async callbacks
    let ssCanvas: HTMLCanvasElement | null = null;
    let ssLoaded = false;

    function loadSpritesheet(cb: () => void) {
      const img = new Image();
      img.onload = () => {
        if (!alive.current) return;
        const oc = document.createElement('canvas');
        oc.width = img.width;
        oc.height = img.height;
        oc.getContext('2d')!.drawImage(img, 0, 0);
        ssCanvas = oc;
        ssLoaded = true;
        cb();
      };
      img.onerror = () =>
        console.error('ArkanoidGame: spritesheet failed to load');
      img.src = '/games/arkanoid/spritesheet-breakout.png';
    }

    function drawFrame(
      frame: Frame,
      x: number,
      y: number,
      w: number,
      h: number
    ) {
      if (!ssLoaded || !ssCanvas) return;
      ctx.drawImage(
        ssCanvas,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        x,
        y,
        w,
        h
      );
    }

    function drawSprite(
      name: string,
      x: number,
      y: number,
      w: number,
      h: number
    ) {
      const sp = SPRITES[name];
      if (!sp) return;
      drawFrame(sp, x, y, w, h);
    }

    // ── Game state ───────────────────────────────────────────────────────────
    const paddle = { x: 0, y: 560, w: 81, h: 14 };
    const ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };

    type LiveBlock = {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      alive: boolean;
    };
    type Explosion = {
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      elapsed: number;
    };

    let blocks: LiveBlock[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let gameState: 'playing' | 'gameover' | 'win' = 'playing';
    let currentLevel = 1;
    let gameOverFired = false;

    let prevScore = -1;
    let prevLives = -1;
    let prevLevel = -1;

    const keys: Record<string, boolean> = {
      ArrowLeft: false,
      ArrowRight: false,
    };

    // ── Game logic ───────────────────────────────────────────────────────────

    function initPaddle() {
      paddle.x = (canvas.width - paddle.w) / 2;
    }

    function initBall() {
      const speed = LEVELS[currentLevel - 1].speed;
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * speed;
      ball.vy = BASE_BALL_VY * speed;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * level.speed;
      ball.vy = BASE_BALL_VY * level.speed;
    }

    function collideAABB(block: LiveBlock) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    const bounceSound = new Audio('/games/arkanoid/sounds/ball-bounce.mp3');
    const breakSound = new Audio('/games/arkanoid/sounds/break-sound.mp3');

    function playSound(audio: HTMLAudioElement) {
      try {
        (audio.cloneNode() as HTMLAudioElement).play();
      } catch {
        /* ignore */
      }
    }

    function update(dt: number) {
      if (gameState !== 'playing') return;

      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys.ArrowRight)
        paddle.x = Math.min(
          canvas.width - paddle.w,
          paddle.x + PADDLE_SPEED * dt
        );

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
        playSound(bounceSound);
      }
      if (ball.x + ball.w >= canvas.width) {
        ball.x = canvas.width - ball.w;
        ball.vx = -Math.abs(ball.vx);
        playSound(bounceSound);
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
        playSound(bounceSound);
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
        playSound(bounceSound);
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          playSound(breakSound);
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else gameState = 'win';
          }
          break;
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > canvas.height) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          gameState = 'gameover';
        } else {
          initBall();
        }
      }
    }

    function draw() {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const block of blocks) {
        if (block.alive)
          drawSprite(
            'block_' + block.color,
            block.x,
            block.y,
            block.w,
            block.h
          );
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(
          Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
          3
        );
        const frames = EXPLOSION_FRAMES[exp.color];
        if (frames) drawFrame(frames[frameIndex], exp.x, exp.y, exp.w, exp.h);
      }

      drawSprite('paddle', paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite('ball', ball.x, ball.y, ball.w, ball.h);
    }

    // ── Game loop ────────────────────────────────────────────────────────────
    let animId: number;
    let lastTime: number | null = null;

    function loop(timestamp: number) {
      if (pausedRef.current || gameState !== 'playing') {
        // Emit final callbacks if game just ended
        if (gameState !== 'playing' && !gameOverFired) {
          gameOverFired = true;
          draw();
          onGameOverRef.current(score);
        }
        animId = requestAnimationFrame(loop);
        return;
      }

      if (lastTimePauseRef.current === null) {
        lastTime = timestamp;
        lastTimePauseRef.current = timestamp;
      }
      if (lastTime === null) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;

      update(dt);

      if (score !== prevScore) {
        prevScore = score;
        onScoreRef.current(score);
      }
      if (lives !== prevLives) {
        prevLives = lives;
        onLivesRef.current(lives);
      }
      if (currentLevel !== prevLevel) {
        prevLevel = currentLevel;
        onLevelRef.current(currentLevel);
      }

      draw();
      animId = requestAnimationFrame(loop);
    }

    // ── Input handlers ───────────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') return;
      if (e.key in keys) keys[e.key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key in keys) keys[e.key] = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (pausedRef.current || gameState !== 'playing') return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const mouseX = (e.clientX - rect.left) * scaleX;
      paddle.x = Math.max(
        0,
        Math.min(canvas.width - paddle.w, mouseX - paddle.w / 2)
      );
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);

    // ── Boot ─────────────────────────────────────────────────────────────────
    loadSpritesheet(() => {
      initPaddle();
      loadLevel(1);
      animId = requestAnimationFrame(loop);
    });

    return () => {
      alive.current = false;
      cancelAnimationFrame(animId);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        background: '#000',
      }}
    />
  );
}
