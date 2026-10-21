/* The SUN is me, met by chance. A visitor coming close frightens it: it shrinks, shivers and turns away while its heart
   races, and its flesh pushes out thorns, longest toward the visitor and longer the longer it stays. Leave and they sink back,
   and it calms back to 60 BPM and watches. Scrolling on, it cowers, then its flesh parts slowly into a mouth with thick lips,
   strands of the same flesh stretching between them, thinning, sagging and snapping one by one. Then it eats the visitor:
   it lunges, the mouth grows past the screen's edges and the lips close over it. Dark inside. Sated, it comes back up at its
   calm size, the heart still a little quick, and settles.
   This file is the model only (no drawing). scene.js asks it for one state per frame.
   window.SUN_ATTACK.progress (0..1) is how far its mouth is open, .held turns true once it gapes fully, .eaten once the lips
   have closed over the visitor; "sun:attack" fires with detail { held, eaten } on every change, and "sun:eaten" when it eats. */
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
  function touch(e) { var tp = e.touches[0]; if (tp) ptr = { x: tp.clientX, y: tp.clientY }; else if (ptr) ptr.end = performance.now(); }
  addEventListener("touchstart", touch, { passive: true });
  addEventListener("touchmove", touch, { passive: true });
  addEventListener("touchend", touch, { passive: true });
  addEventListener("touchcancel", function () { ptr = null; }, { passive: true });

  // ---------- heart: a strong beat and a weak one 180ms later ----------
  function pulse(x, a, d) { return x < 0 ? 0 : x < a ? x / a : Math.exp(-(x - a) / d); }
  function press(ph) { var x = ph - Math.floor(ph); return Math.min(1, pulse(x, .03, .075) + .45 * pulse(x - .18, .03, .075)); }

  // ---------- state ----------
  var S = { last: -1, F: 0, dwell: 0, phase: 0, held: false, eaten: false, wx: 0, wy: 0, grow: 0, mo: 0, kick: 0, snap: [], gulp: 0, back: -1, att: false, D: [0, 0], Dv: [0, 0], C: [0, 0], pl: null };
  // the strands of flesh across the open mouth: where they hang (across its width), how wide, and how far open it is when each one snaps
  var STR = [[-.6, 1.5, .34], [-.38, 2.4, .58], [-.17, 1.8, .8], [.02, 2.8, .95], [.2, 1.6, .5], [.4, 2.2, .7], [.6, 1.4, .42]];
  var EXPORT = window.SUN_ATTACK = { progress: 0, held: false, eaten: false, recede: 0 };
  var OUT = { cx: 0, cy: 0, R: 1, ca: 1, sa: 0, qa: 1, qp: 1, shiver: 0, beat: 0, bpm: 60, jx: 0, jy: 0, agit: 0, ringK: 1, ringO: 1, fear: 0,
              attack: 0, heat: 0, tense: 0, thorn: { g: 0, lx: 1, ly: 0, len: .3 },
              mouth: { open: 0, W: .5, HU: 0, HL: 0, y: .12, wob: 0, str: [] }, dark: 0, vis: 1, inside: 0, pk: { x: 0, y: 0, dx: 0, dy: 0, s: 1 } };
  for (var si = 0; si < STR.length; si++) { S.snap.push(-1); OUT.mouth.str.push({ u: STR[si][0], w: STR[si][1], st: 0, rt: 0 }); }


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

    // ---------- thorns (pointer driven): they push out with the visitor's nearness, faster and longer as it lingers ----------
    var linger = Math.min(1, S.dwell / 1.6), want = clamp(p * 1.15) * (1 + .35 * linger);
    S.grow = approach(S.grow, want, want > S.grow ? 2.2 + 4 * linger : 2.4, dt);
    var TH = OUT.thorn; TH.g = S.grow; TH.lx = lx; TH.ly = ly; TH.len = .32 + .28 * linger;

    // ---------- the scroll: it cowers and braces, then its flesh parts into a mouth, slowly, heavily ----------
    var ten = sm(a / .3) * (1 - sm((a - .3) / .4));
    var mT = sm((a - .28) / .72) * (1 - sm(g.rec || 0));
    S.mo = approach(S.mo, mT, mT > S.mo ? 1.5 : 2.2, dt);   // thick: it never quite keeps up with the scroll
    var mo = S.mo, M = OUT.mouth;
    S.kick = Math.max(0, S.kick - dt * 2.5);
    for (var k = 0; k < STR.length; k++) { // each strand stretches thinner as the lips part, then snaps on its own
      var so = STR[k][2], o = M.str[k];
      if (S.snap[k] < 0 && mo > so) { S.snap[k] = t; S.kick = Math.min(1, S.kick + .6); }
      else if (S.snap[k] >= 0 && mo < so - .12) S.snap[k] = -1;   // closed again: the lips stick together once more
      o.st = clamp(mo / so); o.rt = S.snap[k] < 0 ? 0 : sm((t - S.snap[k]) / 1.4);
    }
    // ---------- then it eats: it lunges, the open mouth growing past the screen's edges, and the lips close over the visitor ----------
    var rc0 = sm(g.rec || 0);
    if (g.gulp > 0) S.gulp = Math.min(1, S.gulp + dt / 1.1 * (1 + 4 * rc0)); else if (g.gulp < 0) S.gulp = Math.max(0, S.gulp - dt / .8);
    var gp = S.gulp, done = gp >= .97, cl = clamp(gp / .55), shut = cl * cl * cl;   // slow, then the lips slam together
    var eng = done ? 0 : sm(g.eng || 0), le = eng < .12 ? -.05 * sm(eng / .12) : io((eng - .12) / .88);   // it draws back a little, then lunges
    var mopen = mo * (1 - shut);
    M.open = mopen; M.W = .46 + .36 * mo; M.HU = .3 * mopen; M.HL = .42 * mopen; M.y = .12;
    M.wob = .02 * mo + .025 * S.kick;   // the lips tremble heavily, more when a strand lets go

    // ---------- heart ----------
    var rc = sm(g.rec || 0);   // on into Works it calms: back to its resting size, the heart still a little fast
    var heat = lerp(Math.max(F, ten, S.grow * .8, mo * .85), .2, rc);
    var bpm = 60 + 112 * heat; S.phase += dt * bpm / 60;
    if (heat < .05) { var err = t - S.phase; err -= Math.round(err); S.phase += err * Math.min(1, dt * .8); }   // calm again: back on the world's beat
    var beat = press(S.phase);

    // ---------- body ----------
    var shrink = .06 * F + .15 * ten;   // scrolled at, it cowers: smaller and smaller as the strain builds
    var scale = (1 - shrink) * (1 + .034 * heat * beat) * (1 + .08 * mo);   // calm, the SUN is as still as the opening left it; the beat swells it only when it is stirred
    // fear: shy away from the visitor, squashed away from it; calm: watch it a little
    var shy = .07 * F, watch = .05 * (1 - F) * (ptr && live > 0 ? 1 : 0) * live;
    var ox = (-lx * shy + lx * watch) * R, oy = (-ly * shy + ly * watch) * R;
    var room = R * shrink + 24; ox = clamp(ox, -room - R * .1, room + R * .1); oy = clamp(oy, -room, room);
    var ca = lx, sa = ly, qa = 1 - .05 * F, qp = 1 + .02 * F;   // a small flinch
    var shiver = .004 * rc + (1 - rc) * .012 * F + .03 * ten + .004 * mo;
    var cx = cx0 + ox, cy = cy0 + oy;
    if (a > 0) {
      cx = lerp(cx, cx0, wA); cy = lerp(cy, cy0, wA);
      qa = lerp(qa, 1 + .06 * ten, wA); qp = lerp(qp, 1 - .09 * ten, wA); ca = lerp(ca, 1, wA); sa = lerp(sa, 0, wA);   // braced: hunched wide and low
    }
    if (rc > 0) { scale = lerp(scale, 1 + .034 * heat * beat, rc); cx = lerp(cx, cx0, rc); cy = lerp(cy, cy0, rc); qa = lerp(qa, 1, rc); qp = lerp(qp, 1, rc); ca = lerp(ca, 1, rc); sa = lerp(sa, 0, rc); }
    var ql = Math.hypot(ca, sa) || 1;
    // sated: as it comes back up it gives one slow, full swell and settles
    if (done && rc0 > 0) { if (S.back < 0) S.back = t; var tb = t - S.back; scale *= 1 + .06 * Math.exp(-tb / 1.1) * Math.sin(Math.min(tb * 2.6, 20)); qp *= 1 - .03 * Math.exp(-tb / 1.1) * Math.sin(Math.min(tb * 2.6, 20)); }
    else if (!done) S.back = -1;
    if (le !== 0) { // the lunge: the gap is brought to the middle of the screen and grows until it is all the visitor sees
      var sF = Math.max(W / (2 * .6 * R), H / (2 * .34 * R)) * 1.05, sc = le > 0 ? Math.pow(sF, le) * (1 + .3 * shut) : 1 + le;
      var tx = W / 2 - g.left, ty = H / 2 - g.top - (.12 + .06) * R * scale * sc, lk = clamp(le);
      cx = lerp(cx, tx, lk); cy = lerp(cy, ty, lk); scale *= sc;
    }


    OUT.cx = cx; OUT.cy = cy; OUT.R = R * scale; OUT.ca = ca / ql; OUT.sa = sa / ql; OUT.qa = qa; OUT.qp = qp; OUT.shiver = shiver; OUT.beat = beat; OUT.bpm = bpm;
    var thud = gp > .55 && gp < .8 ? Math.exp(-(gp - .55) * 18) * Math.cos((gp - .55) * 60) : 0;   // the lips meet: one heavy thud
    OUT.jx = 0; OUT.jy = 7 * thud; OUT.fear = F; OUT.heat = heat; OUT.attack = a;
    OUT.dark = done ? 1 - sm(rc0 / .8) : sm((gp - .5) / .3);
    OUT.vis = done ? (rc0 > 0 ? 1 : 0) : 1 - sm((gp - .75) / .2);   // sated, it comes back up out of the dark
    OUT.inside = sm((gp - .6) / .3) * (1 - sm(rc0 / .7));
    OUT.agit = lerp(Math.max(F * .55, ten * .85, mo * .25), .08, rc);
    OUT.ringK = lerp(1 - .12 * F - .16 * ten, 1, rc); OUT.ringO = done ? sm((rc0 - .3) / .7) : 1 - sm(eng / .35); OUT.tense = ten * (1 - rc);   // the ring draws in and holds its breath
    // handoff
    var held = mopen > .98 && rc <= 0, eaten = gp >= .56;
    EXPORT.progress = mopen; EXPORT.recede = rc;   // progress: how far the mouth is open
    if (held !== S.held || eaten !== S.eaten) {
      var ate = eaten && !S.eaten; S.held = held; S.eaten = eaten; EXPORT.held = held; EXPORT.eaten = eaten;
      try { dispatchEvent(new CustomEvent("sun:attack", { detail: { held: held, eaten: eaten } })); if (ate) dispatchEvent(new CustomEvent("sun:eaten")); } catch (e) {}
    }
    return OUT;
  }
  window.SUN_FEAR = { step: step };
})();
