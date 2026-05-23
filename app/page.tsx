'use client';

import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GAMES, CATS, type Game } from './data';

type Filter = 'TODOS' | typeof CATS[number];
const ALL_CATS: Filter[] = ['TODOS', ...CATS];

function GameCard({ game }: { game: Game }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `translateY(-6px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = '';
  };

  const btnClass = `btn${game.color === 'magenta' ? ' magenta' : game.color === 'yellow' ? ' yellow' : ''}`;

  const go = () => router.push(`/games/${game.id}`);

  return (
    <div ref={ref} className="card" onMouseMove={onMove} onMouseLeave={onLeave} onClick={go}>
      <div className="cover">
        <div className={`cover-bg ${game.cover}`} />
        <div className="label">{game.category}</div>
      </div>
      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR PUNTUACIÓN</span>
            <b>{game.best.toLocaleString('es-ES')}</b>
          </div>
          <button
            className={btnClass}
            onClick={(e) => { e.stopPropagation(); go(); }}
          >
            JUGAR
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Filter>('TODOS');

  const filtered = useMemo(() =>
    GAMES.filter(
      (g) =>
        (cat === 'TODOS' || g.category === cat) &&
        g.title.toLowerCase().includes(q.toLowerCase())
    ),
    [q, cat]
  );

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
          />
        </div>
        <div className="av-chips">
          {ALL_CATS.map((c) => (
            <button
              key={c}
              className={`chip${cat === c ? ' active' : ''}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard key={g.id} game={g} />
        ))}
        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 80, color: 'var(--ink-faint)' }}>
            <div className="pixel" style={{ fontSize: 14, color: 'var(--magenta)', marginBottom: 12 }}>
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </div>
  );
}
