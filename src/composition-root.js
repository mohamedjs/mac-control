import path from 'node:path';
import { createLogger } from './kernel/logger.js';
import { getAppPaths } from './kernel/paths.js';
import { loadOrCreateToken } from './kernel/token.js';
import { LibnutInputAdapter, LiveInputSession } from './modules/input/index.js';
import { HttpWsServer } from './modules/server/index.js';

/** The only place modules are wired together. */
export function buildApp(options = {}) {
  const logger = options.logger ?? createLogger('mac-control');
  const paths = getAppPaths('mac-control');
  const tokenFile = 'tokenFile' in options ? options.tokenFile : path.join(paths.configDir, 'pairing-key');
  const input = options.input ?? new LibnutInputAdapter(logger);
  const token = loadOrCreateToken(tokenFile);
  const server = new HttpWsServer({
    token,
    input,
    logger,
    createSession: () => new LiveInputSession(input),
  });
  return { logger, paths, tokenFile, input, server };
}
