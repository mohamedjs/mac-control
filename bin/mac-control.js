#!/usr/bin/env node
import { main } from '../src/main.js';

main().then((code) => {
  if (typeof code === 'number') process.exit(code);
}).catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
