'use client';

import { GamepadMkII } from './GamepadMkII';

function fireKey(code: string) {
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: code, bubbles: true, cancelable: true })
  );
}

export function SnakeControls() {
  return (
    <GamepadMkII
      dpad={{ up: true, down: true, left: true, right: true }}
      onDirStart={(dir) => {
        if (dir === 'up') fireKey('ArrowUp');
        if (dir === 'down') fireKey('ArrowDown');
        if (dir === 'left') fireKey('ArrowLeft');
        if (dir === 'right') fireKey('ArrowRight');
      }}
    />
  );
}
