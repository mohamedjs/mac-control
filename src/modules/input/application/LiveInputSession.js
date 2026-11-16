import { nativeKeyFor, MouseButtons } from '../domain/KeyCodes.js';

/** Pixels of trackpad/wheel travel that make one X11 wheel notch. */
const PIXELS_PER_NOTCH = 40;
const PIXELS_PER_LINE = 16;

/**
 * One live controller connection (e.g. a Mac driving this machine).
 *
 * Hot path rules:
 *  - every native call is synchronous (~0.1 ms) — no promise queue;
 *  - bursts of pointer moves that arrive in the same tick are summed and
 *    injected once (setImmediate), but any button/key/wheel flushes the
 *    pending move first so ordering is preserved;
 *  - every key/button that is held down is tracked and released when the
 *    session ends, so a dropped connection can never leave a stuck key.
 */
export class LiveInputSession {
  #port;
  #heldKeys = new Set();
  #heldButtons = new Set();
  #pendX = 0;
  #pendY = 0;
  #fracX = 0;
  #fracY = 0;
  #wheelX = 0;
  #wheelY = 0;
  #flushScheduled = false;
  #closed = false;
  #stats = { events: 0, busyNs: 0n };

  /** @param {any} port input adapter exposing the *Sync primitives */
  constructor(port) {
    this.#port = port;
  }

  get available() {
    return Boolean(this.#port.hasDirect);
  }

  /** Average native handling time per event (µs) since last call, then resets. */
  takeStats() {
    const { events, busyNs } = this.#stats;
    this.#stats = { events: 0, busyNs: 0n };
    return { events, avgUs: events ? Number(busyNs / BigInt(events)) / 1000 : 0 };
  }

  /**
   * Apply one decoded controller message. Returns a reply object or null.
   * @param {any} m
   */
  handle(m) {
    if (this.#closed || !m || typeof m !== 'object') return null;
    const t0 = process.hrtime.bigint();
    let reply = null;

    switch (m.t) {
      case 'm': {
        const dx = Number(m.x);
        const dy = Number(m.y);
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
        this.#pendX += clamp(dx, -2000, 2000);
        this.#pendY += clamp(dy, -2000, 2000);
        if (!this.#flushScheduled) {
          this.#flushScheduled = true;
          setImmediate(() => this.#flushMove());
        }
        break;
      }
      case 'bd':
      case 'bu': {
        if (!MouseButtons.has(m.b)) return null;
        this.#flushMove();
        const down = m.t === 'bd';
        if (down) this.#heldButtons.add(m.b);
        else this.#heldButtons.delete(m.b);
        this.#port.buttonSync(m.b, down);
        break;
      }
      case 'kd':
      case 'ku': {
        const key = nativeKeyFor(m.c);
        if (!key) return null;
        this.#flushMove();
        const down = m.t === 'kd';
        if (down) this.#heldKeys.add(key);
        else this.#heldKeys.delete(key);
        this.#port.keySync(key, down);
        break;
      }
      case 'w': {
        this.#flushMove();
        const unit = m.mode === 1 ? PIXELS_PER_LINE : m.mode === 2 ? PIXELS_PER_NOTCH * 10 : 1;
        const gain = clamp(Number(m.g) || 1, 0.1, 10);
        this.#wheelX += clamp(Number(m.x) || 0, -5000, 5000) * unit * gain;
        this.#wheelY += clamp(Number(m.y) || 0, -5000, 5000) * unit * gain;
        const nx = Math.trunc(this.#wheelX / PIXELS_PER_NOTCH);
        const ny = Math.trunc(this.#wheelY / PIXELS_PER_NOTCH);
        if (nx || ny) {
          this.#wheelX -= nx * PIXELS_PER_NOTCH;
          this.#wheelY -= ny * PIXELS_PER_NOTCH;
          this.#port.scrollSync(clamp(nx, -20, 20), clamp(ny, -20, 20));
        }
        break;
      }
      case 'r':
        this.releaseAll();
        break;
      case 'p':
        reply = { t: 'pong', i: m.i, ...this.takeStats() };
        break;
      default:
        return null;
    }

    this.#stats.events++;
    this.#stats.busyNs += process.hrtime.bigint() - t0;
    return reply;
  }

  #flushMove() {
    this.#flushScheduled = false;
    if (this.#closed || (this.#pendX === 0 && this.#pendY === 0)) return;
    // Keep sub-pixel remainders so slow, precise trackpad motion is not lost.
    const x = this.#pendX + this.#fracX;
    const y = this.#pendY + this.#fracY;
    const ix = Math.trunc(x);
    const iy = Math.trunc(y);
    this.#fracX = x - ix;
    this.#fracY = y - iy;
    this.#pendX = 0;
    this.#pendY = 0;
    if (ix || iy) {
      const t0 = process.hrtime.bigint();
      this.#port.moveBySync(ix, iy);
      this.#stats.busyNs += process.hrtime.bigint() - t0;
    }
  }

  /** Release every key and button this session is holding. */
  releaseAll() {
    for (const key of this.#heldKeys) {
      try { this.#port.keySync(key, false); } catch {}
    }
    for (const b of this.#heldButtons) {
      try { this.#port.buttonSync(b, false); } catch {}
    }
    this.#heldKeys.clear();
    this.#heldButtons.clear();
    this.#wheelX = 0;
    this.#wheelY = 0;
  }

  close() {
    if (this.#closed) return;
    this.releaseAll();
    this.#closed = true;
  }
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
