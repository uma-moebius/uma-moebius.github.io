/* The SUN is me, met by chance. A visitor coming close frightens it: it shrinks, shivers and turns away while its heart
   races; come closer or stay and it lunges. Leave and it calms back to 60 BPM and watches. Scrolling on, it cowers and braces.
   This file is the model only (no drawing). scene.js asks it for one state per frame.
   window.SUN_ATTACK.progress (0..1) tracks the scroll, .held turns true at its end, and a "sun:attack" event fires with detail.held on every change. */
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
  function touch(e) { var tp = e.touches[0]; ptr = tp ? { x: tp.clientX, y: tp.clientY } : null; }
  addEventListener("touchstart", touch, { passive: true });
  addEventListener("touchmove", touch, { passive: true });
  addEventListener("touchend", touch, { passive: true });
  addEventListener("touchcancel", function () { ptr = null; }, { passive: true });

  // ---------- heart: a strong beat and a weak one 180ms later ----------
  function pulse(x, a, d) { return x < 0 ? 0 : x < a ? x / a : Math.exp(-(x - a) / d); }
  function press(ph) { var x = ph - Math.floor(ph); return Math.min(1, pulse(x, .03, .075) + .45 * pulse(x - .18, .03, .075)); }

  // ---------- state ----------
  var S = { last: -1, F: 0, dwell: 0, phase: 0, bite: null, cool: 0, held: false, wx: 0, wy: 0 };
  var EXPORT = window.SUN_ATTACK = { progress: 0, held: false, recede: 0 };
  var OUT = { cx: 0, cy: 0, R: 1, ca: 1, sa: 0, qa: 1, qp: 1, shiver: 0, beat: 0, bpm: 60, jx: 0, jy: 0, agit: 0, ringK: 1, ringO: 1, fear: 0,
              attack: 0, heat: 0, tense: 0 };


  function step(t, g) { // t: seconds; g: { cx, cy, R, W, H, left, top, a (attack 0..1), gate (0..1 interactive), rec (0..1: recede after the hold) }
    var dt = S.last < 0 ? 1 / 60 : clamp(t - S.last, 0, .1); S.last = t;
    var cx0 = g.cx, cy0 = g.cy, R = g.R, W = g.W, H = g.H, a = clamp(g.a), wA = sm(a / .06), live = g.gate * (1 - wA);

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

    // ---------- the bite (pointer driven) ----------
    S.cool = Math.max(0, S.cool - dt);
    if (!S.bite && S.cool <= 0 && live > .5 && (p > .97 || S.dwell > 1.15)) { S.bite = { t0: t, ux: ux, uy: uy, dist: dist }; S.dwell = 0; }
    var bL = 0, bCoil = 0, bAct = 0, B = S.bite;
    if (B) { // coil → lunge → recoil
      var bt = t - B.t0;
      bCoil = sm(bt / .16) * (1 - sm((bt - .17) / .1));
      bL = bt < .16 ? -.15 * sm(bt / .16) : bt < .24 ? sm((bt - .16) / .08) : bt < .4 ? 1 : 1 - .65 * io((bt - .4) / .5) - .35 * io((bt - .9) / .5);
      bAct = 1 - sm((bt - .5) / .7);
      if (bt > 1.4) { S.bite = null; S.cool = .45; }
    }

    // ---------- the scroll: it cowers and braces ----------
    var ten = sm(a / .4);

    // ---------- heart ----------
    var rc = sm(g.rec || 0);   // on into Works it calms: back to its resting size, the heart still a little fast
    var heat = lerp(Math.max(F, ten, bAct), .2, rc);
    var bpm = 60 + 112 * heat; S.phase += dt * bpm / 60;
    if (heat < .05) { var err = t - S.phase; err -= Math.round(err); S.phase += err * Math.min(1, dt * .8); }   // calm again: back on the world's beat
    var beat = press(S.phase);

    // ---------- body ----------
    var shrink = .17 * F + .07 * bCoil + .15 * ten;   // scrolled at, it cowers: smaller and smaller as the strain builds
    var scale = (1 - shrink) * (1 + .034 * heat * beat);   // calm, the SUN is as still as the opening left it; the beat swells it only when it is stirred
    // fear: shy away from the visitor, squashed away from it; calm: watch it a little
    var shy = (.2 * F) * (1 - Math.max(0, bL)), watch = .05 * (1 - F) * (ptr && live > 0 ? 1 : 0) * live;
    var ox = (-lx * shy + lx * watch) * R, oy = (-ly * shy + ly * watch) * R;
    var room = R * shrink + 24; ox = clamp(ox, -room - R * .1, room + R * .1); oy = clamp(oy, -room, room);
    // the lunge: toward where the visitor was when it struck
    var ca = lx, sa = ly, qa = 1 - .11 * F, qp = 1 + .05 * F;
    if (B || bL !== 0) {
      var Bv = B; if (Bv) {
        var reach = Math.min(R * .6, Math.max(R * .15, Bv.dist - R * .4)) * bL;
        ox = lerp(ox, 0, Math.max(0, bL)) + Bv.ux * reach; oy = lerp(oy, 0, Math.max(0, bL)) + Bv.uy * reach;
        ca = Bv.ux; sa = Bv.uy; qa = lerp(qa, 1 + .22 * Math.max(0, bL), Math.max(0, bL)); qp = lerp(qp, 1 - .09 * Math.max(0, bL), Math.max(0, bL));
      }
    }
    var shiver = .004 * rc + (1 - rc) * .016 * F + .022 * bCoil + .03 * ten;
    var cx = cx0 + ox, cy = cy0 + oy;
    if (a > 0) {
      cx = lerp(cx, cx0, wA); cy = lerp(cy, cy0, wA);
      qa = lerp(qa, 1 + .06 * ten, wA); qp = lerp(qp, 1 - .09 * ten, wA); ca = lerp(ca, 1, wA); sa = lerp(sa, 0, wA);   // braced: hunched wide and low
    }
    if (rc > 0) { scale = lerp(scale, 1 + .034 * heat * beat, rc); cx = lerp(cx, cx0, rc); cy = lerp(cy, cy0, rc); qa = lerp(qa, 1, rc); qp = lerp(qp, 1, rc); ca = lerp(ca, 1, rc); sa = lerp(sa, 0, rc); }
    var ql = Math.hypot(ca, sa) || 1;


    OUT.cx = cx; OUT.cy = cy; OUT.R = R * scale; OUT.ca = ca / ql; OUT.sa = sa / ql; OUT.qa = qa; OUT.qp = qp; OUT.shiver = shiver; OUT.beat = beat; OUT.bpm = bpm;
    OUT.jx = 0; OUT.jy = 0; OUT.fear = F; OUT.heat = heat; OUT.attack = a;
    OUT.agit = lerp(Math.max(F * .55, ten * .85, bAct * .7), .08, rc);
    OUT.ringK = lerp(1 - .12 * F - .16 * ten, 1, rc); OUT.ringO = 1; OUT.tense = ten * (1 - rc);   // the ring draws in and holds its breath
    // handoff
    var held = a >= 1 && rc <= 0;
    EXPORT.progress = a; EXPORT.recede = rc;
    if (held !== S.held) { S.held = held; EXPORT.held = held; try { dispatchEvent(new CustomEvent("sun:attack", { detail: { held: held } })); } catch (e) {} }
    return OUT;
  }
  window.SUN_FEAR = { step: step };
})();
