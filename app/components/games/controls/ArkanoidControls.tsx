'use client';

import { GamepadMkII } from './GamepadMkII';

function fireKey(code: string, type: 'keydown' | 'keyup') {
  document.dispatchEvent(
    new KeyboardEvent(type, { key: code, bubbles: true, cancelable: true })
  );
}

export function ArkanoidControls() {
  return (
    <GamepadMkII
      dpad={{ up: false, down: false, left: true, right: true }}
      onDirStart={(dir) => {
        if (dir === 'left') fireKey('ArrowLeft', 'keydown');
        if (dir === 'right') fireKey('ArrowRight', 'keydown');
      }}
      onDirEnd={(dir) => {
        if (dir === 'left') fireKey('ArrowLeft', 'keyup');
        if (dir === 'right') fireKey('ArrowRight', 'keyup');
      }}
    />
  );
}
