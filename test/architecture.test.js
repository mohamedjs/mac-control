import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
});

test('module boundaries: domain is pure, cross-module imports go through index.js', () => {
  const src = join(process.cwd(), 'src');
  for (const file of walk(src)) {
    const rel = relative(src, file);
    const imports = [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    if (rel.includes('/domain/')) {
      for (const imp of imports) {
        assert.ok(!/infrastructure|application|^(node:)?(fs|net|http|child_process)$|^ws$/.test(imp), `${rel} imports "${imp}"`);
      }
    }
    const mod = /^modules\/([^/]+)\//.exec(rel)?.[1];
    if (!mod) continue;
    for (const imp of imports) {
      const other = /modules\/([^/]+)\/(.+)/.exec(imp);
      if (other && other[1] !== mod) assert.equal(other[2], 'index.js', `${rel} reaches into ${imp}`);
    }
  }
});
