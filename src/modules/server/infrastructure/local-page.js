const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Status page served at "/". The pairing link (it contains the key) is only
 * rendered for requests from this machine itself.
 */
export function renderLocalPage({ local, controlUrl, status }) {
  const ready = status.inputReady;
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mac Control</title>
<style>
  :root { --bg:#f6f7f9; --surface:#fff; --text:#0f172a; --muted:#64748b; --line:#e2e8f0; --accent:#0369a1; --good:#15803d; --bad:#b91c1c;
    --font:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; --mono:ui-monospace,"SF Mono",Menlo,monospace; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0b0f17; --surface:#131a26; --text:#e5e7eb; --muted:#94a3b8; --line:#263042; --accent:#38bdf8; --good:#4ade80; --bad:#f87171; } }
  * { box-sizing:border-box; margin:0 } body { background:var(--bg); color:var(--text); font:15px/1.55 var(--font); padding:32px 16px; }
  main { max-width:640px; margin:0 auto; display:grid; gap:16px; }
  .card { background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:22px; display:grid; gap:12px; }
  h1 { font-size:20px; } h2 { font-size:15px; } .muted { color:var(--muted); font-size:13.5px; }
  code { font:12.5px var(--mono); word-break:break-all; } .row { display:flex; gap:10px; align-items:center; }
  .link { flex:1; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:var(--bg); }
  button { border:0; border-radius:8px; padding:10px 14px; background:var(--accent); color:#fff; font:600 14px var(--font); cursor:pointer; }
  .ok { color:var(--good); } .bad { color:var(--bad); } ol { padding-left:20px; display:grid; gap:6px; }
</style></head><body><main>
  <div class="card">
    <h1>Mac Control · ${esc(status.hostname)}</h1>
    <div class="${ready ? 'ok' : 'bad'}">${ready ? '● Ready to be controlled' : '● Input unavailable: ' + esc(status.inputProblem)}</div>
    <div class="muted">Controllers connected: <b id="n">${status.controllers.length}</b></div>
  </div>
  ${local ? `<div class="card">
    <h2>Pairing link — open it in Chrome on your Mac</h2>
    <div class="row"><code class="link" id="u">${esc(controlUrl)}</code><button onclick="navigator.clipboard.writeText(document.getElementById('u').textContent).then(()=>this.textContent='Copied ✓')">Copy</button></div>
    <div class="muted">The link contains a secret key. Anyone with it on your network can drive this machine. Run <code>mac-control rotate-key</code> to revoke it.</div>
  </div>
  <div class="card"><h2>First time on the Mac</h2><ol class="muted">
    <li>In Chrome open <code>chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>, add <code>${esc(new URL(controlUrl).origin)}</code>, enable, relaunch. This unlocks raw pointer input (lowest latency) and ⌘W / Esc capture.</li>
    <li>Open the pairing link, click <b>Take control</b>. Hold <b>Esc</b> to give control back.</li>
  </ol></div>` : `<div class="card muted">Open this page on the controlled machine itself to see the pairing link.</div>`}
</main>
<script>setInterval(async()=>{try{const r=await fetch('/api/status');if(r.ok){const s=await r.json();document.getElementById('n').textContent=s.controllers.length;}}catch{}},2000);</script>
</body></html>`;
}
