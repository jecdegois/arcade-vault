'use client';

import React from 'react';

interface KeyMap {
  up?: string;
  down?: string;
  left?: string;
  right?: string;
  a?: string;
  b?: string;
}

interface MobileGamepadProps {
  keyMap: KeyMap;
  paused: boolean;
  onPauseToggle: () => void;
  skin: string;
  onSkinChange: (skin: string) => void;
}

const SKINS = [
  { id: 'classic', label: 'CL', icon: '◆' },
  { id: 'neon', label: 'NE', icon: '✦' },
  { id: 'retro', label: 'RE', icon: '▣' },
];

function fireKey(key: string, type: 'keydown' | 'keyup') {
  document.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true }));
}

type BtnColor = 'cyan' | 'magenta' | 'yellow';

const COLOR: Record<BtnColor, { bg: string; border: string; text: string }> = {
  cyan: {
    bg: 'rgba(0,245,255,0.08)',
    border: 'rgba(0,245,255,0.3)',
    text: 'var(--cyan)',
  },
  magenta: {
    bg: 'rgba(255,0,110,0.15)',
    border: 'rgba(255,0,110,0.5)',
    text: 'var(--magenta)',
  },
  yellow: {
    bg: 'rgba(245,255,0,0.1)',
    border: 'rgba(245,255,0,0.35)',
    text: 'var(--yellow)',
  },
};

function PadBtn({
  label,
  keyStr,
  round = false,
  color = 'cyan',
}: {
  label: string;
  keyStr?: string;
  round?: boolean;
  color?: BtnColor;
}) {
  const c = COLOR[color];
  const size = round ? 56 : 52;
  const handlers = keyStr
    ? {
        onTouchStart: (e: React.TouchEvent) => {
          e.preventDefault();
          fireKey(keyStr, 'keydown');
        },
        onTouchEnd: (e: React.TouchEvent) => {
          e.preventDefault();
          fireKey(keyStr, 'keyup');
        },
        onMouseDown: () => fireKey(keyStr, 'keydown'),
        onMouseUp: () => fireKey(keyStr, 'keyup'),
        onMouseLeave: () => fireKey(keyStr, 'keyup'),
      }
    : {};

  return (
    <button
      {...handlers}
      style={{
        width: size,
        height: size,
        fontFamily: 'var(--pixel)',
        fontSize: round ? 14 : 18,
        letterSpacing: round ? '0.05em' : undefined,
        background: keyStr ? c.bg : 'rgba(0,245,255,0.03)',
        border: keyStr
          ? `${round ? 2 : 1}px solid ${c.border}`
          : '1px solid rgba(0,245,255,0.08)',
        color: keyStr ? c.text : 'transparent',
        borderRadius: round ? '50%' : 8,
        cursor: keyStr ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
      }}
    >
      {label}
    </button>
  );
}

export default function MobileGamepad({
  keyMap,
  paused,
  onPauseToggle,
  skin,
  onSkinChange,
}: MobileGamepadProps) {
  return (
    <div
      className="flex flex-col md:hidden"
      style={{
        gap: 16,
        padding: '16px 12px',
        background: 'var(--bg-2)',
        border: '1px solid var(--line)',
        borderTop: 'none',
        borderRadius: '0 0 16px 16px',
      }}
    >
      {/* D-pad + action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 8px',
        }}
      >
        {/* D-pad 3×3 grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 52px)',
            gap: 4,
          }}
        >
          <PadBtn label="" />
          <PadBtn label="▲" keyStr={keyMap.up} />
          <PadBtn label="" />
          <PadBtn label="◀" keyStr={keyMap.left} />
          <div
            style={{
              width: 52,
              height: 52,
              background: 'rgba(0,245,255,0.04)',
              border: '1px solid rgba(0,245,255,0.12)',
              borderRadius: 8,
            }}
          />
          <PadBtn label="▶" keyStr={keyMap.right} />
          <PadBtn label="" />
          <PadBtn label="▼" keyStr={keyMap.down} />
          <PadBtn label="" />
        </div>

        {/* A + B */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <PadBtn label="A" keyStr={keyMap.a} round color="magenta" />
          <PadBtn label="B" keyStr={keyMap.b} round color="yellow" />
        </div>
      </div>

      {/* Pause + skin selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 8px',
        }}
      >
        <button
          onClick={onPauseToggle}
          style={{
            fontFamily: 'var(--pixel)',
            fontSize: 9,
            letterSpacing: '0.1em',
            padding: '8px 14px',
            background: paused ? 'rgba(0,245,255,0.15)' : 'transparent',
            border: '1px solid rgba(0,245,255,0.4)',
            color: paused ? 'var(--cyan)' : 'var(--ink-dim)',
            cursor: 'pointer',
            borderRadius: 4,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          {paused ? '▶ REANUDAR' : '⏸ PAUSA'}
        </button>

        <div
          style={{
            display: 'flex',
            gap: 2,
            border: '1px solid var(--line)',
            padding: 2,
          }}
        >
          {SKINS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onSkinChange(opt.id)}
              style={{
                fontFamily: 'var(--pixel)',
                fontSize: 8,
                letterSpacing: '0.08em',
                padding: '5px 8px',
                background:
                  skin === opt.id ? 'rgba(0,245,255,0.15)' : 'transparent',
                border: 'none',
                color: skin === opt.id ? 'var(--cyan)' : 'var(--ink-dim)',
                cursor: 'pointer',
                textShadow:
                  skin === opt.id ? '0 0 8px rgba(0,245,255,0.7)' : 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
