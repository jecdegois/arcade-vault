'use client';

import { useEffect, useRef } from 'react';

const W = 800;
const H = 600;

const RADII = [0, 16, 30, 50];
const SPEEDS = [0, 85, 55, 32];
const POINTS = [0, 100, 50, 20];

export type SkinId = 'classic' | 'neon' | 'retro';

interface AsteroidsSkin {
  bg: string;
  ship: string;
  thrust: string;
  asteroid: string;
  bullet: string;
  particle: string;
  hud: string;
  glow: boolean;
  glowColor: string;
}

const SKINS: Record<SkinId, AsteroidsSkin> = {
  classic: {
    bg: '#000000',
    ship: '#ffffff',
    thrust: 'rgba(255,130,0,0.85)',
    asteroid: '#ffffff',
    bullet: '#ffffff',
    particle: 'rgba(255,255,255,',
    hud: '#ffffff',
    glow: false,
    glowColor: '',
  },
  neon: {
    bg: '#0a0a0f',
    ship: '#00f5ff',
    thrust: 'rgba(0,255,136,0.9)',
    asteroid: '#ff006e',
    bullet: '#f5ff00',
    particle: 'rgba(0,245,255,',
    hud: '#00f5ff',
    glow: true,
    glowColor: '#00f5ff',
  },
  retro: {
    bg: '#001a00',
    ship: '#33ff33',
    thrust: 'rgba(180,255,80,0.85)',
    asteroid: '#00bb00',
    bullet: '#88ff88',
    particle: 'rgba(0,200,0,',
    hud: '#33ff33',
    glow: false,
    glowColor: '',
  },
};

export interface AsteroidsGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  skin?: SkinId;
}

export default function AsteroidsGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  skin = 'classic',
}: AsteroidsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Refs so the game loop always reads the latest prop values without stale closures
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

    // ── Utils ──────────────────────────────────────────────────────────────────
    const wrap = (v: number, max: number) => ((v % max) + max) % max;
    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      Math.hypot(a.x - b.x, a.y - b.y);
    const rand = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const randInt = (min: number, max: number) =>
      Math.floor(rand(min, max + 1));

    // ── Input ──────────────────────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};
    const justPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      justPressed[e.code] = !keys[e.code];
      keys[e.code] = true;
      if (
        ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
          e.code
        )
      )
        e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const pressed = (code: string) => {
      const val = justPressed[code];
      justPressed[code] = false;
      return val;
    };

    // ── Bullet ─────────────────────────────────────────────────────────────────
    class Bullet {
      x: number;
      y: number;
      vx: number;
      vy: number;
      ttl: number;
      radius: number;
      dead: boolean;
      constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        const SPEED = 520;
        this.vx = Math.cos(angle) * SPEED;
        this.vy = Math.sin(angle) * SPEED;
        this.ttl = 1.1;
        this.radius = 2;
        this.dead = false;
      }
      update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
      }
      draw() {
        const s = SKINS[skinRef.current];
        if (s.glow) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = s.bullet;
        }
        ctx.fillStyle = s.bullet;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // ── Asteroid ───────────────────────────────────────────────────────────────
    class Asteroid {
      x: number;
      y: number;
      size: number;
      radius: number;
      dead: boolean;
      vx: number;
      vy: number;
      rotSpeed: number;
      rot: number;
      verts: number[][];
      constructor(x: number, y: number, size = 3) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.radius = RADII[size];
        this.dead = false;
        const angle = rand(0, Math.PI * 2);
        const speed = SPEEDS[size] + rand(-15, 15);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.rotSpeed = rand(-1.2, 1.2);
        this.rot = rand(0, Math.PI * 2);
        const n = randInt(8, 13);
        this.verts = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const r = this.radius * rand(0.6, 1.0);
          this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
        }
      }
      update(dt: number) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpeed * dt;
      }
      split(): Asteroid[] {
        if (this.size <= 1) return [];
        return [
          new Asteroid(this.x, this.y, this.size - 1),
          new Asteroid(this.x, this.y, this.size - 1),
        ];
      }
      draw() {
        const s = SKINS[skinRef.current];
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rot);
        if (s.glow) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = s.asteroid;
        }
        ctx.strokeStyle = s.asteroid;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.verts[0][0], this.verts[0][1]);
        for (let i = 1; i < this.verts.length; i++)
          ctx.lineTo(this.verts[i][0], this.verts[i][1]);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // ── Ship ───────────────────────────────────────────────────────────────────
    class Ship {
      x!: number;
      y!: number;
      angle!: number;
      vx!: number;
      vy!: number;
      radius!: number;
      thrusting!: boolean;
      invincible!: number;
      shootCooldown!: number;
      dead!: boolean;
      constructor() {
        this.reset();
      }
      reset() {
        this.x = W / 2;
        this.y = H / 2;
        this.angle = -Math.PI / 2;
        this.vx = 0;
        this.vy = 0;
        this.radius = 12;
        this.thrusting = false;
        this.invincible = 3;
        this.shootCooldown = 0;
        this.dead = false;
      }
      update(dt: number) {
        if (this.dead) return;
        if (this.invincible > 0) this.invincible -= dt;
        if (this.shootCooldown > 0) this.shootCooldown -= dt;
        const ROT = 3.5;
        const THRUST = 260;
        const DRAG = 0.987;
        if (keys['ArrowLeft']) this.angle -= ROT * dt;
        if (keys['ArrowRight']) this.angle += ROT * dt;
        this.thrusting = !!keys['ArrowUp'];
        if (this.thrusting) {
          this.vx += Math.cos(this.angle) * THRUST * dt;
          this.vy += Math.sin(this.angle) * THRUST * dt;
        }
        this.vx *= DRAG;
        this.vy *= DRAG;
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
      }
      tryShoot(): Bullet[] {
        if (this.shootCooldown > 0 || this.dead) return [];
        this.shootCooldown = 0.2;
        const NOSE = 21;
        const ox = this.x + Math.cos(this.angle) * NOSE;
        const oy = this.y + Math.sin(this.angle) * NOSE;
        return [new Bullet(ox, oy, this.angle)];
      }
      draw() {
        if (this.dead) return;
        if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
          return;
        const s = SKINS[skinRef.current];
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        if (s.glow) {
          ctx.shadowBlur = 14;
          ctx.shadowColor = s.ship;
        }
        ctx.strokeStyle = s.ship;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-12, -9);
        ctx.lineTo(-7, 0);
        ctx.lineTo(-12, 9);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
        if (this.thrusting && Math.random() > 0.35) {
          ctx.beginPath();
          ctx.moveTo(-8, -4);
          ctx.lineTo(-8 - rand(6, 14), 0);
          ctx.lineTo(-8, 4);
          ctx.strokeStyle = s.thrust;
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // ── Particle ───────────────────────────────────────────────────────────────
    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      ttl: number;
      dead: boolean;
      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        const angle = rand(0, Math.PI * 2);
        const speed = rand(30, 130);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = rand(0.4, 1.1);
        this.ttl = this.life;
        this.dead = false;
      }
      update(dt: number) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.ttl -= dt;
        if (this.ttl <= 0) this.dead = true;
      }
      draw() {
        const alpha = this.ttl / this.life;
        const s = SKINS[skinRef.current];
        ctx.strokeStyle = `${s.particle}${alpha.toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
        ctx.stroke();
      }
    }

    // ── Game state ─────────────────────────────────────────────────────────────
    let ship: Ship,
      bullets: Bullet[],
      asteroids: Asteroid[],
      particles: Particle[];
    let score: number, lives: number, level: number;
    let state: 'playing' | 'dead' | 'gameover';
    let deadTimer: number;

    // Track previous values to avoid firing callbacks on every frame
    let prevScore = -1,
      prevLives = -1,
      prevLevel = -1;
    let gameOverFired = false;

    function spawnAsteroids(count: number) {
      const SAFE_DIST = 130;
      for (let i = 0; i < count; i++) {
        let x: number, y: number;
        do {
          x = rand(0, W);
          y = rand(0, H);
        } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
        asteroids.push(new Asteroid(x, y, 3));
      }
    }

    function initGame() {
      ship = new Ship();
      bullets = [];
      asteroids = [];
      particles = [];
      score = 0;
      lives = 3;
      level = 1;
      state = 'playing';
      prevScore = -1;
      prevLives = -1;
      prevLevel = -1;
      gameOverFired = false;
      spawnAsteroids(4);
    }

    function nextLevel() {
      level++;
      bullets = [];
      particles = [];
      ship.reset();
      spawnAsteroids(3 + level);
    }

    function explode(x: number, y: number, count = 8) {
      for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
    }

    function killShip() {
      explode(ship.x, ship.y, 14);
      ship.dead = true;
      lives--;
      if (lives <= 0) {
        state = 'gameover';
      } else {
        state = 'dead';
        deadTimer = 2;
      }
    }

    // ── Update ─────────────────────────────────────────────────────────────────
    function update(dt: number) {
      // Notify React of state changes
      if (score !== prevScore) {
        prevScore = score;
        onScoreRef.current(score);
      }
      if (lives !== prevLives) {
        prevLives = lives;
        onLivesRef.current(lives);
      }
      if (level !== prevLevel) {
        prevLevel = level;
        onLevelRef.current(level);
      }

      if (state === 'gameover') {
        if (!gameOverFired) {
          gameOverFired = true;
          onGameOverRef.current(score);
        }
        particles.forEach((p) => p.update(dt));
        particles = particles.filter((p) => !p.dead);
        return;
      }

      if (state === 'dead') {
        deadTimer -= dt;
        particles.forEach((p) => p.update(dt));
        particles = particles.filter((p) => !p.dead);
        asteroids.forEach((a) => a.update(dt));
        if (deadTimer <= 0) {
          state = 'playing';
          ship.reset();
        }
        return;
      }

      if (pressed('Space')) bullets.push(...ship.tryShoot());

      ship.update(dt);
      bullets.forEach((b) => b.update(dt));
      asteroids.forEach((a) => a.update(dt));
      particles.forEach((p) => p.update(dt));

      bullets = bullets.filter((b) => !b.dead);
      particles = particles.filter((p) => !p.dead);

      const newAsteroids: Asteroid[] = [];
      for (const b of bullets) {
        for (const a of asteroids) {
          if (!a.dead && !b.dead && dist(b, a) < a.radius) {
            b.dead = true;
            a.dead = true;
            score += POINTS[a.size];
            explode(a.x, a.y, a.size * 5);
            newAsteroids.push(...a.split());
          }
        }
      }
      asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
      bullets = bullets.filter((b) => !b.dead);

      if (ship.invincible <= 0) {
        for (const a of asteroids) {
          if (dist(ship, a) < ship.radius + a.radius * 0.82) {
            killShip();
            break;
          }
        }
      }

      if (asteroids.length === 0) nextLevel();
    }

    // ── Draw ───────────────────────────────────────────────────────────────────
    function drawLifeIcon(x: number, y: number) {
      const s = SKINS[skinRef.current];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = s.hud;
      ctx.lineWidth = 1.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    function drawHUD() {
      const s = SKINS[skinRef.current];
      ctx.fillStyle = s.hud;
      ctx.font = '15px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE  ${score}`, 14, 26);
      ctx.textAlign = 'center';
      ctx.fillText(`NIVEL ${level}`, W / 2, 26);
      for (let i = 0; i < lives; i++) drawLifeIcon(W - 16 - i * 22, 18);
    }

    function draw() {
      const s = SKINS[skinRef.current];
      ctx.fillStyle = s.bg;
      ctx.fillRect(0, 0, W, H);

      // Retro scanlines overlay
      if (skinRef.current === 'retro') {
        for (let y = 0; y < H; y += 3) {
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(0, y, W, 1);
        }
      }

      particles.forEach((p) => p.draw());
      asteroids.forEach((a) => a.draw());
      bullets.forEach((b) => b.draw());
      ship.draw();
      drawHUD();
      // GAME OVER overlay removed — the React modal handles it
    }

    // ── Loop ───────────────────────────────────────────────────────────────────
    let lastTime: number | null = null;
    let rafId: number;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!pausedRef.current) update(dt);
      draw();
      rafId = requestAnimationFrame(loop);
    }

    initGame();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: 'contain',
      }}
    />
  );
}
