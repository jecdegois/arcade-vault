'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { createClient } from '../../../../lib/supabase/client';
import type { SkinId } from '../../../components/games/SnakeGame';

const SnakeGame = dynamic(() => import('../../../components/games/SnakeGame'), {
  ssr: false,
});

const GAME_ID = 'snake';
const SKIN_KEY = 'av_skin_snake';
const SKIN_OPTIONS: { id: SkinId; label: string; icon: string }[] = [
  { id: 'classic', label: 'CLASSIC', icon: '◆' },
  { id: 'neon', label: 'NEON', icon: '✦' },
  { id: 'retro', label: 'RETRO', icon: '▣' },
];

export default function SnakePlayPage() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [playerName, setPlayerName] = useState('INVITADO');
  const [saved, setSaved] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [skin, setSkin] = useState<SkinId>('classic');

  useEffect(() => {
    const stored = localStorage.getItem(SKIN_KEY) as SkinId | null;
    if (stored && ['classic', 'neon', 'retro'].includes(stored))
      setSkin(stored);
  }, []);

  const handleSkinChange = (s: SkinId) => {
    setSkin(s);
    localStorage.setItem(SKIN_KEY, s);
  };

  const handleScoreChange = useCallback((s: number) => setScore(s), []);
  const handleLevelChange = useCallback((l: number) => setLevel(l), []);
  const handleGameOver = useCallback((finalScore: number) => {
    setScore(finalScore);
    const stored = localStorage.getItem('av_player_name');
    if (stored) setPlayerName(stored);
    setOver(true);
  }, []);

  const restart = () => {
    setScore(0);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setGameKey((k) => k + 1);
  };

  const saveScore = async () => {
    setSaved(true);
    localStorage.setItem('av_player_name', playerName);
    const supabase = createClient();
    await supabase.from('scores').insert({
      game_id: GAME_ID,
      player_name: playerName,
      score,
      user_id: null,
    });
  };

  return (
    <div className="av-player fade-in">
      {/* HUD */}
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {playerName}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
        </div>
        <div className="hud-actions">
          {/* Skin selector */}
          <div
            style={{
              display: 'flex',
              gap: 2,
              border: '1px solid var(--line)',
              padding: 2,
            }}
          >
            {SKIN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSkinChange(opt.id)}
                style={{
                  fontFamily: 'var(--pixel)',
                  fontSize: 8,
                  letterSpacing: '0.1em',
                  padding: '6px 8px',
                  background:
                    skin === opt.id ? 'rgba(0,245,255,0.15)' : 'transparent',
                  border: 'none',
                  color: skin === opt.id ? 'var(--cyan)' : 'var(--ink-dim)',
                  cursor: 'pointer',
                  textShadow:
                    skin === opt.id ? '0 0 8px rgba(0,245,255,0.7)' : 'none',
                  transition: 'color 120ms, background 120ms',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href={`/games/${GAME_ID}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      {/* CRT */}
      <div className="crt">
        <div className="crt-screen">
          <SnakeGame
            key={gameKey}
            paused={paused}
            skin={skin}
            onScoreChange={handleScoreChange}
            onLevelChange={handleLevelChange}
            onGameOver={handleGameOver}
          />
          {paused && (
            <div
              className="crt-content"
              style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: 'var(--ink-dim)',
                    marginTop: 10,
                    letterSpacing: '0.16em',
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>SNAKE · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {/* Game over modal */}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString('es-ES')}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={playerName}
                  onChange={(e) =>
                    setPlayerName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={saveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
