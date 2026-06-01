'use client';

import { GamepadMkII } from './GamepadMkII';

function fireKey(code: string, type: 'keydown' | 'keyup' = 'keydown') {
  document.dispatchEvent(
    new KeyboardEvent(type, { code, bubbles: true, cancelable: true })
  );
}

function tap(code: string) {
  fireKey(code, 'keydown');
}

export function TetrisControls() {
  return (
    <GamepadMkII
      dpad={{ up: false, down: true, left: true, right: true }}
      buttonA={{ label: '↺' }}
      buttonB={{ label: '▼▼' }}
      onDirStart={(dir) => {
        if (dir === 'left') fireKey('ArrowLeft', 'keydown');
        if (dir === 'right') fireKey('ArrowRight', 'keydown');
        if (dir === 'down') fireKey('ArrowDown', 'keydown');
      }}
      onDirEnd={(dir) => {
        if (dir === 'left') fireKey('ArrowLeft', 'keyup');
        if (dir === 'right') fireKey('ArrowRight', 'keyup');
        if (dir === 'down') fireKey('ArrowDown', 'keyup');
      }}
      onAStart={() => tap('ArrowUp')}
      onBStart={() => tap('Space')}
    />
  );
}
