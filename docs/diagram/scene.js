// Mac Control architecture as Excalidraw element skeletons. Render: node docs/diagram/render.mjs docs
const C = {
  user: ["#1e1e1e", "#ffec99"],
  pres: ["#1971c2", "#a5d8ff"],
  orch: ["#9c36b5", "#eebefa"],
  core: ["#2f9e44", "#b2f2bb"],
  base: ["#e8590c", "#ffd8a8"],
  kern: ["#495057", "#e9ecef"],
  ext:  ["#c2255c", "#fcc2d7"],
  store:["#0c8599", "#99e9f2"],
  root: ["#f08c00", "#fff3bf"],
};
const els = [];
function box(id, x, y, w, h, text, kind, opts = {}) {
  const [stroke, bg] = C[kind];
  B[id] = { x, y, w, h };
  els.push({
    type: opts.shape || "rectangle", id, x, y, width: w, height: h,
    strokeColor: stroke, backgroundColor: bg, fillStyle: "hachure",
    strokeWidth: 2, roughness: 1, roundness: { type: 3 },
    label: { text, fontSize: opts.fs || 18, fontFamily: 1, strokeColor: "#1e1e1e" },
  });
}
function frame(x, y, w, h, title, kind) {
  const [stroke] = C[kind];
  els.push({ type: "rectangle", x, y, width: w, height: h, strokeColor: stroke,
    backgroundColor: "transparent", strokeStyle: "dashed", strokeWidth: 1, roughness: 1,
    roundness: { type: 3 } });
  els.push({ type: "text", x: x + 14, y: y + 8, text: title, fontSize: 22, fontFamily: 1,
    strokeColor: stroke });
}
function text(x, y, t, fs = 20, color = "#1e1e1e") {
  els.push({ type: "text", x, y, text: t, fontSize: fs, fontFamily: 1, strokeColor: color });
}
const B = {};
function arrow(from, to, label, opts = {}) {
  const a0 = B[from], b0 = B[to], P = 6;
  let x1, y1, x2, y2;
  const ovX = Math.min(a0.x + a0.w, b0.x + b0.w) - Math.max(a0.x, b0.x);
  if (b0.y >= a0.y + a0.h || a0.y >= b0.y + b0.h) {        // vertical
    const down = b0.y >= a0.y + a0.h;
    const cx = ovX > 40 ? (Math.max(a0.x, b0.x) + Math.min(a0.x + a0.w, b0.x + b0.w)) / 2 : null;
    x1 = cx ?? a0.x + a0.w / 2; x2 = cx ?? b0.x + b0.w / 2;
    y1 = down ? a0.y + a0.h + P : a0.y - P; y2 = down ? b0.y - P : b0.y + b0.h + P;
  } else {                                                   // horizontal
    const right = b0.x >= a0.x + a0.w;
    const ovY = Math.min(a0.y + a0.h, b0.y + b0.h) - Math.max(a0.y, b0.y);
    const cy = ovY > 20 ? (Math.max(a0.y, b0.y) + Math.min(a0.y + a0.h, b0.y + b0.h)) / 2 : null;
    y1 = cy ?? a0.y + a0.h / 2; y2 = cy ?? b0.y + b0.h / 2;
    x1 = right ? a0.x + a0.w + P : a0.x - P; x2 = right ? b0.x - P : b0.x + b0.w + P;
  }
  if (opts.from) [x1, y1] = opts.from;
  if (opts.to) [x2, y2] = opts.to;
  const a = { type: "arrow", x: x1, y: y1, points: [[0, 0], [x2 - x1, y2 - y1]],
    width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
    strokeColor: opts.color || "#343a40", strokeWidth: 2, roughness: 1,
    strokeStyle: opts.dashed ? "dashed" : "solid", endArrowhead: "arrow" };
  if (opts.both) a.startArrowhead = "arrow";
  if (label) a.label = { text: label, fontSize: 15, fontFamily: 1 };
  els.push(a);
}

// ================================================================ Mac Control
text(40, 20, "Mac Control — architecture", 44);
text(40, 82, "your Mac's trackpad & keyboard drive a Linux machine · one Node process · ~0.1 ms per event on the laptop", 20, "#495057");

// ---- the Mac (left)
frame(30, 130, 430, 640, "Mac — nothing installed", "user");
box("you", 60, 180, 370, 110, "🧑 You\ntrackpad · clicks · two-finger\nscroll · keyboard", "user", { shape: "ellipse", fs: 17 });
box("page", 60, 330, 370, 200, "Chrome: /control page\nPointer Lock (raw deltas)\npointerrawupdate · Keyboard Lock\nKeyboardEvent.code (physical keys)\n⌘ → Ctrl swap · ⌘-combo taps\nping every 100 ms (Wi-Fi awake)", "pres", { fs: 16 });
box("hud", 60, 570, 370, 90, "live latency HUD\none-way ≈ RTT/2 · avg · p95", "pres", { fs: 16 });
text(60, 690, "hold Esc → control returns to the Mac", 17, "#1971c2");

// ---- the wire
box("wire", 500, 380, 300, 110, "WebSocket over Wi-Fi\nTCP_NODELAY · no deflate\ntiny JSON frames {t:'m', x, y}\n← pong + µs stats back", "orch", { fs: 16 });

// ---- the Linux machine
frame(840, 130, 1050, 640, "Linux laptop — mac-control (Node)", "core");
box("srv", 870, 180, 990, 120, "server/  HttpWsServer   GET /control · GET / (status, link only on loopback) · /health\nWS /control/ws  →  Origin must match host  ·  pairing key (constant-time compare)  ·  else 401 / 403", "orch", { fs: 17 });
box("sess", 870, 340, 480, 230, "input/application\nLiveInputSession (one per Mac)\n• moves in one tick → summed\n• sub-pixel remainder kept\n• click/key flushes the move first\n• wheel px → X11 notches (40 px)\n• releases held keys on disconnect", "core", { fs: 16 });
box("map", 1380, 340, 480, 110, "input/domain  KeyCodes\nbrowser code → libnut key name\nunknown codes are dropped", "base", { fs: 16 });
box("adapter", 1380, 470, 480, 100, "input/infrastructure  LibnutInputAdapter\nsetMouseDelay(0) · setKeyboardDelay(0)\nsync calls, clamp to screen", "base", { fs: 16 });
box("kernel", 870, 610, 480, 120, "kernel/  token (pairing key, 0600)\nlogger · paths (~/.config/mac-control)", "kern", { fs: 16 });
box("x11", 1380, 610, 480, 120, "X11 / XTest\ncursor, buttons, keys, wheel\nland in the focused app", "ext", { fs: 17 });

// ---- arrows
arrow("you", "page", "");
arrow("page", "hud", "");
arrow("page", "wire", "", { from: [436, 430], to: [494, 430] });
arrow("wire", "srv", "", { from: [806, 430], to: [864, 240] });
arrow("srv", "sess", "", { from: [1110, 306], to: [1110, 334] });
arrow("sess", "map", "", { from: [1356, 395], to: [1374, 395] });
arrow("sess", "adapter", "", { from: [1356, 520], to: [1374, 520] });
arrow("adapter", "x11", "", { color: "#c2255c" });

// ---- the budget
frame(30, 810, 1860, 200, "Latency budget (measured on the laptop)", "orch");
const steps = [
  ["b1", "Mac input event\n(pointerrawupdate)"],
  ["b2", "Wi-Fi hop\n~1–5 ms one-way\n(power save off)"],
  ["b3", "parse + session\n~12–17 µs"],
  ["b4", "XTest inject\n~0.12 ms"],
  ["b5", "cursor moved\nsend→move 1.15 ms\non loopback"],
];
const bw = 300, bg = 60;
steps.forEach(([id, t], i) => box(id, 70 + i * (bw + bg), 860, bw, 110, t, "orch", { fs: 17 }));
for (let i = 0; i < steps.length - 1; i++) arrow(steps[i][0], steps[i + 1][0], "");

window.SCENE = els;
