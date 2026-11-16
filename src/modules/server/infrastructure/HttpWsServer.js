import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import { safeEqual } from '../../../kernel/token.js';
import { renderLocalPage } from './local-page.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const CONTROL_PAGE = path.join(here, 'control-page.html');

const isLoopback = (a = '') => a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';

/** An Origin header, when present, must point at this very server. */
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

/** Best guess at the LAN address the Mac should use (skips Docker/VM bridges). */
export function lanAddress() {
  const skip = /^(lo|docker|br-|virbr|veth|vmnet|vboxnet|tun|tap|zt|tailscale)/;
  const candidates = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (skip.test(name)) continue;
    for (const a of addrs || []) if (a.family === 'IPv4' && !a.internal) candidates.push({ name, address: a.address });
  }
  const pref = candidates.find((c) => /^(wl|en|eth)/.test(c.name)) || candidates[0];
  return pref ? pref.address : '127.0.0.1';
}

/**
 * HTTP + WebSocket transport.
 *   GET /            local status page (shows the pairing link only to loopback)
 *   GET /control     the controller page the Mac opens
 *   GET /health      liveness
 *   WS  /control/ws  authenticated live input channel
 */
export class HttpWsServer {
  #server = null;
  #wss = null;
  #token;
  #createSession;
  #input;
  #logger;
  #port = 0;
  #controllers = new Map();
  #page = null;

  constructor({ token, createSession, input, logger = console }) {
    this.#token = token;
    this.#createSession = createSession;
    this.#input = input;
    this.#logger = logger;
  }

  get controlUrl() {
    return `http://${lanAddress()}:${this.#port}/control#t=${this.#token}`;
  }

  status() {
    return {
      ok: true,
      hostname: os.hostname(),
      inputReady: this.#input.hasDirect,
      inputProblem: this.#input.unavailableReason,
      screen: this.#input.screen,
      controllers: [...this.#controllers.values()],
    };
  }

  start({ port = 3030, host = '0.0.0.0' } = {}) {
    this.#server = http.createServer((req, res) => this.#route(req, res));
    this.#server.on('connection', (s) => s.setNoDelay(true));
    this.#wss = new WebSocketServer({ noServer: true, perMessageDeflate: false, maxPayload: 4096 });
    this.#wss.on('connection', (ws, req) => this.#onController(ws, req));

    this.#server.on('upgrade', (req, socket, head) => {
      const reject = (code, text) => {
        socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`);
        socket.destroy();
      };
      let url;
      try { url = new URL(req.url, 'http://x'); } catch { return reject(400, 'Bad Request'); }
      if (url.pathname !== '/control/ws') return reject(404, 'Not Found');
      // Blocks cross-site WebSocket hijacking from any other web page.
      if (!sameOrigin(req)) return reject(403, 'Forbidden');
      if (!safeEqual(url.searchParams.get('t'), this.#token)) return reject(401, 'Unauthorized');
      this.#wss.handleUpgrade(req, socket, head, (ws) => this.#wss.emit('connection', ws, req));
    });

    return new Promise((resolve, reject) => {
      this.#server.once('error', reject);
      this.#server.listen(port, host, () => {
        this.#port = this.#server.address().port;
        resolve({ port: this.#port, host });
      });
    });
  }

  #route(req, res) {
    const { pathname } = new URL(req.url, 'http://x');
    const send = (code, type, body) => {
      res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(body);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'text/plain', 'Method Not Allowed');

    if (pathname === '/control') {
      this.#page ??= fs.readFileSync(CONTROL_PAGE, 'utf8');
      return send(200, 'text/html; charset=utf-8', this.#page);
    }
    if (pathname === '/health') {
      return send(200, 'application/json', JSON.stringify({ ok: true, inputReady: this.#input.hasDirect }));
    }
    if (pathname === '/') {
      const local = isLoopback(req.socket.remoteAddress);
      return send(200, 'text/html; charset=utf-8', renderLocalPage({
        local,
        controlUrl: local ? this.controlUrl : null,
        status: this.status(),
      }));
    }
    if (pathname === '/api/status' && isLoopback(req.socket.remoteAddress)) {
      return send(200, 'application/json', JSON.stringify(this.status()));
    }
    return send(404, 'text/plain', 'Not Found');
  }

  #onController(ws, req) {
    req.socket.setNoDelay(true);
    const ip = req.socket.remoteAddress;
    const id = `${ip}:${req.socket.remotePort}`;
    const session = this.#createSession();
    this.#controllers.set(id, { ip, since: new Date().toISOString() });
    this.#logger.info?.(`Controller connected from ${ip}`);

    ws.send(JSON.stringify({
      t: 'hello',
      available: session.available,
      problem: this.#input.unavailableReason,
      platform: process.platform,
      hostname: os.hostname(),
    }));

    ws.on('message', (raw) => {
      let m;
      try { m = JSON.parse(raw.toString()); } catch { return; }
      try {
        const reply = session.handle(m);
        if (reply && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(reply));
      } catch (err) {
        this.#logger.warn?.('Input error:', err.message);
      }
    });

    const end = () => {
      session.close();
      if (this.#controllers.delete(id)) this.#logger.info?.(`Controller disconnected (${ip})`);
    };
    ws.on('close', end);
    ws.on('error', end);
  }

  stop() {
    return new Promise((resolve) => {
      for (const c of this.#wss?.clients ?? []) { try { c.terminate(); } catch {} }
      this.#wss?.close();
      if (!this.#server) return resolve();
      this.#server.close(() => resolve());
    });
  }
}
