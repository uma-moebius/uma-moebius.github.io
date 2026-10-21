/* The SUN is me, met by chance. A visitor coming close frightens it, and fear and attack are one reflex:
   it shrinks, shivers and turns away while its heart races; come closer or stay and it tears itself open and lunges.
   Leave and it calms back to 60 BPM and watches. Scrolling on into it is the full attack: the flesh strains, then rips
   across, sheds debris, jolts the screen and gapes at the visitor until the opening nearly fills the frame.
   This file is the model only (no drawing). scene.js asks it for one state per frame.
   Handoff: the attack's end state is held while About stays pinned. window.SUN_ATTACK.progress (0..1) tracks it,
   .held turns true at the end, and a "sun:attack" event fires with detail.held on every change. A later sequence starts there. */
(function () {
  "use strict";
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function sm(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function io(v) { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
  function out3(v) { v = clamp(v); return 1 - Math.pow(1 - v, 3); }
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
  var RIP_A = .4;     // attack progress at which the flesh gives way
  var S = { last: -1, F: 0, dwell: 0, phase: 0, bite: null, cool: 0, scar: 0, scarT: null,
            rip: 0, ripOn: false, ripT0: 0, punch: 0, punchV: 0, jolts: [], debris: [], seed: Math.random() * 100, held: false,
            wx: 0, wy: 0, sx: 0, sy: 0 };
  var EXPORT = window.SUN_ATTACK = { progress: 0, held: false };
  var OUT = { flash: 0, cx: 0, cy: 0, R: 1, ca: 1, sa: 0, qa: 1, qp: 1, shiver: 0, beat: 0, bpm: 60, jx: 0, jy: 0, agit: 0, ringK: 1, ringO: 1, fear: 0,
              tear: { on: false, tc: 1, ts: 0, c0: 0, u0: 0, f0: 0, f1: 0, open: 0, HU: .55, HL: .32, U: 1.5, crease: 0, sU: 0, sL: 0, sC: 0, attack: false },
              debris: null, attack: 0, heat: 0, tense: 0 };

  function jolt(t, amp) { S.jolts.push({ t: t, amp: amp, a: Math.random() * 6.28 }); }
  function burst(t, n, tr, cx, cy, Rs, speed) { // glyph debris thrown off both lips along the tear
    for (var q = 0; q < n; q++) {
      var u = lerp(-1.1, 1.1, Math.random()), v = tr.c0 + .06 * Math.sin(u * 2.1 + tr.sC), side = Math.random() < .55 ? -1 : 1;
      if (u * u + v * v > 1) continue;
      var px = cx + (u * tr.tc - v * tr.ts) * Rs, py = cy + (u * tr.ts + v * tr.tc) * Rs;
      var nvx = -tr.ts * side, nvy = tr.tc * side, sp = speed * (.35 + Math.random() * .9), sa = (Math.random() - .5) * speed * .6;
      S.debris.push({ x: px, y: py, vx: nvx * sp + tr.tc * sa, vy: nvy * sp + tr.ts * sa, t0: t, life: .55 + Math.random() * .9, k: Math.random(), h: Math.random(), n: Math.random() < .5 ? 3 + ((Math.random() * 7) | 0) : 1 });
    }
  }

  function step(t, g) { // t: seconds; g: { cx, cy, R, W, H, left, top, a (attack 0..1), gate (0..1 interactive) }
    var dt = S.last < 0 ? 1 / 60 : clamp(t - S.last, 0, .1); S.last = t;
    var cx0 = g.cx, cy0 = g.cy, R = g.R, W = g.W, H = g.H, a = clamp(g.a), wA = sm(a / .06), live = g.gate * (1 - wA);
    var small = W < 600, unit = R / 360;

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
    if (!S.bite && S.cool <= 0 && live > .5 && (p > .97 || S.dwell > 1.15)) {
      var ang = Math.atan2(uy, ux), tilt = clamp(ux >= 0 ? ang : (ang > 0 ? ang - Math.PI : ang + Math.PI), -.55, .55);
      var tc = Math.cos(tilt), ts = Math.sin(tilt);
      S.bite = { t0: t, ux: ux, uy: uy, dist: dist, tc: tc, ts: ts,
                 c0: clamp(-ux * ts + uy * tc, -1, 1) * .22, u0: clamp(ux * tc + uy * ts, -1, 1) * .45,
                 sU: Math.random() * 50, sL: Math.random() * 50 + 50, sC: Math.random() * 6, hit: false };
      S.dwell = 0;
    }
    var bL = 0, bOpen = 0, bCrease = 0, bCoil = 0, bAct = 0, B = S.bite;
    if (B) {
      var bt = t - B.t0;
      // coil (flesh tightens, shivers) → rip and lunge → hold the gape → snap shut → recoil, partly
      bCoil = sm(bt / .16) * (1 - sm((bt - .17) / .1));
      bCrease = sm(bt / .16);
      if (bt >= .16 && !B.hit) { B.hit = true; B.boom = true; jolt(t, (small ? 9 : 14)); }
      bL = bt < .16 ? -.15 * sm(bt / .16) : bt < .24 ? out3((bt - .16) / .08) : bt < .4 ? 1 : 1 - .65 * io((bt - .4) / .5) - .35 * io((bt - .9) / .5);
      bOpen = bt < .16 ? 0 : bt < .22 ? .72 * out3((bt - .16) / .06) : bt < .36 ? .72 + .04 * Math.sin((bt - .22) * 60) : bt < .43 ? .76 * (1 - io((bt - .36) / .07)) : 0;
      if (bt >= .43 && !B.shut) { B.shut = true; jolt(t, small ? 5 : 8); }
      bAct = 1 - sm((bt - .5) / .7);
      if (bt > 1.4) { S.bite = null; S.cool = .45; S.scar = 1; S.scarB = B; }
    }
    S.scar = Math.max(0, S.scar - dt / .7);

    // ---------- the attack (scroll driven, the rip itself on its own clock) ----------
    if (a >= RIP_A && !S.ripOn) { S.ripOn = true; S.ripT0 = t; S.punchV += 5.5; jolt(t, small ? 18 : 30); S.burstAt = t; }
    else if (a < RIP_A - .12 && S.ripOn) S.ripOn = false;
    if (S.ripOn) S.rip = Math.max(S.rip, out3((t - S.ripT0) / .13)); else S.rip = Math.max(0, S.rip - dt / .6);
    var ten = sm(a / RIP_A), g2 = io((a - RIP_A) / (1 - RIP_A)), r = S.rip;
    // the punch toward the visitor right after the rip: an underdamped spring on the scale
    var pw = 2 * Math.PI * 2.2, pz = .32; S.punchV += (-pw * pw * S.punch - 2 * pz * pw * S.punchV) * dt; S.punch += S.punchV * dt;

    // ---------- heart ----------
    var heat = Math.max(F, ten * (1 - r * .3), bAct, r * .8);
    var bpm = 60 + 112 * heat; S.phase += dt * bpm / 60;
    if (heat < .05) { var err = t - S.phase; err -= Math.round(err); S.phase += err * Math.min(1, dt * .8); }   // calm again: back on the world's beat
    var beat = press(S.phase);
    var hold = g2 * r, pant = Math.sin(t * Math.PI * 2 * 1.4);   // held open at the visitor: it pants, its heart hammers, it trembles

    // ---------- body ----------
    var shrink = .17 * F + .07 * bCoil + .15 * ten * (1 - r);   // scrolled at, it cowers: smaller and smaller as the strain builds
    var scale = (1 - shrink) * (1 + .034 * heat * beat);   // calm, the SUN is as still as the opening left it; the beat swells it only when it is stirred
    // fear: shy away from the visitor, squashed away from it; calm: watch it a little
    var shy = (.2 * F) * (1 - Math.max(0, bL)), watch = .05 * (1 - F) * (ptr && live > 0 ? 1 : 0) * live;
    var ox = (-lx * shy + lx * watch) * R, oy = (-ly * shy + ly * watch) * R;
    var room = R * shrink + 24; ox = clamp(ox, -room - R * .1, room + R * .1); oy = clamp(oy, -room, room);
    // the lunge: toward where the visitor was when it struck
    var ca = lx, sa = ly, qa = 1 - .11 * F, qp = 1 + .05 * F;
    if (B || bL !== 0) {
      var Bv = B || S.scarB; if (Bv) {
        var reach = Math.min(R * .6, Math.max(R * .15, Bv.dist - R * .4)) * bL;
        ox = lerp(ox, 0, Math.max(0, bL)) + Bv.ux * reach; oy = lerp(oy, 0, Math.max(0, bL)) + Bv.uy * reach;
        ca = Bv.ux; sa = Bv.uy; qa = lerp(qa, 1 + .22 * Math.max(0, bL), Math.max(0, bL)); qp = lerp(qp, 1 - .09 * Math.max(0, bL), Math.max(0, bL));
      }
    }
    var shiver = .016 * F + .022 * bCoil + .03 * ten * (1 - r) + .006 * r + .008 * hold * (.6 + .4 * beat);
    // the attack's lunge: the creature comes at the visitor, its opening nearly filling the frame
    var gap = .55 + .32, Sfill = Math.max(1.3, H * (small ? .66 : .74) / (R * gap));
    var cx = cx0 + ox, cy = cy0 + oy;
    if (a > 0) {
      var sA = r > 0 ? lerp(1 - .08 * (1 - r) + .22 * r, Sfill, g2) + S.punch * .2 : 1;
      scale = lerp(scale, sA * (1 + .03 * beat + .012 * hold * pant), wA);
      cx = lerp(cx, lerp(cx0, W / 2, g2), wA); cy = lerp(cy, lerp(cy0, H * .5 + R * sA * ((.55 - .32) * .5 * r + .05), g2), wA);   // centre the opening, not the body
      qa = lerp(qa, 1 + .06 * ten * (1 - r), wA); qp = lerp(qp, 1 - .09 * ten * (1 - r), wA);   // braced: hunched wide and low ca = lerp(ca, 1, wA); sa = lerp(sa, 0, wA);
    }
    var ql = Math.hypot(ca, sa) || 1;
    // screen jolts: hard, short, damped
    var jx = 0, jy = 0;
    S.jolts = S.jolts.filter(function (j) { var u = t - j.t; if (u > .5) return false;
      var e = j.amp * Math.exp(-u / .09); jx += e * Math.cos(j.a + u * 97); jy += e * Math.sin(j.a * 1.7 + u * 83); return true; });

    // ---------- the tear ----------
    var T = OUT.tear;
    if (a > 0 || r > 0) {
      var th = -.2; T.tc = Math.cos(th); T.ts = Math.sin(th); T.c0 = -.05; T.u0 = .32; T.U = 1.55; T.sU = S.seed; T.sL = S.seed + 37; T.sC = S.seed * .1;
      T.HU = .55; T.HL = .32; T.attack = true;
      T.open = r * (.62 + .38 * g2) * (1 + .07 * beat * g2 + .06 * hold * pant);
      var reachU = 2.4 * out3((t - S.ripT0) / .11) * (S.ripOn ? 1 : r);
      T.f0 = T.u0 - reachU; T.f1 = T.u0 + reachU;
      T.crease = Math.max(ten, r); T.on = true;
    } else if (B || S.scar > 0) {
      var Bt = B || S.scarB; T.tc = Bt.tc; T.ts = Bt.ts; T.c0 = Bt.c0; T.u0 = Bt.u0; T.U = 1.35; T.sU = Bt.sU; T.sL = Bt.sL; T.sC = Bt.sC; T.HU = .5; T.HL = .3; T.attack = false;
      T.open = bOpen; var bt2 = B ? t - B.t0 : 1, rr = out3((bt2 - .16) / .05);
      T.f0 = T.u0 - 2.2 * rr - .25 * bCrease; T.f1 = T.u0 + 2.2 * rr + .25 * bCrease;
      T.crease = B ? bCrease * (1 - sm((bt2 - .6) / .7) * .7) : S.scar * .3; T.on = true;
    } else { T.on = false; T.open = 0; T.crease = 0; }
    if (S.burstAt === t) burst(t, small ? 90 : 160, T, cx, cy, R * scale, (small ? 900 : 1500) * Math.max(.6, unit));
    if (B && B.boom) { B.boom = false; burst(t, small ? 30 : 46, T, cx, cy, R * scale, 700 * Math.max(.6, unit)); }
    // debris: drag + a little weight
    S.debris = S.debris.filter(function (d) { var u = t - d.t0; if (u > d.life) return false;
      var k = Math.exp(-2.4 * dt); d.vx *= k; d.vy = d.vy * k + 900 * unit * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.u = u / d.life; return true; });

    OUT.cx = cx; OUT.cy = cy; OUT.R = R * scale; OUT.ca = ca / ql; OUT.sa = sa / ql; OUT.qa = qa; OUT.qp = qp; OUT.shiver = shiver; OUT.beat = beat; OUT.bpm = bpm;
    OUT.jx = jx; OUT.jy = jy; OUT.flash = Math.max(S.ripOn ? Math.exp(-Math.max(0, t - S.ripT0 - .02) / .09) : 0, B && B.hit ? .55 * Math.exp(-Math.max(0, t - B.t0 - .16) / .07) : 0); OUT.fear = F; OUT.heat = heat; OUT.attack = a; OUT.debris = S.debris;
    OUT.agit = Math.max(F * .55, ten * (1 - r) * .85, bAct * .7);
    OUT.ringK = (1 - .12 * F - .16 * ten * (1 - r)) * (1 + 1.6 * r); OUT.ringO = 1 - r; OUT.tense = ten * (1 - r);   // the ring draws in and holds its breath
    // handoff
    var held = a >= 1 && r >= 1;
    EXPORT.progress = a;
    if (held !== S.held) { S.held = held; EXPORT.held = held; try { dispatchEvent(new CustomEvent("sun:attack", { detail: { held: held } })); } catch (e) {} }
    return OUT;
  }
  window.SUN_FEAR = { step: step, RIP: RIP_A };
})();
