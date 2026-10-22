/* The SUN is me, met by chance. A visitor coming close does not frighten it; it watches, its heart calm at 60 BPM,
   and on each beat its flesh pushes thorns out all round the rim. Poked (a click or tap on it, or a fast hit) it balls up. Scrolled on through About it is taken in: dark inside, then,
   sated, it comes back up at its calm size, the heart still a little quick, and settles.
   This file is the model only (no drawing). scene.js asks it for one state per frame.
   window.SUN_ATTACK.eaten turns true once it has gone dark; "sun:attack" fires with detail { held, eaten } on every change
   (held stays false), and "sun:eaten" when it goes dark. */
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function sm(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function io(v) { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function approach(v, to, rate, dt) { return v + (to - v) * (1 - Math.exp(-rate * dt)); }

  // ---------- input: mouse, pen or one finger (a touch ends = the visitor has gone) ----------
  var ptr = null;
  addEventListener("pointermove", function (e) { if (e.pointerType !== "touch") ptr = { x: e.clientX, y: e.clientY }; }, { passive: true });
  document.addEventListener("mouseleave", function () { ptr = null; });
  addEventListener("blur", function () { ptr = null; });
  // a finger lifted still counts for a moment, so a tap near the SUN is enough to make it bristle
  function touch(e) { var tp = e.touches[0]; if (tp) ptr = { x: tp.clientX, y: tp.clientY, touch: true }; else if (ptr) ptr.end = performance.now(); }
  addEventListener("touchstart", touch, { passive: true });
  addEventListener("touchmove", touch, { passive: true });
  addEventListener("touchend", touch, { passive: true });
  addEventListener("touchcancel", function () { ptr = null; }, { passive: true });
  // a poke: a click or a tap on the SUN itself (never on a link, a field or the text around it)
  var poke = null, press0 = null;
  addEventListener("pointerdown", function (e) {
    var el = e.target && e.target.closest ? e.target : null;
    press0 = e.isPrimary && !(el && el.closest("a,button,input,textarea,select,label,summary,p,li,h1,h2,h3,[role=button]")) ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
  }, { passive: true });
  addEventListener("pointercancel", function () { press0 = null; }, { passive: true });   // the finger went on to scroll
  addEventListener("pointerup", function (e) {
    var q = press0; press0 = null;
    if (q && performance.now() - q.t < 450 && Math.hypot(e.clientX - q.x, e.clientY - q.y) < 10) poke = { x: q.x, y: q.y };
  }, { passive: true });

  // ---------- heart: a strong beat and a weak one 180ms later ----------
  function pulse(x, a, d) { return x < 0 ? 0 : x < a ? x / a : Math.exp(-(x - a) / d); }
  function press(ph) { var x = ph - Math.floor(ph); return Math.min(1, pulse(x, .03, .075) + .45 * pulse(x - .18, .03, .075)); }

  // ---------- state ----------
  var S = { last: -1, cal: 0, round: 0, rs: 1, rsv: 0, lp: null, F: 0, dwell: 0, phase: 0, held: false, eaten: false, wx: 0, wy: 0, gulp: 0, back: -1, att: false, D: [0, 0], Dv: [0, 0], C: [0, 0], pl: null };
  var EXPORT = window.SUN_ATTACK = { progress: 0, held: false, eaten: false, recede: 0 };
  var OUT = { cx: 0, cy: 0, R: 1, ca: 1, sa: 0, qa: 1, qp: 1, shiver: 0, beat: 0, bpm: 60, agit: 0, fear: 0,
              attack: 0, heat: 0, thorn: { g: 0, lx: 1, ly: 0, len: .3 },
              dark: 0, vis: 1, inside: 0, pk: { x: 0, y: 0, dx: 0, dy: 0, s: 1 } };


  function roundUp() { S.round = 2.6; S.rsv -= 1.4; S.att = false; S.Dv = [0, 0]; }
  function step(t, g) { // t: seconds; g: { cx, cy, R, W, H, left, top, a (attack 0..1), gate (0..1 interactive), rec (0..1: recede after the hold) }
    var dt = S.last < 0 ? 1 / 60 : clamp(t - S.last, 0, .1); S.last = t;
    var cx0 = g.cx, cy0 = g.cy, R = g.R, W = g.W, H = g.H, a = clamp(g.a), wA = sm(a / .06), live = g.gate * (1 - wA);

    if (ptr && ptr.end && performance.now() - ptr.end > 900) ptr = null;
    // proximity of the visitor (1 = touching the rim)
    var p = 0, dx = 0, dy = 0, dist = 1e9, ux = 1, uy = 0;
    if (ptr && live > 0) {
      dx = ptr.x - g.left - cx0; dy = ptr.y - g.top - cy0; dist = Math.hypot(dx, dy) || 1; ux = dx / dist; uy = dy / dist;
      p = clamp(1 - (dist - R * .95) / (R * 1.45)) * live;
    }
    S.F = approach(S.F, p, p > S.F ? 5 : 1.4, dt);
    var F = S.F;
    S.dwell = p > .72 ? S.dwell + dt : Math.max(0, S.dwell - dt * 2);
    // a smoothed look direction (where the visitor is)
    if (ptr && live > 0) { S.wx = approach(S.wx, ux, 8, dt); S.wy = approach(S.wy, uy, 8, dt); }
    var wl = Math.hypot(S.wx, S.wy), lx = wl > 1e-3 ? S.wx / wl : 1, ly = wl > 1e-3 ? S.wy / wl : 0;

    // ---------- touch: as in the opening, flesh touched is carried along, tears free past a limit and wobbles back ----------
    var lim = R * .5 * .95, held0 = ptr && !ptr.end && live > .5;
    if (held0 && S.pl) {
      var vx = ptr.x - S.pl.x, vy = ptr.y - S.pl.y;
      if (!S.att && (vx || vy) && dist < R * .97) { S.att = true; S.C = [dx - S.D[0], dy - S.D[1]]; S.Dv = [0, 0]; }
      if (S.att) { S.D[0] += vx; S.D[1] += vy; if (Math.hypot(S.D[0], S.D[1]) > lim) { S.att = false; S.Dv = [vx / dt * .35, vy / dt * .35]; } }
    } else if (S.att) { S.att = false; S.Dv = [0, 0]; }
    if (!S.att) { var w2 = 2 * Math.PI * 1.05, z2 = .16; for (var q = 0; q < 2; q++) { S.Dv[q] += (-w2 * w2 * S.D[q] - 2 * z2 * w2 * S.Dv[q]) * dt; S.D[q] += S.Dv[q] * dt; } }
    S.pl = held0 ? { x: ptr.x, y: ptr.y } : null;
    var PK = OUT.pk; PK.x = S.C[0]; PK.y = S.C[1]; PK.dx = S.D[0]; PK.dy = S.D[1]; PK.s = R * .5;


    // ---------- poked, or hit fast, it balls up a little smaller, wobbles once and holds still a while ----------
    if (poke) { var pdx = poke.x - g.left - cx0, pdy = poke.y - g.top - cy0; if (live > .5 && pdx * pdx + pdy * pdy < R * R * 1.02) roundUp(); poke = null; }
    var spd = 0;
    if (ptr && !ptr.end && !ptr.touch && S.lp) spd = Math.hypot(ptr.x - S.lp.x, ptr.y - S.lp.y) / dt;
    S.lp = ptr && !ptr.end ? { x: ptr.x, y: ptr.y } : null;
    if (spd > 7 * R && dist < R && live > .5 && S.round <= 0) roundUp();
    if (S.round > 0) S.round -= dt;
    var rsT = S.round > 0 ? .9 : 1, w3 = 2 * Math.PI * 1.1, z3 = .42;
    S.rsv += (-w3 * w3 * (S.rs - rsT) - 2 * z3 * w3 * S.rsv) * dt; S.rs += S.rsv * dt;
    var curl = clamp((1 - S.rs) / .1);   // how balled up it is

    // ---------- on through About: the SUN is taken in; the dark, then it comes back up sated ----------
    var rc0 = sm(g.rec || 0);
    if (g.gulp > 0) S.gulp = Math.min(1, S.gulp + dt / 1.1 * (1 + 4 * rc0)); else if (g.gulp < 0) S.gulp = Math.max(0, S.gulp - dt / .8);
    var gp = S.gulp, done = gp >= .97;

    // ---------- heart ----------
    var rc = sm(g.rec || 0);   // on into Works it calms: back to its resting size, the heart still a little fast
    var heat = .2 * rc;
    var bpm = 60 + 112 * heat; S.phase += dt * bpm / 60;
    if (heat < .05) { var err = t - S.phase; err -= Math.round(err); S.phase += err * Math.min(1, dt * .8); }   // calm again: back on the world's beat
    var beat = press(S.phase);
    // ---------- thorns: calm, each beat pushes them out all round the rim and they sink back (never before the opening has handed over) ----------
    var calmT = g.gate * (1 - wA) * (1 - rc) * (S.att || S.round > 0 ? 0 : 1);
    S.cal = approach(S.cal, calmT, calmT > S.cal ? 1.2 : 6, dt);
    var TH = OUT.thorn; TH.g = beat * S.cal; TH.len = .2;

    // ---------- body ----------
    var scale = (1 + .034 * heat * beat) * S.rs;   // calm, the SUN is as still as the opening left it; the beat swells it only when it is stirred
    // a visitor near does not frighten it: it only watches a little
    var watch = .05 * (ptr && live > 0 ? 1 : 0) * live * (1 - curl);
    var ox = lx * watch * R, oy = ly * watch * R;
    var room = 24; ox = clamp(ox, -room - R * .1, room + R * .1); oy = clamp(oy, -room, room);
    var ca = lx, sa = ly, qa = 1, qp = 1;
    var shiver = .004 * rc;
    var cx = cx0 + ox, cy = cy0 + oy;
    if (a > 0) {
      cx = lerp(cx, cx0, wA); cy = lerp(cy, cy0, wA); ca = lerp(ca, 1, wA); sa = lerp(sa, 0, wA);
    }
    if (rc > 0) { scale = lerp(scale, 1 + .034 * heat * beat, rc); cx = lerp(cx, cx0, rc); cy = lerp(cy, cy0, rc); qa = lerp(qa, 1, rc); qp = lerp(qp, 1, rc); ca = lerp(ca, 1, rc); sa = lerp(sa, 0, rc); }
    var ql = Math.hypot(ca, sa) || 1;
    // sated: as it comes back up it gives one slow, full swell and settles
    if (done && rc0 > 0) { if (S.back < 0) S.back = t; var tb = t - S.back; scale *= 1 + .06 * Math.exp(-tb / 1.1) * Math.sin(Math.min(tb * 2.6, 20)); qp *= 1 - .03 * Math.exp(-tb / 1.1) * Math.sin(Math.min(tb * 2.6, 20)); }
    else if (!done) S.back = -1;


    OUT.cx = cx; OUT.cy = cy; OUT.R = R * scale; OUT.ca = ca / ql; OUT.sa = sa / ql; OUT.qa = qa; OUT.qp = qp; OUT.shiver = shiver; OUT.beat = beat; OUT.bpm = bpm;
    OUT.fear = F; OUT.heat = heat; OUT.attack = a;
    OUT.live = live * (1 - rc); OUT.round = S.round > 0 ? 1 : 0;   // for the pods (sun-amoeba.js)
    OUT.dark = done ? 1 - sm(rc0 / .8) : sm((gp - .5) / .3);
    OUT.vis = done ? (rc0 > 0 ? 1 : 0) : 1 - sm((gp - .75) / .2);   // sated, it comes back up out of the dark
    OUT.inside = sm((gp - .6) / .3) * (1 - sm(rc0 / .7));
    OUT.agit = .08 * rc;
    // handoff
    var held = false, eaten = gp >= .56;
    EXPORT.progress = 0; EXPORT.recede = rc;
    if (held !== S.held || eaten !== S.eaten) {
      var ate = eaten && !S.eaten; S.held = held; S.eaten = eaten; EXPORT.held = held; EXPORT.eaten = eaten;
      try { dispatchEvent(new CustomEvent("sun:attack", { detail: { held: held, eaten: eaten } })); if (ate) dispatchEvent(new CustomEvent("sun:eaten")); } catch (e) {}
    }
    return OUT;
  }
  window.SUN_FEAR = { step: step };
})();
