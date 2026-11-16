/**
 * Maps browser `KeyboardEvent.code` (physical key position) to the native
 * key names understood by libnut. Physical codes are used on purpose: the
 * remote machine's own keyboard layout decides which character is produced.
 * Pure constants — zero I/O.
 */

const map = {
  Space: 'space',
  Enter: 'enter',
  NumpadEnter: 'enter',
  Backspace: 'backspace',
  Tab: 'tab',
  Escape: 'escape',
  CapsLock: 'caps_lock',
  Delete: 'delete',
  Insert: 'insert',
  Home: 'home',
  End: 'end',
  PageUp: 'pageup',
  PageDown: 'pagedown',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  PrintScreen: 'printscreen',
  ContextMenu: 'menu',

  ShiftLeft: 'shift',
  ShiftRight: 'right_shift',
  ControlLeft: 'control',
  ControlRight: 'right_control',
  AltLeft: 'alt',
  AltRight: 'right_alt',
  MetaLeft: 'meta',
  MetaRight: 'right_meta',

  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  IntlBackslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Backquote: '`',
  Comma: ',',
  Period: '.',
  Slash: '/',

  NumpadDecimal: 'numpad_decimal',
  NumpadEqual: 'numpad_equal',
  NumpadAdd: 'add',
  NumpadSubtract: 'subtract',
  NumpadMultiply: 'multiply',
  NumpadDivide: 'divide',
  NumLock: 'num_lock',

  AudioVolumeMute: 'audio_mute',
  AudioVolumeDown: 'audio_vol_down',
  AudioVolumeUp: 'audio_vol_up',
  MediaPlayPause: 'audio_play',
  MediaStop: 'audio_stop',
  MediaTrackNext: 'audio_next',
  MediaTrackPrevious: 'audio_prev',
};

for (let c = 65; c <= 90; c++) {
  const ch = String.fromCharCode(c);
  map[`Key${ch}`] = ch.toLowerCase();
}
for (let d = 0; d <= 9; d++) {
  map[`Digit${d}`] = String(d);
  map[`Numpad${d}`] = `numpad_${d}`;
}
for (let f = 1; f <= 24; f++) {
  map[`F${f}`] = `f${f}`;
}

export const KeyCodeMap = Object.freeze(map);

/** Modifier codes — these are held, never auto-released on keydown. */
export const ModifierCodes = Object.freeze(
  new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']),
);

/** @param {string} code */
export function nativeKeyFor(code) {
  return Object.prototype.hasOwnProperty.call(KeyCodeMap, code) ? KeyCodeMap[code] : null;
}

export const MouseButtons = Object.freeze(new Set(['left', 'right', 'middle']));
