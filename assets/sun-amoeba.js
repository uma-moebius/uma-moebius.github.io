/* The SUN's flesh as an amoeba. It senses the pointer (or a finger held down on it) and reaches toward it with rounded
   pseudopods, stopping just short; new ones bulge out beside the first, hesitate and sink back. What goes into a pod leaves
   the round body, so it is always the same amount of flesh. Never past the text around it, never before the opening has
   handed over; poked, it pulls every pod back at once. Left alone it settles into the round SUN.
   This file is the model only (no drawing). scene.js asks it for one state per frame. */
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sm(v) { v = v < 0 ? 0 : v > 1 ? 1 : v; return v * v * (3 - 2 * v); }
  function approach(v, to, rate, dt) { return v + (to - v) * (1 - Math.exp(-rate * dt)); }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }

  // ---------- input: a mouse or pen anywhere; a finger only while it is held down, having landed on the SUN ----------
  var mouse = null, finger = null, geo = null;
  addEventListener("pointermove", function (e) { if (e.pointerType !== "touch") mouse = { x: e.clientX, y: e.clientY }; }, { passive: true });
  document.addEventListener("mouseleave", function () { mouse = null; });
  addEventListener("blur", function () { mouse = null; finger = null; });
  function onSun(x, y) { if (!geo) return false; var dx = x - geo.x, dy = y - geo.y; return dx * dx + dy * dy < geo.r * geo.r; }
  addEventListener("touchstart", function (e) { var tp = e.touches[0]; finger = tp && e.touches.length === 1 && onSun(tp.clientX, tp.clientY) ? { x: tp.clientX, y: tp.clientY } : null; }, { passive: true });
  addEventListener("touchmove", function (e) { var tp = e.touches[0]; if (finger && tp) { finger.x = tp.clientX; finger.y = tp.clientY; } }, { passive: true });
  addEventListener("touchend", function (e) { if (!e.touches.length) finger = null; }, { passive: true });
  addEventListener("touchcancel", function () { finger = null; }, { passive: true });

  // ---------- pods: a fixed pool, tips kept relative to the middle of the body ----------
  var NP = 6, on = new Uint8Array(NP), kind = new Uint8Array(NP), ret = new Uint8Array(NP);
  var tx = new Float32Array(NP), ty = new Float32Array(NP), w = new Float32Array(NP), age = new Float32Array(NP), life = new Float32Array(NP), gx = new Float32Array(NP), gy = new Float32Array(NP);
  var OUT = { n: NP, on: on, tx: tx, ty: ty, w: w, cs: 1, busy: 0, lead: -1, lux: 1, luy: 0, flow: 0 };
  var FLAT = .38, S = { side: 1, last: -1, cs: 1, lead: -1, sideT: 0, sideN: 0, calm: 0, ax: 0, ay: 0, lux: 1, luy: 0 };
  function spawn(k, ux, uy, ww, r, Px, Py, lf) {
    for (var q = 0; q < NP; q++) if (!on[q]) { on[q] = 1; kind[q] = k; ret[q] = 0; tx[q] = ux * r * .5; ty[q] = uy * r * .5; w[q] = ww; age[q] = 0; life[q] = lf; gx[q] = Px; gy[q] = Py; return q; }
    return -1;
  }
  // a tip may not reach into the text around the SUN: walk it back toward the middle until it is clear
  function clear(px, py, ww, g) {
    var A = g.avoid; if (!A || !A.length) return 1;
    for (var s = 0; s < 12; s++) {
      var f = 1 - s / 12, x = g.cx + px * f, y = g.cy + py * f, hit = false;
      for (var a = 0; a < A.length; a++) { var b = A[a]; if (x > b[0] - ww && x < b[2] + ww && y > b[1] - ww && y < b[3] + ww) { hit = true; break; } }
      if (!hit) return f;
    }
    return 0;
  }

  function step(t, g) { // g: { cx, cy, R (resting radius), left, top, live (0..1), round (poked: 1) , avoid: [[l, t, r, b], ...] in field px }
    var dt = S.last < 0 ? 1 / 60 : clamp(t - S.last, 0, .1); S.last = t;
    var R = g.R, rc = R * S.cs, q;
    geo = { x: g.cx + g.left, y: g.cy + g.top, r: rc };
    // ---------- what it senses ----------
    var src = g.live > .5 && !g.round ? (finger || mouse) : null, sx = 0, sy = 0, dist = 0, ux = 1, uy = 0, sig = 0;
    if (src) {
      sx = src.x - g.left - g.cx; sy = src.y - g.top - g.cy; dist = Math.hypot(sx, sy) || 1; ux = sx / dist; uy = sy / dist;
      sig = dist > rc + R * .06 ? sm(1 - (dist - R) / (R * 1.5)) : 0;   // close, and not on the body itself
      // a pod lying flat draws long flat rows in the flesh: keep it off the horizontal (which side, with some hysteresis), and let it sway slowly
      var an0 = Math.atan2(uy, ux);
      if (uy > .2) S.side = 1; else if (uy < -.2) S.side = -1;
      if (Math.abs(uy) < Math.sin(FLAT)) an0 = ux > 0 ? S.side * FLAT : Math.PI - S.side * FLAT;
      an0 += .07 * Math.sin(t * .45); ux = Math.cos(an0); uy = Math.sin(an0);
    }
    // it settles: once the pointer has rested a while, no more new pods, the reaching one just holds
    var mv = src ? Math.hypot(sx - S.ax, sy - S.ay) : 0; S.ax = sx; S.ay = sy;
    S.calm = mv > .5 ? 0 : S.calm + dt;
    var vext = R * 1.1, vret = R * (g.round ? 2.6 : .8);
    if (sig > .02) {
      if (S.lead >= 0) { var lx = tx[S.lead], ly = ty[S.lead], ll = Math.hypot(lx, ly) || 1; if ((lx * ux + ly * uy) / ll < Math.cos(.8)) { ret[S.lead] = 1; S.lead = -1; } }
      if (S.lead < 0) S.lead = spawn(0, ux, uy, R * .3, rc, 0, 0, 1e9);
      if (S.lead >= 0) {
        var q0 = S.lead, wl = w[q0], reach = Math.min(dist - R * .1 - wl * .8, rc + R * .55 * sig), f0 = clear(ux * reach, uy * reach, wl * .6, g);
        reach = Math.max(rc * .6, reach * f0); gx[q0] = ux * reach; gy[q0] = uy * reach;
      }
      // exploring pods to either side, only while the pointer is still on the move
      if (S.calm < 1.5) {
        S.sideT -= dt;
        if (S.sideT <= 0) {
          var hs = hash(S.sideN, 1.7), an = Math.atan2(uy, ux) + (S.sideN & 1 ? 1 : -1) * (.65 + .55 * hs); if (Math.abs(Math.sin(an)) < Math.sin(FLAT)) an = Math.cos(an) > 0 ? (Math.sin(an) < 0 ? -FLAT : FLAT) : Math.PI - (Math.sin(an) < 0 ? -FLAT : FLAT);
          var cu = Math.cos(an), su = Math.sin(an);
          var rs = rc + R * (.12 + .16 * hash(S.sideN, 3.3)) * sig, fs = clear(cu * rs, su * rs, R * .1, g);
          if (fs > .9) spawn(1, cu, su, R * (.17 + .05 * hash(S.sideN, 4.4)), rc, cu * rs, su * rs, .9 + .7 * hash(S.sideN, 5.1));
          S.sideT = .7 + .6 * hash(S.sideN, 9.1); S.sideN++;
        }
      }
      S.lux = approach(S.lux, ux, 4, dt); S.luy = approach(S.luy, uy, 4, dt);
    } else if (S.lead >= 0) { ret[S.lead] = 1; S.lead = -1; }
    // ---------- pods move: tips flow toward their goal, eased at both ends; retracting ones flow back into the body ----------
    var area = 0, busy = 0, lead = S.lead;
    for (q = 0; q < NP; q++) if (on[q]) {
      age[q] += dt;
      if (g.round || g.live <= .5) ret[q] = 1;
      if (kind[q] === 1 && age[q] > life[q]) ret[q] = 1;
      var px = tx[q], py = ty[q], pl = Math.hypot(px, py) || 1;
      if (ret[q]) {
        var rv = vret * (.25 + .75 * sm(pl / (R * .5))) * dt; pl = Math.max(0, pl - rv);
        tx[q] = px / (Math.hypot(px, py) || 1) * pl; ty[q] = py / (Math.hypot(px, py) || 1) * pl;
        if (pl + w[q] * .7 < rc) { on[q] = 0; continue; }
      } else {
        var dx = gx[q] - px, dy = gy[q] - py, dd = Math.hypot(dx, dy) || 1, v = vext * (kind[q] ? .55 : 1) * sm(age[q] / .5 + .15) * sm(dd / (R * .3)) * dt;
        if (v > dd) v = dd; tx[q] += dx / dd * v; ty[q] += dy / dd * v;
      }
      var vis = Math.hypot(tx[q], ty[q]) + w[q] * .6 - rc;
      if (vis > 0) { area += vis * 2 * w[q] * .9; busy = Math.max(busy, sm(vis / (R * .08))); }
    }
    // the same amount of flesh: what the pods hold leaves the round body
    var csT = Math.sqrt(Math.max(.55, 1 - area / (Math.PI * R * R)));
    S.cs = area > 0 || S.cs !== 1 ? approach(S.cs, csT, 5, dt) : 1;
    if (Math.abs(S.cs - 1) < 1e-4 && area === 0) S.cs = 1;
    OUT.cs = S.cs; OUT.busy = busy; OUT.lead = lead; OUT.lux = S.lux; OUT.luy = S.luy;
    return OUT;
  }
  window.SUN_AMOEBA = { step: step };
})();
