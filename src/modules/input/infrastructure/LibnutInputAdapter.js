import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/**
 * Native mouse/keyboard injection through libnut (XTest on Linux/X11).
 *
 * libnut sleeps 10 ms after EVERY mouse and keyboard call by default — that
 * alone would blow the whole latency budget. Both delays are zeroed here, so
 * a move costs ~0.1 ms. Every call is synchronous on purpose.
 */
export class LibnutInputAdapter {
  #native = null;
  #screen = { width: 0, height: 0 };
  #reason = null;

  constructor(logger = console) {
    if (process.platform === 'linux' && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
      this.#reason = 'no X11 display (DISPLAY is not set)';
      logger.warn?.(`Input disabled: ${this.#reason}`);
      return;
    }
    if (process.platform === 'linux' && process.env.XDG_SESSION_TYPE === 'wayland') {
      logger.warn?.('Wayland session detected: injection only reaches XWayland apps. Log in with "Ubuntu on Xorg" for full control.');
    }
    try {
      const native = require(`@nut-tree-fork/libnut-${process.platform}`);
      native.setMouseDelay(0);
      native.setKeyboardDelay(0);
      this.#screen = native.getScreenSize();
      this.#native = native;
    } catch (err) {
      this.#reason = `native input library failed to load: ${err.message}`;
      logger.warn?.(`Input disabled: ${this.#reason}`);
    }
  }

  get hasDirect() {
    return this.#native !== null;
  }

  get unavailableReason() {
    return this.#reason;
  }

  get screen() {
    return { ...this.#screen };
  }

  /** Relative move from the REAL pointer position, clamped to the desktop. */
  moveBySync(dx, dy) {
    if (!this.#native) return;
    const p = this.#native.getMousePos();
    const x = Math.min(Math.max(0, this.#screen.width - 1), Math.max(0, p.x + dx));
    const y = Math.min(Math.max(0, this.#screen.height - 1), Math.max(0, p.y + dy));
    this.#native.moveMouse(x, y);
  }

  buttonSync(button, down) {
    if (!this.#native) return;
    this.#native.mouseToggle(down ? 'down' : 'up', button);
  }

  keySync(nativeKey, down) {
    if (!this.#native) return;
    this.#native.keyToggle(nativeKey, down ? 'down' : 'up');
  }

  /**
   * Browser sign convention in (positive y = scroll down, positive x = right).
   * Verified on X11: libnut +y → button 4 (up), +x → button 6 (left), so both invert.
   */
  scrollSync(notchesX, notchesY) {
    if (!this.#native) return;
    this.#native.scrollMouse(-notchesX, -notchesY);
  }
}
