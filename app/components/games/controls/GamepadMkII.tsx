'use client';

import { useHaptic } from '../../../../lib/hooks/useHaptic';

export type DpadDir = 'up' | 'down' | 'left' | 'right';

export interface GamepadMkIIProps {
  dpad?: Partial<Record<DpadDir, boolean>>;
  buttonA?: { label: string } | false;
  buttonB?: { label: string } | false;
  onDirStart?: (dir: DpadDir) => void;
  onDirEnd?: (dir: DpadDir) => void;
  onAStart?: () => void;
  onAEnd?: () => void;
  onBStart?: () => void;
  onBEnd?: () => void;
}

const ARROW_SVGS: Record<DpadDir, React.ReactElement> = {
  up: (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
      <path d="M12 4 L20 16 L4 16 Z" fill="currentColor" />
    </svg>
  ),
  down: (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
      <path d="M4 8 L20 8 L12 20 Z" fill="currentColor" />
    </svg>
  ),
  left: (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
      <path d="M16 4 L16 20 L4 12 Z" fill="currentColor" />
    </svg>
  ),
  right: (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }}>
      <path d="M8 4 L20 12 L8 20 Z" fill="currentColor" />
    </svg>
  ),
};

const DP_BASE: React.CSSProperties = {
  position: 'absolute',
  width: 46,
  height: 46,
  background: 'linear-gradient(180deg, #1a1a25, #0a0a12)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 8,
  color: 'rgba(138,143,181,0.9)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  boxShadow: '0 4px 0 #050507, inset 0 1px 0 rgba(255,255,255,0.06)',
  touchAction: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  pointerEvents: 'auto',
};

const DP_POSITIONS: Record<DpadDir, React.CSSProperties> = {
  up: { top: 0, left: 49 },
  down: { bottom: 0, left: 49 },
  left: { left: 0, top: 49 },
  right: { right: 0, top: 49 },
};

function DpadButton({
  dir,
  onStart,
  onEnd,
}: {
  dir: DpadDir;
  onStart: () => void;
  onEnd: () => void;
}) {
  return (
    <button
      aria-label={dir}
      style={{ ...DP_BASE, ...DP_POSITIONS[dir] }}
      onPointerDown={(e) => {
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
        onStart();
      }}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
      onPointerCancel={onEnd}
    >
      {ARROW_SVGS[dir]}
    </button>
  );
}

function ActionButton({
  label,
  variant,
  onStart,
  onEnd,
}: {
  label: string;
  variant: 'a' | 'b';
  onStart: () => void;
  onEnd: () => void;
}) {
  const isA = variant === 'a';
  const color = isA ? 'rgba(255,0,110,1)' : 'rgba(0,245,255,1)';
  const mid = isA ? 'rgba(255,0,110,0.7)' : 'rgba(0,200,230,0.7)';
  const deep = isA ? 'rgba(110,0,40,0.95)' : 'rgba(0,50,70,0.95)';
  const glow = isA ? 'rgba(255,0,110,0.5)' : 'rgba(0,245,255,0.5)';

  return (
    <button
      aria-label={label}
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        border: `2px solid ${color}`,
        background: `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.25), transparent 50%), radial-gradient(circle at 50% 55%, ${mid}, ${deep} 75%)`,
        color,
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 5px 0 #050507, 0 0 18px ${glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        pointerEvents: 'auto',
        fontFamily: 'var(--pixel, "Press Start 2P", monospace)',
        fontSize: 9,
        letterSpacing: '0.05em',
        flexDirection: 'column',
        gap: 2,
      }}
      onPointerDown={(e) => {
        try {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
        } catch {}
        onStart();
      }}
      onPointerUp={onEnd}
      onPointerLeave={onEnd}
      onPointerCancel={onEnd}
    >
      <span
        style={{
          fontSize: 20,
          fontFamily: 'var(--pixel, monospace)',
          color: '#fff',
          textShadow: `0 0 8px ${color}, 0 0 16px ${color}`,
        }}
      >
        {label}
      </span>
    </button>
  );
}

export function GamepadMkII({
  dpad = { up: true, down: true, left: true, right: true },
  buttonA = false,
  buttonB = false,
  onDirStart,
  onDirEnd,
  onAStart,
  onAEnd,
  onBStart,
  onBEnd,
}: GamepadMkIIProps) {
  const { haptic } = useHaptic();

  const hasDpad = Object.values(dpad).some(Boolean);
  const hasActions = buttonA !== false || buttonB !== false;

  function dirStart(dir: DpadDir) {
    haptic(12);
    onDirStart?.(dir);
  }

  function dirEnd(dir: DpadDir) {
    onDirEnd?.(dir);
  }

  function aStart() {
    haptic(12);
    onAStart?.();
  }

  function bStart() {
    haptic(12);
    onBStart?.();
  }

  return (
    <div
      className="md:hidden"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent:
          hasDpad && hasActions
            ? 'space-between'
            : hasDpad
              ? 'flex-start'
              : 'flex-end',
        padding: '0 14px 20px',
      }}
    >
      {/* D-pad */}
      {hasDpad && (
        <div style={{ position: 'relative', width: 144, height: 144 }}>
          {(Object.entries(dpad) as [DpadDir, boolean | undefined][])
            .filter(([, show]) => show)
            .map(([dir]) => (
              <DpadButton
                key={dir}
                dir={dir}
                onStart={() => dirStart(dir)}
                onEnd={() => dirEnd(dir)}
              />
            ))}
          {/* Hub gem */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 49,
              left: 49,
              width: 46,
              height: 46,
              background: 'radial-gradient(circle, #181822 0%, #08080d 80%)',
              border: '1px solid rgba(0,245,255,0.15)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                background: 'var(--cyan, #00f5ff)',
                boxShadow: '0 0 8px var(--cyan, #00f5ff)',
                clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                display: 'block',
              }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      {hasActions && (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {buttonB !== false && (
            <ActionButton
              label={buttonB.label}
              variant="b"
              onStart={bStart}
              onEnd={() => onBEnd?.()}
            />
          )}
          {buttonA !== false && (
            <ActionButton
              label={buttonA.label}
              variant="a"
              onStart={aStart}
              onEnd={() => onAEnd?.()}
            />
          )}
        </div>
      )}
    </div>
  );
}
