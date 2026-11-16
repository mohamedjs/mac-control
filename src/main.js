import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './composition-root.js';
import { rotateToken } from './kernel/token.js';
import { lanAddress } from './modules/server/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

const HELP = `
mac-control v${VERSION} — drive this Linux machine from your Mac's trackpad & keyboard

USAGE
  mac-control [command] [--port <n>] [--host <addr>]

COMMANDS
  start        Start the server (default)
  link         Print the pairing link to open in Chrome on the Mac
  rotate-key   Make a new pairing key (old links stop working)
  doctor       Check display, native input and network
  help         Show this help

OPTIONS
  --port <n>   Port to listen on (default 3030, or $PORT)
  --host <a>   Address to bind (default 0.0.0.0)
  -v           Print version
`;

function flag(argv, name, fallback) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
}

export async function main(argv = process.argv.slice(2)) {
  if (argv.includes('-v') || argv.includes('--version')) { console.log(VERSION); return 0; }
  const command = argv[0] && !argv[0].startsWith('-') ? argv[0] : 'start';
  if (command === 'help' || argv.includes('-h') || argv.includes('--help')) { console.log(HELP); return 0; }

  const port = Number(flag(argv, '--port', process.env.PORT || 3030));
  const host = flag(argv, '--host', '0.0.0.0');

  if (command === 'rotate-key') {
    const app = buildApp({ input: { hasDirect: false } });
    rotateToken(app.tokenFile);
    console.log('New pairing key created. Restart mac-control, then run "mac-control link".');
    return 0;
  }

  const app = buildApp();

  if (command === 'link') {
    const token = fs.readFileSync(app.tokenFile, 'utf8').trim();
    console.log(`http://${lanAddress()}:${port}/control#t=${token}`);
    return 0;
  }

  if (command === 'doctor') {
    const checks = [
      ['Display', process.env.DISPLAY || process.env.WAYLAND_DISPLAY ? `ok (${process.env.XDG_SESSION_TYPE || 'unknown'} ${process.env.DISPLAY || ''})` : 'MISSING — run from your desktop session'],
      ['Session type', process.env.XDG_SESSION_TYPE === 'wayland' ? 'Wayland — only XWayland apps receive input; use "Ubuntu on Xorg"' : 'ok'],
      ['Native input', app.input.hasDirect ? `ok (screen ${app.input.screen.width}×${app.input.screen.height})` : `FAILED — ${app.input.unavailableReason}`],
      ['LAN address', lanAddress()],
      ['Pairing key', app.tokenFile],
    ];
    for (const [k, v] of checks) console.log(`${k.padEnd(14)} ${v}`);
    return app.input.hasDirect ? 0 : 1;
  }

  if (command !== 'start') { console.error(`Unknown command "${command}"\n${HELP}`); return 1; }

  await app.server.start({ port, host });
  app.logger.info(`Listening on ${host}:${port}  (local status page: http://127.0.0.1:${port})`);
  app.logger.info(`Pairing link — open in Chrome on your Mac:\n\n    ${app.server.controlUrl}\n`);
  if (!app.input.hasDirect) app.logger.warn(`Input is NOT available: ${app.input.unavailableReason}`);

  const stop = async () => { await app.server.stop(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  return null;
}
