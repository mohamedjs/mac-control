import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { LiveInputSession } from '../src/modules/input/index.js';
import { buildApp } from '../src/composition-root.js';

function fakePort() {
  const calls = [];
  return {
    calls,
    hasDirect: true,
    moveBySync: (x, y) => calls.push(['move', x, y]),
    buttonSync: (b, d) => calls.push(['btn', b, d]),
    keySync: (k, d) => calls.push(['key', k, d]),
    scrollSync: (x, y) => calls.push(['scroll', x, y]),
  };
}

const tick = () => new Promise((r) => setImmediate(r));

test('LiveInputSession coalesces moves and keeps sub-pixel precision', async () => {
  const port = fakePort();
  const s = new LiveInputSession(port);
  s.handle({ t: 'm', x: 0.6, y: 0 });
  s.handle({ t: 'm', x: 0.6, y: 2 });
  s.handle({ t: 'm', x: 0.6, y: 3 });
  await tick();
  assert.deepEqual(port.calls, [['move', 1, 5]]);
  s.handle({ t: 'm', x: 0.3, y: 0 }); // 0.8 carried + 0.3 = 1.1
  await tick();
  assert.deepEqual(port.calls.at(-1), ['move', 1, 0]);
});

test('LiveInputSession flushes pending move before a click (ordering)', () => {
  const port = fakePort();
  const s = new LiveInputSession(port);
  s.handle({ t: 'm', x: 10, y: 10 });
  s.handle({ t: 'bd', b: 'left' });
  assert.deepEqual(port.calls, [['move', 10, 10], ['btn', 'left', true]]);
});

test('LiveInputSession maps physical codes, rejects unknown ones, releases held input on close', () => {
  const port = fakePort();
  const s = new LiveInputSession(port);
  s.handle({ t: 'kd', c: 'ControlLeft' });
  s.handle({ t: 'kd', c: 'KeyC' });
  s.handle({ t: 'kd', c: 'rm -rf /' });
  s.handle({ t: 'kd', c: '__proto__' });
  s.handle({ t: 'bd', b: 'right' });
  s.handle({ t: 'bd', b: 'evil' });
  assert.deepEqual(port.calls, [['key', 'control', true], ['key', 'c', true], ['btn', 'right', true]]);
  s.close();
  const released = port.calls.slice(3);
  assert.deepEqual(new Set(released.map(String)), new Set([['key', 'control', false], ['key', 'c', false], ['btn', 'right', false]].map(String)));
  s.handle({ t: 'kd', c: 'KeyA' });
  assert.equal(port.calls.length, 6, 'closed session must ignore input');
});

test('LiveInputSession turns trackpad pixels into wheel notches', () => {
  const port = fakePort();
  const s = new LiveInputSession(port);
  for (let i = 0; i < 10; i++) s.handle({ t: 'w', x: 0, y: 6 }); // 60 px → 1 notch, 20 px carried
  assert.deepEqual(port.calls, [['scroll', 0, 1]]);
  s.handle({ t: 'w', x: 0, y: -100 }); // -80 total → -2 notches
  assert.deepEqual(port.calls.at(-1), ['scroll', 0, -2]);
});

test('Controller socket requires the key and a same-host origin; input reaches the adapter', async () => {
  const port = fakePort();
  port.unavailableReason = null;
  port.screen = { width: 1920, height: 1080 };
  const app = buildApp({ tokenFile: null, input: port, logger: { info() {}, warn() {} } });
  const { port: PORT } = await app.server.start({ port: 0, host: '127.0.0.1' });
  const token = new URL(app.server.controlUrl).hash.split('t=')[1];
  assert.ok(token && token.length >= 16);

  const tryOpen = (url, headers) => new Promise((resolve) => {
    const ws = new WebSocket(url, { headers });
    ws.on('open', () => { ws.close(); resolve('open'); });
    ws.on('unexpected-response', (_req, res) => resolve(res.statusCode));
    ws.on('error', () => resolve('error'));
  });
  const base = `ws://127.0.0.1:${PORT}/control/ws`;
  assert.equal(await tryOpen(`${base}?t=wrong`), 401);
  assert.equal(await tryOpen(base), 401);
  assert.equal(await tryOpen(`${base}?t=${token}`, { Origin: 'http://evil.example' }), 403);
  assert.equal(await tryOpen(`ws://127.0.0.1:${PORT}/other`), 404);
  assert.equal(await tryOpen(`${base}?t=${token}`, { Origin: `http://127.0.0.1:${PORT}` }), 'open');

  const ws = new WebSocket(`${base}?t=${token}`);
  const pong = await new Promise((resolve, reject) => {
    ws.on('message', (raw) => {
      const m = JSON.parse(raw);
      if (m.t === 'hello') {
        assert.equal(m.available, true);
        ws.send(JSON.stringify({ t: 'kd', c: 'ShiftLeft' }));
        ws.send(JSON.stringify({ t: 'm', x: 3, y: 4 }));
        ws.send(JSON.stringify({ t: 'p', i: 7 }));
      }
      if (m.t === 'pong') resolve(m);
    });
    ws.on('error', reject);
  });
  assert.equal(pong.i, 7);
  ws.terminate();
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(port.calls, [['key', 'shift', true], ['move', 3, 4], ['key', 'shift', false]], 'held key must be released when the socket drops');

  const page = await fetch(`http://127.0.0.1:${PORT}/control`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /control\/ws/);
  const home = await (await fetch(`http://127.0.0.1:${PORT}/`)).text();
  assert.ok(home.includes(token), 'loopback status page shows the pairing link');

  await app.server.stop();
});
