export function useHaptic() {
  const haptic = (pattern?: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern ?? 10);
    }
  };
  return { haptic };
}
