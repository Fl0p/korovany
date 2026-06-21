/** Human-readable label for a semantic input action (settings UI). */
export const ACTION_LABELS: Record<
  import('../input/intent').InputAction,
  string
> = {
  moveForward: 'Move forward',
  moveBack: 'Move back',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  jump: 'Jump',
  sprint: 'Sprint',
  attack: 'Attack',
}

/**
 * Turn a `KeyboardEvent.code` into a short display string (`KeyW` → `W`,
 * `ShiftLeft` → `Shift`). Empty / unknown codes render as "Unbound".
 */
export function formatKeyCode(code: string): string {
  if (!code) return 'Unbound'
  if (code.startsWith('Key') && code.length === 4) return code.slice(3)
  if (code.startsWith('Digit') && code.length === 6) return code.slice(5)
  if (code === 'Space') return 'Space'
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift'
  if (code === 'ControlLeft' || code === 'ControlRight') return 'Ctrl'
  if (code === 'AltLeft' || code === 'AltRight') return 'Alt'
  if (code.startsWith('Arrow')) return code.slice(5)
  return code
}

/** Codes the settings UI must never bind (browser-reserved or gameplay-owned). */
export const FORBIDDEN_BINDING_CODES = new Set(['Escape', 'KeyM', 'KeyB'])
