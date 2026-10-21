/* One character field — the opening's name kneaded into the SUN (birth.js) → the SUN, in the very same flesh (flesh.js: same cells,
   glyphs, light and tones), so the sphere never turns into another drawing. A visitor nearing frightens it and it bites (sun-fear.js);
   scrolling on, the same body rips open and lunges at the visitor; that end state is held (the handoff) → the field thins into
   Works → a setting sun at the footer. Input velocity drives glitch. */
(function () {
  var A = window.ASCII;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
  // one world clock: every periodic thing is a whole number of beats (or an integer split of one) of the 60 BPM heart
  var BEAT = 1000, TAU = Math.PI * 2;
  // the first beat: on the first visit of a session, opened at the top, the world waits in near-silence and starts on one heartbeat.
  // The clock's zero is that beat (an accent, beat 0 of 4), so the heart, the ring's first inhale and the air all start together
  var HUSH = 900, CLK0 = 0, silent = false;   // ms of silence before the first beat; the world clock's zero (page time); waiting for it
  var AIR_BEAT = /[?&]airbeat=1/.test(location.search);   // optional, off by default: the SUN's air swells with the heartbeat (for comparison only)
  var cursor = document.querySelector(".sun-cursor");
  if (fine && !reduce) root.classList.add("has-sun-cursor");

  // ---------- input velocity ----------
  var energy = 0, lx = null, ly = 0, lt = 0, lastY = scrollY, lastYT = performance.now(), scrollAcc = 0;
  var diving = false;
  function kick(v) { if (!reduce && !diving && v > 0) energy = Math.min(1, Math.max(energy, v)); wake(); }
  addEventListener("pointermove", function (e) {
    if (cursor) { root.style.setProperty("--cx", e.clientX + "px"); root.style.setProperty("--cy", e.clientY + "px");
      cursor.classList.toggle("is-over", !!(e.target.closest && e.target.closest("a,button,input,textarea"))); }
    var now = performance.now();
    if (lx !== null && e.pointerType === "mouse") { var dt = Math.max(8, now - lt); kick((Math.hypot(e.clientX - lx, e.clientY - ly) / dt - .7) / 3.2); }
    lx = e.clientX; ly = e.clientY; lt = now;
  }, { passive: true });
  addEventListener("scroll", function () {
    var now = performance.now(), dy = scrollY - lastY, dt = Math.max(8, now - lastYT);
    scrollAcc += dy; lastY = scrollY; lastYT = now; kick((Math.abs(dy) / dt - .6) / 2.5);
  }, { passive: true });

  // ---------- heading decode (once, on enter) ----------
  var POOL = "abcdefghijklmnopqrstuvwxyz#%*+=-/";
  function decode(el) {
    var s = el.dataset.text, t0 = performance.now(), D = Math.min(900, 320 + s.length * 16);
    (function f(now) {
      var p = (now - t0) / D, out = "";
      for (var i = 0; i < s.length; i++) out += (s[i] === " " || p >= .25 + .75 * i / s.length) ? s[i] : POOL[(Math.random() * POOL.length) | 0];
      el.textContent = out;
      if (p < 1) requestAnimationFrame(f); else el.textContent = s;
    })(t0);
  }
  if (!reduce && "IntersectionObserver" in window) {
    var dio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && getComputedStyle(e.target).opacity > .5) { dio.unobserve(e.target); decode(e.target); } }); }, { threshold: [.6, 1] });
    Array.prototype.forEach.call(document.querySelectorAll("[data-decode]"), function (el) { el.dataset.text = el.textContent; el.setAttribute("aria-label", el.textContent); dio.observe(el); });
  }

  // ---------- scene ----------
  var scene = document.querySelector(".scene"); if (!scene) return;
  var bg = scene.querySelector(".scene__bg"), cv = scene.querySelector(".scene__canvas"), g = null;
  // the field draws through WebGL where it runs on the GPU, else through Canvas 2D; both copy the same atlas tiles to the same pixels
  var GPU = window.ASCII_GL ? window.ASCII_GL(cv, to2d, repaint, reduce) : null;
  if (!GPU) g = cv.getContext("2d") || fresh();
  cv.dataset.renderer = GPU ? GPU.kind : "2d";
  function fresh() { var c = cv.cloneNode(false); cv.parentNode.replaceChild(c, cv); cv = c; return c.getContext("2d"); }   // a canvas once given to WebGL can never draw 2D
  function to2d() { GPU = null; g = fresh(); cv.dataset.renderer = "2d"; if (ready) { build(); repaint(); } }
  function repaint() { if (!ready) return; if (reduce) render(0); else wake(); }
  var sun = scene.querySelector(".sunsec"), pin = sun.querySelector(".sunsec__pin"), works = scene.querySelector(".works");
  var label = pin.querySelector(".sunsec__label"), bio = pin.querySelector(".sunsec__bio"), links = pin.querySelector(".sunsec__links"), readout = pin.querySelector(".sunsec__readout");
  var ringEl = bg.querySelector(".scene__ring");
  // glyph roles (A.EDGE / A.AIR): the interior ramp holds no air or stroke characters — the dark side is ';' and '=' rows, not dust
  // the interior set; its order is re-measured (ink coverage, JetBrains Mono 600) before the first atlas — 'sun' stays as one block
  var CHARS = " ;====+*sun%#@", LV = CHARS.length, WILD = "SUN01/#:<>*", GE = LV + WILD.length, GA = GE + A.EDGE.length;
  var GLYPHS = CHARS + WILD + A.EDGE + A.AIR;
  // the same five tones as the wordmark, capped at the light pink (never white); atlas rows are tones, not levels
  var COLORS = ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"], ST = COLORS.length - 1;
  var SUN_TL = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4];   // glyph level → resting tone
  var DIVE_TL = [0, 0, 0, 1, 1, 1, 3, 3, 3, 3, 3, 4, 4, 4];  // during the dive the swallowed surface keeps its approved pinks (no middle tone)
  var SUN_HOT = 1.05, SUN_HOT_BEAT = .92, sunDk = 0;   // light needed for the top tone (at rest; the beat value is unused: the heartbeat belongs to the wordmark)
  var T_DEEP = 0, T_DIM = 1;   // atlas rows for the darkest two tones (air, mouth interior)
  // tone of a sphere cell from its level, recomputed every frame (never accumulated); `up` = the beat lifts it by one
  function sunTone(lvl, b, i, j, up) {
    var dive = sunDk > 0 && A.hash(i + 5.1, j + 3.7) < sunDk / .3;    // the first 30% of the dive hands each cell over to the dive pinks
    var tn = (dive ? DIVE_TL : SUN_TL)[lvl], ok = b >= (up ? SUN_HOT_BEAT : SUN_HOT);
    if (tn === undefined) tn = ST;
    if (dive) return tn;
    if (tn === ST && !ok) tn = ST - 1;
    if (up && tn < ST) { tn++; if (tn === ST && (lvl < SUN_TL.length - 3 || !ok)) tn = ST - 1; }
    return tn;
  }

  var ring = [];
  for (var k = 0; k < 16; k++) for (var c = 0; c < 3; c++) {
    var sp = document.createElement("span"); sp.className = "scene__glyph"; sp.textContent = "SUN"[c];
    sp.style.setProperty("--a", (k * 22.5 + c * 4.4) + "deg"); ringEl.appendChild(sp); ring.push({ el: sp, c: "SUN"[c], wild: false });
  }

  var W = 0, H = 0, PH = 0, dpr = 1, BASE = 8, R0 = 300, fcx = 0, fcy = 0, small = false, MQ = 1, MBW = 6;
  function build() {
    dpr = Math.min(2, devicePixelRatio || 1);
    var r = bg.getBoundingClientRect(); W = r.width; H = r.height; small = W < 769;
    PH = Math.max(H, cv.getBoundingClientRect().height);   // painted height: the large viewport on phones (H stays the layout box)
    cv.width = Math.round(W * dpr); cv.height = Math.round(PH * dpr); if (GPU) GPU.size(cv.width, cv.height);
    BASE = small ? 6 : 8;
    CHARS = A.inkRamp(" ;====+*sun%#@", "sun", 600); GLYPHS = CHARS + WILD + A.EDGE + A.AIR;
    buildFlesh();
    fit();
  }
  // the sphere (+ ring) lives in the free area between the text blocks → never overlaps bio / links / readout
  function fit() {
    var p = pin.getBoundingClientRect();
    function rr(el) { var b = el.getBoundingClientRect(); return { l: b.left - p.left, r: b.right - p.left, t: b.top - p.top, b: b.bottom - p.top }; }
    var la = rr(label), bi = rr(bio), li = rr(links), ro = rr(readout), x0, x1, y0, y1;
    // readout + label sit at the top; bio / links in the bottom corners (desktop) or under the label (mobile)
    var half;
    if (!small) { // on the page axis; as large as the height allows, shrunk only where the circle would reach the bio / links boxes
      x0 = 24; x1 = W - 24; y0 = ro.b + 16; y1 = H - 24; fcx = W / 2; fcy = (y0 + y1) / 2;
      half = Math.min((x1 - x0) / 2, (y1 - y0) / 2);
      [bi, li].forEach(function (b) {
        var dx = Math.max(b.l - 24 - fcx, 0, fcx - b.r - 24), dy = Math.max(b.t - 24 - fcy, 0, fcy - b.b - 24);
        half = Math.min(half, Math.hypot(dx, dy));
      });
    } else { x0 = 8; x1 = W - 8; y0 = ro.b + 16; y1 = H - 16; fcx = (x0 + x1) / 2; fcy = (y0 + y1) / 2; half = Math.min(x1 - x0, y1 - y0) / 2; }
    var rfs = Math.max(11, Math.min(18, half * .045));
    R0 = (half - rfs) / 1.12;
    ringEl.style.setProperty("--rfs", rfs + "px");
    // phones: the SUN is fewer cells across, so the mouth holds fewer air slots. Scale the slots, their speed and their share by the
    // cells per radius (42 = a large screen, which keeps exactly the desktop rule) so the mouth reads equally alive
    MQ = small || H < 500 ? Math.max(.5, Math.min(1, R0 / BASE / 42)) : 1; MBW = MQ < 1 ? Math.max(4, Math.round(6 * MQ)) : 6;
  }
  function prog(el) { var r = el.getBoundingClientRect(), span = r.height - H; return span > 0 ? A.clamp(-r.top / span) : 1; }
  // the opening (birth.js) takes the first stretch of About's pinned scroll; About's own timeline starts after it, unchanged
  var BR = window.BIRTH && window.BIRTH.on ? window.BIRTH : null, lastBs = 1;
  function birthOn() { return BR && BR.on && root.classList.contains("birth"); }
  function progSun() {
    if (!birthOn()) return prog(sun);
    var r = sun.getBoundingClientRect(), b = Math.max(0, r.height - 2.8 * H), span = r.height - b - H;
    return span > 0 ? A.clamp((-r.top - b) / span) : 1;
  }
  window.SCENE_GEO = function () { return ready ? { cx: fcx, cy: fcy, R: R0, bs: lastBs } : null; };

  var rot = 0, ringRot = 0, lastRead = "", lastJolt = "";
  var SUN_END = .36, ATK_END = .62, DIVE_END = .8, moS = 0, moV = 0, moT = 0;   // rest → attack → its end state held → thins into Works
  var FEAR = reduce ? null : window.SUN_FEAR || null, bgL = 0, bgT = 0;
  function springMo(target, t) { // critically damped, ~120ms: scroll steps arrive as one smooth motion through the whole scene
    var dt = moT ? Math.min(.05, (t - moT) / 1000) : 0, w = 1 / .12; moT = t;
    if (!dt || target === 0 && moS < 1e-4) { moS = target; moV = 0; return moS; }
    var x = moS - target, e = Math.exp(-w * dt), c = moV + w * x;
    moS = target + (x + c * dt) * e; moV = (moV - c * w * dt) * e;
    if (moS < 0) { moS = 0; moV = 0; } else if (moS > 1) { moS = 1; moV = 0; }
    return moS;
  }
  // the ring breathes: one slow breath every 8 beats on the world clock, in a little shorter than out, eased at both turns
  var BR_BEATS = 8, BR_IN = 3.5, BR_AMP = .055;   // beats per breath; beats breathing in; how far the ring opens, smallest to largest (share of its radius)
  function breath(t) {
    var x = ((t / BEAT) % BR_BEATS + BR_BEATS) % BR_BEATS;
    return x < BR_IN ? .5 - .5 * Math.cos(Math.PI * x / BR_IN) : .5 + .5 * Math.cos(Math.PI * (x - BR_IN) / (BR_BEATS - BR_IN));
  }
  function frameState(t) {
    var pa = reduce ? .3 : progSun(), pw = reduce ? 1 : (works.getBoundingClientRect().top <= 0 ? prog(works) : 0);
    var pf = reduce ? pa : springMo(pa, t); // everything that moves follows one sprung progress; text and anchors stay on raw scroll
    // the old dive no longer plays: k stays 0. After the SUN's rest comes the attack (sun-fear.js), its end state is held, then the field thins into Works
    var rise = birthOn() ? 1 : A.smooth(pf / .16), nk = A.clamp(pf / SUN_END), k = 0, atk = reduce ? 0 : A.clamp((pf - SUN_END) / (ATK_END - SUN_END));
    var thin = A.clamp((pf - DIVE_END) / (1 - DIVE_END)), u = A.clamp(pw / .2);
    if (pa >= 1) thin = 1;
    if (reduce && works.getBoundingClientRect().top < H * .5) thin = 1; // static mode: SUN frame only while About is on screen
    var drift = reduce || t < 0 ? 0 : t;   // before the first beat the light holds still
    var az = (-62 + 62 * nk) * Math.PI / 180 + Math.sin(drift * TAU / (27 * BEAT)) * .22, el = .1 + .42 * nk + Math.sin(drift * TAU / (37 * BEAT) + 1) * .08;
    var Ls = [Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)], Ld = [-.25, -.32, .91];
    var L = [Ls[0] + (Ld[0] - Ls[0]) * k, Ls[1] + (Ld[1] - Ls[1]) * k, Ls[2] + (Ld[2] - Ls[2]) * k], n = Math.hypot(L[0], L[1], L[2]);
    var halfDiag = Math.hypot(W, H) / 2, Rfill = halfDiag * 3.2;
    var aIn = reduce ? 0 : birthOn() ? BR.x : rise;
    var f = FEAR && ready ? FEAR.step(t / 1000, { cx: fcx, cy: fcy, R: R0 * (.35 + .65 * rise), W: W, H: H, left: bgL, top: bgT, a: atk, gate: aIn >= .98 && pa < 1 ? 1 : 0 }) : null;
    return { f: f, atk: atk,
      pa: pa, pw: pw, k: k, thin: thin, nk: nk, a: reduce ? (sun.getBoundingClientRect().top <= 1 ? 1 : 0) : birthOn() ? BR.x : rise,   // static mode: shown only once the field is pinned
      z: Math.pow(3, 1 - (1 - k) * (1 - k)), R: f ? f.R : R0 * (.35 + .65 * rise) * Math.pow(Rfill / R0, k), // geometric zoom; cells grow a little ahead of it (fewer blits mid-dive)
      cx: f ? f.cx : fcx + (W / 2 - fcx) * k, cy: f ? f.cy : fcy + (H / 2 - fcy) * k,   // entering About: the SUN grows in place from small (never slides in half-clipped)
      L: [L[0] / n, L[1] / n, L[2] / n],
      tt: reduce ? 0 : BR && BR.t0 !== undefined ? (t + CLK0 - BR.t0) / 1000 : t / 1000,   // the flesh's own clock: the opening's, so the surface carries straight on
      bs: lastBs = reduce ? 1 : 1 + BR_AMP * (breath(t < 0 ? 0 : t) - .5) * (1 - A.clamp(k * 2.2)) * (f ? 1 - f.tense : 1)   // around the resting radius (static = the middle of a breath); fades out with the ring as the dive starts
    };
  }

  // sphere shading of the footer sun
  function shade(nx, ny, r2, L0, L1, L2, lon, dk, phase) {
    var nz = Math.sqrt(1 - r2), d = nx * L0 + ny * L1 + nz * L2; if (d < 0) d = 0;
    var tex = .5 + .3 * Math.sin(ny * 11 + Math.sin(lon * 2 + ny * 3) * 1.2) + .2 * Math.sin(lon * 9) * Math.sin(ny * 17 + lon * 2);
    var b = .06 + d * (.7 + .38 * tex) + .05 * tex;
    if (dk > 0) { // diving: the fine wavy surface takes over and the tone stays in the pinks (no white-out)
      var w = Math.sin(ny * 60 + Math.sin(lon * 20 + ny * 25) * 2.2 + phase);
      var bd = .14 + .46 * (.5 + .5 * w) * (.5 + .5 * d) + .16 * tex;
      b += (bd - b) * (dk > .6 ? 1 : dk / .6);
    }
    return b;
  }

  // ---------- the SUN in the opening's flesh (flesh.js): one grid from the screen's top left, the same glyphs, light and tones ----------
  // fear, the bite and the rip are deformations of that one body: its signed distance field is squashed, shaken and cut, never redrawn
  var FL = window.FLESH, FG = null, FAT = null, SWILD = "SUN01/#:<>*", SWG = 0, scw = 7, sch = 12.25, scols = 0, srows = 0;
  var SD = null, SH = null, SF = null, SL = null, SG = null, SC = null, LUTV = new Float32Array(1025), LUTU = new Float32Array(1025), LUTL = new Float32Array(1025),
      LTU = new Float32Array(1025), LTL = new Float32Array(1025), LPU = new Float32Array(1025), LPL = new Float32Array(1025), STH = null;
  function buildFlesh() {
    scw = FL.cellW(W); sch = scw * 1.75; scols = Math.ceil(W / scw); srows = Math.ceil(PH / sch);
    FG = FL.glyphs(); SWG = FG.chars.length; FAT = A.atlas(FG.chars + SWILD, FL.TONES, scw, sch, 600, dpr);
    var n = scols * srows; SD = new Float32Array(n); SH = new Float32Array(n); SF = new Float32Array(n); SL = new Float32Array(n); SG = new Float32Array(n); SC = new Float32Array(n); STH = new Uint8Array(n);
  }
  // while the opening hands over, the SUN is drawn whole under it: both are the same pixels, so the fade shows no seam
  function sunAlpha(st) { return birthOn() ? (BR.x > 0 ? 1 : 0) : st.a; }
  function drawSun(t, st) {
    var FS = st.f, R = st.R, cx = st.cx, cy = st.cy, cw = scw, ch = sch, cols = scols, rows = srows, gi = FG.gi, tt = st.tt;
    var E = st.pa >= 1 || (birthOn() && BR.x < 1) ? 0 : energy, tick = Math.floor(t / (BEAT / 20)), glitch = E > .02, thin = st.thin;
    var TR = FS && FS.tear.on ? FS.tear : null, shv = 0, fl = 0, bt = 0, na = 0;
    if (FS) {
      shv = FS.shiver; fl = FS.flash || 0; bt = FS.beat * FS.heat; na = cw * 1.3 * FS.agit;   // the racing heart swells it; fear kneads the surface again
      if (fl > .02) { E = Math.max(E, fl * .9); glitch = true; }   // the instant it rips: bands of the field tear sideways
      var sj = Math.floor(t / 25); cx += (A.hash(sj, 1.3) - .5) * shv * R * 1.3; cy += (A.hash(sj, 2.9) - .5) * shv * R * 1.3;   // a fine, fast tremble
    }
    var ext = R * 1.06 * (FS ? Math.max(1, FS.qa, FS.qp) : 1) * (1 + (TR ? (TR.HU + TR.HL) * TR.open * 1.4 : 0)) + cw * 6 + na;
    var i0 = Math.max(0, Math.floor((cx - ext) / cw) - 2), i1 = Math.min(cols, Math.ceil((cx + ext) / cw) + 2);
    var j0 = Math.max(0, Math.floor((cy - ext) / ch) - 2), j1 = Math.min(rows, Math.ceil((cy + ext) / ch) + 2);
    var fca = FS ? FS.ca : 1, fsa = FS ? FS.sa : 0, fqa = FS ? FS.qa : 1, fqp = FS ? FS.qp : 1, tsh1 = t * .09, tsh2 = t * .13;
    var tc = TR ? TR.tc : 1, tsn = TR ? TR.ts : 0, tOpen = TR ? TR.open : 0, tCr = TR ? TR.crease : 0, creW = Math.max(.05, ch * 1.1 / R);
    // the tear's line and lips, in body units along (u) and across (v) it: a meandering crack, ragged lips that never repeat (no teeth)
    function zig(u, sd, stp) { var xx = u / stp + sd, kk = Math.floor(xx), ff = xx - kk, a0 = A.hash(kk, sd), a1 = A.hash(kk + 1, sd); return (a0 + (a1 - a0) * ff) * 2 - 1; }
    function rag(u, sd) { var z = .5 * zig(u, sd, .083) + .22 * zig(u, sd + 9.7, .029); return z * Math.abs(z) * 1.3 + .35 * Math.sin(u * 6.3 + sd) * Math.sin(u * 2.7 - sd * .3); }
    function vcF(u) { return TR.c0 + .06 * Math.sin(u * 2.1 + TR.sC) + .024 * zig(u, TR.sC + 3.1, .11); }
    var GP = [0, 0];
    function gape(u) { // → [upper lift, jaw drop] at u
      if (tOpen < .002) { GP[0] = GP[1] = 0; return GP; }
      var w = A.smooth((u - TR.f0 + .05 * zig(u, 7.7, .05)) / .12) * A.smooth((TR.f1 - u + .05 * zig(u, 8.8, .05)) / .12), pr = 1 - (u / TR.U) * (u / TR.U);
      if (w <= 0 || pr <= 0) { GP[0] = GP[1] = 0; return GP; }
      pr = Math.sqrt(pr) * w * tOpen;
      GP[0] = pr * TR.HU * (1 + .5 * rag(u, TR.sU)) * (1 + .32 * u); GP[1] = pr * TR.HL * (1 + .5 * rag(u, TR.sL)) * (1 - .22 * u);
      return GP;
    }
    // the line and both lips change along u only: sample them once a frame (u in -1.7..1.7) instead of once a cell
    // teeth: once it gapes, both lips are lined with fangs of the same flesh, upper and lower interleaved, uneven, a few missing
    var tsp = TR ? Math.max(cw * 3.6 / R, (TR.HU + TR.HL) * tOpen * .12) : 1, tOn = A.smooth((tOpen - .08) / .2), TPR = 0;
    function tooth(u, hgap, side) {
      var xq = u / tsp + side * .5 + (side ? TR.sL : TR.sU) * .013, kq = Math.floor(xq), fq = xq - kq, h = A.hash(kq * 1.7 + side * 9.3, TR.sC);
      TPR = 1 - Math.abs(fq - .5) * 2; if (h < .12 || tOn <= 0) return 0;
      return hgap * (.13 + .17 * h) * tOn * Math.max(0, TPR * 1.15 - .15);   // pointed, a sliver of gap between neighbours
    }
    var LU = 1.7, LN = 1024, lv = null, lh = null, ll = null;
    if (TR) { lv = LUTV; lh = LUTU; ll = LUTL;
      for (var q0 = 0; q0 <= LN; q0++) { var u0 = -LU + 2 * LU * q0 / LN, g0 = gape(u0); lv[q0] = vcF(u0); lh[q0] = g0[0]; ll[q0] = g0[1];
        var hg = g0[0] + g0[1]; LTU[q0] = tooth(u0, hg, 0); LPU[q0] = TPR; LTL[q0] = tooth(u0, hg, 1); LPL[q0] = TPR; } }
    function lut(a, u) { var x = (u + LU) / (2 * LU) * LN; if (x <= 0) return a[0]; if (x >= LN) return a[LN]; var q1 = x | 0, f1 = x - q1; return a[q1] + (a[q1 + 1] - a[q1]) * f1; }
    var STR = [[-.78, .2], [-.38, .34], [.06, .52], [.44, .27], [.83, .64]];   // strands of flesh across the opening: where, and how wide it gets before each snaps
    var FM = { cr: 0, ridge: 0, gap: 0, crack: 1e9, th: 0 };
    function sdf(x, y) { // signed distance (px) of the deformed body at (x, y)
      var px = (x - cx) / R, py = (y - cy) / R;
      var a1 = (px * fca + py * fsa) / fqa, p1 = (-px * fsa + py * fca) / fqp; px = a1 * fca - p1 * fsa; py = a1 * fsa + p1 * fca;   // squashed away from the visitor / stretched at it
      var sh = 0;   // the shiver ripples the outline only: the lit surface inside stays the same smooth flesh
      if (shv > 0) { var rr0 = Math.sqrt(px * px + py * py); if (rr0 > .7) { var an = Math.atan2(py, px); sh = shv * (.6 * Math.sin(an * 17 + tsh1) + .4 * Math.sin(an * 29 - tsh2)) * A.smooth((rr0 - .7) / .25) * R; } }
      FM.cr = 0; FM.ridge = 0; FM.gap = 0; FM.crack = 1e9; FM.th = 0;
      if (!TR) return (Math.sqrt(px * px + py * py) - 1) * R - sh;
      var uu = px * tc + py * tsn, vv = -px * tsn + py * tc, vc = lut(lv, uu), dv = vv - vc, hu = lut(lh, uu), hl = lut(ll, uu);
      if (dv > -hu && dv < hl) {
        var r2e = uu * uu + vc * vc, tu = lut(LTU, uu), tl = lut(LTL, uu), hut = hu - tu, hlt = hl - tl;
        if (dv <= -hut || dv >= hlt) { // a tooth: flesh hanging from the lip into the opening
          var up2 = dv <= -hut, dtt = (up2 ? dv + hut : hlt - dv) * R;
          if (r2e >= 1) dtt = Math.max(dtt, (Math.sqrt(r2e) - 1) * R);
          FM.th = up2 ? 1 : 2; if (lut(up2 ? LPU : LPL, uu) > .72 && dtt > -ch * .9) FM.th += 2;   // 3 / 4: the tip
          return dtt - sh;
        }
        hu = hut; hl = hlt;
        // inside the opening: empty, measured to the nearer lip or tooth (and to the silhouette beyond the ends)
        var cd = Math.min(dv + hu, hl - dv) * R, d = r2e >= 1 ? Math.max(cd, (Math.sqrt(r2e) - 1) * R) : cd;
        if (r2e < 1) {
          FM.gap = cd;
          var q = (dv + hu) / (hu + hl);
          for (var sn = 0; sn < STR.length; sn++) { // strands of the same flesh stretch across, thin, snap and shrink back into the lips
            var so = TR.attack ? STR[sn][1] : STR[sn][1] * .7 + .12, gone = (tOpen - so) / .18;
            if (gone >= 1 || (!TR.attack && sn % 2)) continue;
            if (gone > 0 && q > .42 * (1 - gone) && q < 1 - .42 * (1 - gone)) continue;
            var su = TR.u0 + STR[sn][0] + .045 * Math.sin(Math.PI * q) * (sn % 2 ? 1 : -1);
            var ds = Math.abs(uu - su) * R - cw * (tOpen < so * .7 ? 1.1 : .6) * (1 - .45 * Math.sin(Math.PI * q));
            if (ds < d) d = ds;
          }
        }
        return d;
      }
      var up = dv <= -hu, dd = up ? dv + hu : dv - hl;
      if (tCr > 0) { // straining flesh: rows squeezed toward the line, a dark groove, lit ridges either side
        var pin = tCr * (1 - .6 * A.smooth(tOpen / .15));
        dd *= 1 + 1.1 * pin * Math.exp(-(dd / (creW * 2.6)) * (dd / (creW * 2.6)));
        FM.cr = pin * Math.exp(-(dd / creW) * (dd / creW)); var rd = (dd < 0 ? -dd : dd) - creW * 2.2; FM.ridge = tCr * Math.exp(-(rd / creW) * (rd / creW));
        if (tOpen < .012 && tCr > .25) FM.crack = dd * R;   // before it gives: a hairline along the line
      }
      var v2 = vc + dd; px = uu * tc - v2 * tsn; py = uu * tsn + v2 * tc;   // the lips peel back: the flesh beyond them is carried away from the line
      return (Math.sqrt(px * px + py * py) - 1) * R - sh;
    }
    SD.fill(1e4); SH.fill(0); SF.fill(0); SL.fill(0); SG.fill(0); SC.fill(1e9);
    var dep = R * .95, swell = bt * cw * 1.6, lift0 = bt * .065 + .45 * fl, flow = Math.floor(tt * 3), j, i, k;
    for (j = j0; j < j1; j++) for (i = i0; i < i1; i++) {
      k = j * cols + i; var x = (i + .5) * cw, y = (j + .5) * ch, d = sdf(x, y);
      SG[k] = FM.gap; SC[k] = FM.crack; STH[k] = FM.th;
      d -= swell; if (na > 0) d += na * FL.noise(x, y, tt);
      SD[k] = d; SH[k] = FL.height(d, dep); SF[k] = FM.cr; SL[k] = FM.th ? .3 : .38 * FM.ridge;   // teeth catch more light
    }
    var tw = FAT.tw, th = FAT.th, atlas = FAT.canvas;
    if (GPU) GPU.begin(FAT, tw, th, sunAlpha(st));
    function blit(g2, tone, i, j, off) { var px = Math.round((i * cw + off) * dpr), py = Math.round(j * ch * dpr); if (GPU) GPU.add(g2, tone, px, py); else g.drawImage(atlas, g2 * tw, tone * th, tw, th, px, py, tw, th); }
    for (j = j0; j < j1; j++) {
      var off = 0, hot = false;
      if (Math.round(j * ch * dpr) > cv.height) break;
      if (glitch) { var band = j >> 1, hb = A.hash(band, tick); if (hb < E * .55) { off = Math.round((A.hash(band * 3.1, tick + 7) - .5) * E * 36) * cw; hot = hb < E * .16; } }
      for (i = i0; i < i1; i++) {
        if (thin > 0 && A.hash(i, j + 500) < thin) continue;
        k = j * cols + i; var dd = SD[k], c = 0;
        if (dd <= 0) {
          if (SC[k] < 1e8) { var leg = A.stroke(-tsn, tc, SC[k], cw, ch); if (leg >= 0 && A.hash(i * 1.7 + 3, j + tick * .37) < tCr * tCr * .9) { blit(gi.edge + leg, 0, i, j, off); continue; } }
          if (STH[k] > 2) { blit(gi.thorn + (STH[k] === 3 ? 7 : 6), 4, i, j, off); continue; }   // the point of a fang: v from above, ^ from below
          c = FL.cell(SD, SH, SF, k, i, j, cols, rows, cw, ch, tt, lift0 + SL[k], gi);
        } else if (SG[k] > 0) { // inside the opening: the wet inner wall just past the lips, then the dark
          var kw = SG[k] / (cw * (1.1 + 3 * Math.min(1, tOpen))), hw = A.hash(i + .7, j * 1.3);
          if (kw < .3) { if (hw < .8) c = (gi.ramp + 3) * 8 + 2; }
          else if (kw < .8) { if (hw < .3) c = (gi.ramp + 1 + ((A.hash(i, j) * 2) | 0)) * 8 + 1; }
          else if (A.hash(i * 2.1, j + .4) < .012) c = (gi.air + 1) * 8;
        } else c = FL.air(dd, i, j, cw, bt, 0, flow, gi);
        if (!c) continue;
        var g2 = c >> 3, tone = c & 7;
        if (glitch && A.hash(i + j * 131, tick) < E * .4) g2 = SWG + ((A.hash(i * 7 + j, tick + 3) * SWILD.length) | 0);
        blit(g2, hot ? 4 : tone, i, j, off);
      }
    }
    if (FS && FS.debris.length) { // torn-off flesh flying from the rip, in the same glyphs and tones
      var top = gi.ramp + gi.nramp - 1;
      for (var q = 0; q < FS.debris.length; q++) {
        var dg = FS.debris[q], di = Math.floor(dg.x / cw), dj = Math.floor(dg.y / ch);
        var gl = dg.k < .4 ? gi.edge + ((dg.h * 6) | 0) : dg.k < .75 ? SWG + [5, 6, 8, 9, 10][(dg.h * 5) | 0] : top - ((dg.h * 2) | 0), tn = dg.u < .25 ? 4 : dg.u < .6 ? 3 : 2;
        blit(gl, tn, di, dj, 0);
        for (var cn = 1; cn < dg.n; cn++) blit(top - 1 - ((A.hash(q + cn, 2) * 4) | 0), dg.u < .4 ? 3 : 2, di + ((A.hash(q, cn) * 3) | 0) - 1, dj + ((A.hash(cn, q + .5) * 3) | 0) - 1, 0);   // a clump, not a speck
        var sp2 = Math.hypot(dg.vx, dg.vy); if (sp2 > 500) blit(gi.air + 1, 2, Math.round(di - dg.vx / sp2 * 1.2), Math.round(dj - dg.vy / sp2 * 1.2), 0);
      }
    }
    if (GPU) GPU.end();
  }

  function drawUI(t, st) {
    // corner text fades before the dive starts, so the growing sphere never covers it
    pin.style.setProperty("--fade", ((1 - A.clamp((st.pa - (SUN_END - .02)) / .03)) * (birthOn() ? BR.x : 1)).toFixed(3));
    ringEl.style.setProperty("--rx", st.cx + "px"); ringEl.style.setProperty("--ry", st.cy + "px");
    var F = st.f; agit = F ? F.agit : 0;
    ringEl.style.setProperty("--rr", (Math.round(st.R * 1.12 * st.bs * (F ? F.ringK : 1) * dpr * 4) / (dpr * 4)) + "px");   // quarter device pixels: a steady glide
    ringEl.style.setProperty("--ro", st.thin >= 1 ? "0" : ((birthOn() ? 1 : st.a) * (1 - A.clamp(st.k * 2.2)) * (F ? F.ringO : 1)).toFixed(3));
    var jk = F && (Math.abs(F.jx) > .3 || Math.abs(F.jy) > .3) ? "translate(" + F.jx.toFixed(1) + "px," + F.jy.toFixed(1) + "px)" : "";
    if (jk !== lastJolt) { bg.style.transform = jk; lastJolt = jk; }   // the screen jolts when the flesh rips
    ringEl.style.setProperty("--rot", ringRot.toFixed(2) + "deg");
    var mins = Math.round((6 + st.nk * 6) * 60), hh = String(Math.floor(mins / 60)).padStart(2, "0"), mm = String(mins % 60).padStart(2, "0");
    var txt = hh + ":" + mm + " · ALT " + String(Math.round(st.nk * 62)).padStart(2, "0") + "° · AZ " + String(Math.round(90 + st.nk * 90)).padStart(3, "0") + "°";
    if (energy > .2) txt = txt.replace(/[0-9]/g, function (m) { return Math.random() < energy * .6 ? "#%01"[(Math.random() * 4) | 0] : m; });
    if (txt !== lastRead) { readout.textContent = txt; lastRead = txt; }
  }

  var calm = true;
  var agit = 0;   // the SUN's fear and fury shake the ring too
  function wild(t) {
    var E = Math.max(energy, agit), tick = Math.floor(t / (BEAT / 16));
    if (E > .03) {
      calm = false;
      for (var n = 0; n < ring.length; n++) {
        var o = ring[n], h = A.hash(n, tick);
        if (h < E * .85) {
          o.wild = true; o.el.classList.add("is-wild"); o.el.textContent = WILD[(A.hash(n * 3, tick) * WILD.length) | 0];
          o.el.style.setProperty("--gx", ((A.hash(n, tick + 1) - .5) * E * 70).toFixed(1) + "px");
          o.el.style.setProperty("--gy", ((A.hash(n, tick + 2) - .5) * E * 90).toFixed(1) + "px");
          o.el.style.setProperty("--gr", ((A.hash(n, tick + 4) - .5) * E * 180).toFixed(0) + "deg");
        } else if (o.wild) settle(o);
      }
    } else if (!calm) { calm = true; ring.forEach(settle); }
  }
  function settle(o) { o.wild = false; o.el.classList.remove("is-wild"); o.el.textContent = o.c; o.el.style.removeProperty("--gx"); o.el.style.removeProperty("--gy"); o.el.style.removeProperty("--gr"); }

  // ---------- hero: the Baloo 2 wordmark sampled into small characters (same atlas system as the SUN, no outline layer) ----------
  var hero = document.querySelector(".hero"), h1 = document.querySelector(".wordmark"), hcv = document.querySelector(".hero__canvas");
  var hg = hcv ? hcv.getContext("2d") : null, HW = null, heroVis = true;
  var BIRTH_HERO = !!window.BIRTH;   // the opening draws the name (and, under reduced motion, its still form in the hero)
  function buildHero() {
    HW = null; if (!hg || !h1 || BIRTH_HERO) return;
    var hb = hcv.getBoundingClientRect(), r = h1.getBoundingClientRect(), cs = getComputedStyle(h1), fs = parseFloat(cs.fontSize);
    var CW = Math.ceil(hb.width), CH = Math.ceil(hb.height); if (CW < 10 || CH < 10) return;
    hcv.width = Math.round(CW * dpr); hcv.height = Math.round(CH * dpr);
    var cw = Math.max(2, Math.min(6, Math.round(fs / 38))), ch = cw * 1.75, text = h1.textContent.trim();
    var m = document.createElement("canvas"); m.width = CW; m.height = CH;
    var mg = m.getContext("2d"), font = "800 " + fs + "px \"Baloo 2\"";
    mg.font = font; mg.letterSpacing = (-0.01282 * fs).toFixed(2) + "px"; mg.textAlign = "center"; mg.textBaseline = "alphabetic";
    var tm = mg.measureText(text), asc = tm.actualBoundingBoxAscent, desc = tm.actualBoundingBoxDescent;
    var tx = r.left - hb.left + r.width / 2, ty = r.top - hb.top + r.height / 2 + (asc - desc) / 2;
    mg.fillStyle = "#fff"; mg.fillText(text, tx, ty);
    var cov = mg.getImageData(0, 0, CW, CH).data;
    // soft height field (blurred letterforms) → per-cell normal → lit like the SUN
    var bl = document.createElement("canvas"); bl.width = CW; bl.height = CH; var bg2 = bl.getContext("2d");
    bg2.filter = "blur(" + (fs * .045).toFixed(1) + "px)"; bg2.drawImage(m, 0, 0); var hf = bg2.getImageData(0, 0, CW, CH).data;
    function hAt(x, y) { x = Math.max(0, Math.min(CW - 1, Math.round(x))); y = Math.max(0, Math.min(CH - 1, Math.round(y))); return hf[(y * CW + x) * 4 + 3] / 255; }
    var gx0 = (CW % cw) / 2, gy0 = ((ty - asc) - Math.floor((ty - asc) / ch) * ch), cols = Math.floor((CW - gx0) / cw), rows = Math.floor((CH - gy0) / ch);
    var C = new Float32Array(cols * rows), i, j, k;
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var x0 = Math.round(gx0 + i * cw), y0 = Math.round(gy0 + j * ch), x1 = Math.round(gx0 + (i + 1) * cw), y1 = Math.round(gy0 + (j + 1) * ch), sum = 0, n = 0;
      for (var yy = y0; yy < y1; yy += 1) for (var xx = x0; xx < x1; xx += 1) { sum += cov[(yy * CW + xx) * 4 + 3]; n++; }
      C[j * cols + i] = sum / (n * 255);
    }
    var cells = [], at = new Int32Array(cols * rows).fill(-1);
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var c = C[j * cols + i], px = Math.round(gx0 + (i + .5) * cw), py = Math.round(gy0 + (j + .5) * ch);
      if (c >= .5) {                                                       // half-covered cells only: counters, apertures and gaps between strokes stay open
        var s = fs * .03, gx = (hAt(px + s, py) - hAt(px - s, py)) / (2 * s), gy = (hAt(px, py + s) - hAt(px, py - s)) / (2 * s), depth = hAt(px, py);
        at[j * cols + i] = cells.length;
        cells.push({ i: i, j: j, c: c, depth: depth, edge: c < .7 || depth < .15, gx: gx * fs * .09, gy: gy * fs * .09, x: px, y: py, h: A.hash(i * 1.7, j * 3.3), ring: 0 });
        continue;
      }
      // air: empty cells within reach of the outline; ring 1 swells on every beat, ring 2 only on the accent beat
      var ring = 9;
      for (var dj = -2; dj <= 2; dj++) for (var di = -3; di <= 3; di++) {
        var ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= cols || jj >= rows || C[jj * cols + ii] < .5) continue;
        var d = Math.max(Math.abs(di), Math.abs(dj) * 1.75); if (d < ring) ring = d;
      }
      if (ring > 3.5) continue;
      at[j * cols + i] = cells.length;
      cells.push({ i: i, j: j, c: c, depth: 0, edge: false, x: px, y: py, h: A.hash(i * 1.7, j * 3.3), ring: ring <= 1.75 ? 1 : 2 });
    }
    HW = { cw: cw, ch: ch, gx0: Math.round(gx0 * dpr) / dpr, gy0: Math.round(gy0 * dpr) / dpr,   // on whole device pixels → tiles never overlap (draws can be per cell)
           cells: cells, at: at, cols: cols, rows: rows, fs: fs, AT: A.atlas(HGLYPHS, HTONES, cw, ch, 600, dpr) };
  }
  // wordmark material: no line characters, five tones #3d1528 → #ff9cc2 and never lighter (no white); light reads through character density.
  // At rest each cell sits on its own tone; the beat lifts it by up to two tones and it falls back to that same base.
  var HCH = " .·:*sun%#@", HLV = HCH.length, HWILD = "SUN01#%@*", HGE = HLV + HWILD.length, HGA = HGE + A.EDGE.length;
  var HGLYPHS = HCH + HWILD + A.EDGE + A.AIR, HTONES = ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"], HT = HTONES.length - 1;
  var HGLOW = .04, HPEAK = .13;   // top tone: at most 4% of the letter cells at rest, and only 13% of them are ever allowed to reach it
  // heartbeat on the one world clock: 60 BPM, a strong beat then a weaker one 180ms later; every 4th beat is the accent
  var HB_PERIOD = BEAT, HB_GAP = 180, HB_SECOND = .45, HB_ATTACK = 30, HB_DECAY = 70, HB_WAVE = 320;
  var HB_STEPS = 4.6, HB_EVERY = 4, HB_ACCENT = 1.3, HB_HOLD = .9;      // ramp steps at full pressure; accent strength; per-frame release (~0.3s)
  function pulse(x, a, d) { a = a || HB_ATTACK; d = d || HB_DECAY; return x < 0 ? 0 : x < a ? x / a : Math.exp(-(x - a) / d); }
  function heart(t) { var x = ((t % HB_PERIOD) + HB_PERIOD) % HB_PERIOD; return Math.min(1, pulse(x) + HB_SECOND * pulse(x - HB_GAP)); }
  // pressure at local time t: an ordinary beat peaks at 1; the accent swells longer (slower rise and fall) and peaks at HB_ACCENT
  function press(t) {
    var n = Math.floor(t / HB_PERIOD), x = t - n * HB_PERIOD;
    if (((n % HB_EVERY) + HB_EVERY) % HB_EVERY) return Math.min(1, pulse(x) + HB_SECOND * pulse(x - HB_GAP));
    return HB_ACCENT * Math.min(1, pulse(x, 50, 170) + HB_SECOND * pulse(x - HB_GAP, 40, 120));
  }
  function accentAt(t) { var n = Math.floor(t / HB_PERIOD), x = t - n * HB_PERIOD; return ((n % HB_EVERY) + HB_EVERY) % HB_EVERY ? 0 : pulse(x, 50, 170); }
  function drawHero(t) {
    if (!HW) return;
    var E = Math.min(.5, energy) * .7, AT = HW.AT, top = HLV - 1, tw = AT.tw, th = AT.th, cw = HW.cw, ch = HW.ch;
    var tick = Math.floor(t / 50), glitch = E > .03;
    var cs = HW.cells, N = cs.length, n, c;
    if (!HW.lit) { // tone and resting character per cell, from the letterform density under a fixed light (never time, hover or recovery)
      var az = -.9, el = .55, L0 = Math.sin(az) * Math.cos(el), L1 = -Math.sin(el), L2 = Math.cos(az) * Math.cos(el), fsK = 6 / HW.fs, letters = [];
      cs.forEach(function (c) {
        c.eg = -1; c.top = false;
        if (c.ring) { c.lvl = 0; c.base = 1; return; }
        letters.push(c);
        var nl = Math.hypot(c.gx, c.gy, 1), d = (-c.gx * L0 - c.gy * L1 + L2) / nl; if (d < 0) d = 0;
        var tex = .5 + .3 * Math.sin(c.y * fsK * 1.6 + Math.sin(c.x * fsK * .35) * 1.4) + .2 * Math.sin(c.x * fsK * 1.1 + c.y * fsK * .7);
        var b = (.42 + d * (.5 + .28 * tex)) * (.7 + .3 * c.depth); if (b > 1) b = 1; c.b = b;
        c.lvl = c.edge ? (c.c > .3 ? 4 : c.c > .18 ? 3 : 2) : Math.max(4, Math.round(b * (top - 1)));   // rest stays under the top: room to beat
        c.base = b > .8 ? 4 : b > .56 ? 3 : b > .43 || !c.edge ? 2 : 1;   // the body never rests on the darkest two tones; only a faint outline may
        if (c.edge) { // the letter outline: a stroke along it (same rule as the SUN rim), lit like the letter, never on the top tone
          var gl = Math.hypot(c.gx, c.gy);
          if (gl > .02) {
            var enx = -c.gx / gl, eny = -c.gy / gl, e = (c.c - .5) * (Math.abs(enx) * HW.cw + Math.abs(eny) * HW.ch);   // ≥ half-covered → the outline sits outward of the centre
            c.eg = HGE + A.edge(enx, eny, A.cross(eny, -e, HW.ch));
            c.lvl = Math.max(4, Math.min(top - 1, Math.round(b * top)));
          }
          if (c.base > 3) c.base = 3;
        }
      });
      // rest: at most HGLOW of the letter cells on the top tone; peak: only the brightest HPEAK (base ≥ 2) may ever reach it,
      // and only those may reach the densest character, so the beat never floods the name with one glyph or one colour
      var order = letters.slice().sort(function (a, b) { return b.b - a.b || a.h - b.h; }), restMax = Math.round(letters.length * HGLOW), peakMax = Math.round(letters.length * HPEAK), nr = 0, np = 0;
      order.forEach(function (c) {
        if (c.base === 4) { if (nr < restMax) nr++; else c.base = 3; }
        if (!c.edge && c.base >= 2 && np < peakMax) { c.top = true; np++; }
      });
      var mx = 0, my = 0; letters.forEach(function (c) { mx += c.x; my += c.y; }); mx /= letters.length; my /= letters.length;
      var far = 1; cs.forEach(function (c) { c.dly = Math.hypot(c.x - mx, c.y - my); far = Math.max(far, c.dly); });
      cs.forEach(function (c) {
        c.dly = c.dly / far * HB_WAVE;
        // the cell one step nearer the centre (mostly sideways: the name is wide): on the accent its character slides out into this cell
        var dx = c.x - mx, dy = (c.y - my) * cw / ch, si = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? -1 : 1) : 0, sj = si ? 0 : (dy > 0 ? -1 : 1);
        var ii = c.i + si, jj = c.j + sj; c.inN = ii < 0 || jj < 0 || ii >= HW.cols || jj >= HW.rows ? -1 : HW.at[jj * HW.cols + ii];
        c.amp = HB_STEPS * (.65 + .35 * c.depth) * (.85 + .3 * c.h);
      });
      HW.P = new Float32Array(N); HW.code = new Int16Array(N); HW.lit = true; HW.lastT = t;
    }
    var dt = Math.min(100, Math.max(0, t - HW.lastT)); HW.lastT = t;
    var hold = Math.pow(HB_HOLD, dt / 16.7), P = HW.P, code = HW.code, NT = HTONES.length;
    hg.setTransform(1, 0, 0, 1, 0, 0);
    // only the cells whose character changed are redrawn; a full redraw while rows can shift (glitch),
    // and whenever a tile does not sit on whole device pixels (neighbouring tiles could overlap by a pixel)
    var full = glitch || !HW.shown || HW.wasGlitch || Math.abs(cw * dpr - Math.round(cw * dpr)) > 1e-3 || !HW.snap;
    if (!HW.shown) { HW.shown = new Int16Array(N); var on = function (v) { return Math.abs(v * dpr - Math.round(v * dpr)) < 1e-3; };
      HW.snap = on(ch) && on(HW.gx0) && on(HW.gy0); }
    if (full) { hg.clearRect(0, 0, hcv.width, hcv.height); HW.shown.fill(-1); }
    HW.wasGlitch = glitch;
    for (n = 0; n < N; n++) {
      c = cs[n];
      // pressure: rises at once with the travelling beat, then lets go over ~0.3s; tone and character are recomputed from the fixed base every frame
      var lt = t - c.dly, p = 0;
      var gi, tn;
      if (silent && lt < 0) { P[n] = 0; code[n] = c.ring ? 0 : (c.eg >= 0 ? c.eg : c.lvl) * NT; continue; }   // not yet reached by the first beat: unlit
      if (!reduce) { var tg = press(lt); p = P[n] * hold; if (tg > p) p = tg; if (p < .004) p = 0; P[n] = p; }
      if (c.ring) {                                                       // the swell past the outline: air characters only, never bright
        var a = p * (c.ring === 1 ? 1 : (accentAt(lt) > 0 || p > 1 ? .75 : 0)) - .12 * c.h;
        gi = a > .85 ? HGA + 2 : a > .55 ? HGA + 1 : a > .3 ? HGA : 0; tn = a > .85 ? 2 : a > .55 ? 1 : 0;
      } else {
        var lift = p > 1 ? 1 : p;
        if (c.eg >= 0) { gi = c.eg; tn = Math.min(3, c.base + (lift > .6 ? 1 : 0)); }   // the outline holds its stroke; it only warms by a tone
        else {
          gi = c.lvl + Math.round(p * c.amp); var cap = c.top ? top : top - 1; if (gi > cap) gi = cap;
          tn = c.base + Math.round(lift * 2); if (tn > (c.top ? HT : HT - 1)) tn = c.top ? HT : HT - 1;
        }
      }
      code[n] = gi * NT + tn;
    }
    var lastJ = -1, off = 0;
    for (n = 0; n < N; n++) {
      c = cs[n];
      var k2 = code[n];
      if (!reduce && c.inN >= 0 && !(silent && t - c.dly < 0) && accentAt(t - c.dly) > .45) k2 = code[c.inN];   // accent: characters slide one cell outward, whole, no tween
      if (c.edge && c.eg < 0 && c.h < .25) continue;                      // edges without a clear direction: sparser
      if (c.j !== lastJ) { lastJ = c.j; off = 0;
        if (glitch) { var band = c.j >> 1, hb = A.hash(band + 40, tick); if (hb < E * .5) off = Math.round((A.hash(band * 3.1, tick + 7) - .5) * E * 8) * cw; } }
      if (glitch && !c.ring && A.hash(c.i + c.j * 131, tick) < E * .3) k2 = (HLV + ((A.hash(c.i * 7 + c.j, tick + 3) * HWILD.length) | 0)) * NT + (k2 % NT);
      if (!full && HW.shown[n] === k2) continue;
      var hx = Math.round((HW.gx0 + c.i * cw + off) * dpr), hy = Math.round((HW.gy0 + c.j * ch) * dpr);
      if (!full) hg.clearRect(hx, hy, tw, th);
      HW.shown[n] = k2; gi = (k2 / NT) | 0; if (gi === 0) continue;
      hg.drawImage(AT.canvas, gi * tw, (k2 % NT) * th, tw, th, hx, hy, tw, th);
    }
  }
  if (h1 && !reduce) h1.addEventListener("pointerenter", function () { kick(.45); });

  // ---------- footer: a small setting sun on a character horizon (static; same material) ----------
  var dusk = document.querySelector(".dusk");
  function drawDusk() {
    if (!dusk) return; sunDk = 0;
    var r = dusk.getBoundingClientRect(), Wd = Math.round(r.width), Hd = Math.round(r.height); if (Wd < 10) return;
    dusk.width = Math.round(Wd * dpr); dusk.height = Math.round(Hd * dpr);
    var dg = dusk.getContext("2d"), cw = small ? 4 : 5, ch = cw * 1.75, AT = A.atlas(GLYPHS, COLORS, cw, ch, 600, dpr), top = LV - 1;
    var rows = Math.floor(Hd / ch), hz = rows - 1, Rd = (hz - .2) * ch, cx = Wd / 2, cy = hz * ch;
    var az = -.75, el = .22, L0 = Math.sin(az) * Math.cos(el), L1 = -Math.sin(el), L2 = Math.cos(az) * Math.cos(el);
    var cols = Math.floor(Wd / cw), gx0 = (Wd - cols * cw) / 2;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var x = gx0 + (i + .5) * cw, y = (j + .5) * ch, lvl;
      if (j === hz) { // horizon line of characters, fading to the edges
        var ef = 1 - Math.abs(x - cx) / (Wd / 2); if (A.hash(i, 77) > ef * 1.4) continue; lvl = ef > .55 ? GE + 1 : GA + 1;   // a stroke '-', thinning into air '·'
        dg.drawImage(AT.canvas, lvl * AT.tw, (ef > .7 ? 3 : 1) * AT.th, AT.tw, AT.th, Math.round((gx0 + i * cw) * dpr), Math.round(j * ch * dpr), AT.tw, AT.th);
        continue;
      }
      var nx = (x - cx) / Rd, ny = (y - cy) / Rd, r2 = nx * nx + ny * ny, rr = Math.sqrt(r2);
      if (rr > 0) { var ux = nx / rr, uy = ny / rr, sd = (rr - 1) * Rd; // the rim: same stroke rule as the SUN
        var feg = A.stroke(ux, uy, sd, cw, ch);
        if (feg >= 0) {
          var rb = A.clamp(shade(ux * .999, uy * .999, .998, L0, L1, L2, Math.atan2(ux, .04), 0, 0)); lvl = Math.max(4, Math.min(top - 1, Math.round(rb * top)));
          dg.drawImage(AT.canvas, (GE + feg) * AT.tw, sunTone(lvl, rb, i, j, false) * AT.th, AT.tw, AT.th, Math.round((gx0 + i * cw) * dpr), Math.round(j * ch * dpr), AT.tw, AT.th);
          continue;
        } }
      if (r2 > 1) continue;
      var fb = shade(nx, ny, r2, L0, L1, L2, Math.atan2(nx, Math.sqrt(1 - r2)), 0, 0); lvl = Math.round(A.clamp(fb) * top); if (lvl <= 0) continue;
      dg.drawImage(AT.canvas, lvl * AT.tw, sunTone(lvl, fb, i, j, false) * AT.th, AT.tw, AT.th, Math.round((gx0 + i * cw) * dpr), Math.round(j * ch * dpr), AT.tw, AT.th);
    }
  }

  // ---------- loop: only while the scene is on screen (or something is settling) ----------
  var running = false, visible = false, lastT = 0, ready = false;
  function render(t) {
    var bb = bg.getBoundingClientRect(); bgL = bb.left; bgT = bb.top;
    var st = frameState(t);
    diving = st.atk > 0 && st.pa < 1;
    var WV = window.WORKS_VIEW;
    if (GPU) {
      GPU.clear(); if (st.thin < 1 && st.a > 0) drawSun(t, st);
      if (WV) GPU.layer(function (lg) { WV.draw(lg, dpr, W / 2, H / 2, st.pw); });
    } else {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      g.globalAlpha = sunAlpha(st); if (st.thin < 1 && st.a > 0) drawSun(t, st); g.globalAlpha = 1;
      if (WV) WV.draw(g, dpr, W / 2, H / 2, st.pw);
    }
    drawUI(t, st);
  }
  function frame(t) {
    var dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;
    energy *= Math.pow(.9, dt / 16.7); if (energy < .01) energy = 0;
    // no idle spin: rotation only from input (pointer velocity + scroll)
    rot += energy * dt * .0035 + scrollAcc * .0009; ringRot += energy * dt * .25 + scrollAcc * .05; scrollAcc = 0;
    var wt = t - CLK0; if (silent && wt > HB_WAVE + 200) silent = false;   // once the first beat has crossed the whole name
    if (visible) render(wt);
    if (heroVis) drawHero(wt);
    wild(wt);
    if ((visible || heroVis || energy > 0 || !calm) && !document.hidden) requestAnimationFrame(frame); else { running = false; lastT = 0; }
  }
  function wake() { if (ready && !running && !reduce && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  // the first beat plays once per session, and only when the page opens at its top (no hash, not restored mid-page)
  function firstVisit() {
    var seen = true;
    try { seen = !!sessionStorage.getItem("first-beat"); sessionStorage.setItem("first-beat", "1"); } catch (e) {}
    return !seen && !location.hash && scrollY <= 0;
  }
  function readyHero(cb) { // Baloo 2 must be loaded before the letterforms are sampled
    if (!document.fonts || !document.fonts.load) return cb();
    var done = false, go = function () { if (!done) { done = true; cb(); } };
    document.fonts.load("800 100px \"Baloo 2\"").then(go, go); setTimeout(go, 2000);
  }
  A.ready(function () { readyHero(function () {
    build(); buildHero(); drawDusk(); rzKey = boxKey(); ready = true; CLK0 = performance.now();
    if (!reduce && firstVisit()) { silent = true; CLK0 += HUSH; }
    root.classList.add(hero && (HW || BIRTH_HERO) ? "wm-ascii" : "wm-plain");
    if (reduce) {
      drawHero(0); render(0);
      addEventListener("scroll", function () { render(0); }, { passive: true }); // static frame; redraw only to keep Works hover/confirm in sync
      ["pointerover", "click", "focusin", "keyup"].forEach(function (ev) { document.addEventListener(ev, function () { requestAnimationFrame(function () { render(0); }); }); });
      return;
    }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; wake(); }).observe(scene);
    if (hero) new IntersectionObserver(function (es) { heroVis = es[0].isIntersecting; wake(); }).observe(hero);
    document.addEventListener("visibilitychange", wake);
    // Works sequences need frames even without input
    document.addEventListener("pointerover", wake); document.addEventListener("click", wake); document.addEventListener("keydown", wake);
    wake();
  }); });
  // a face that arrives late changes text boxes → refit so the SUN never overlaps the corner text
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { if (ready) { fit(); if (reduce) render(0); } });
  // phone bars collapsing fire resize without changing any box we draw into: skip the rebuild then (no redraw cost, no jump)
  var rz, rzKey = ""; function boxKey() { return [innerWidth, bg.offsetHeight, cv.offsetHeight, devicePixelRatio].join(); }
  addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (!ready) return; var key = boxKey(); if (key === rzKey) return; rzKey = key; build(); buildHero(); drawDusk(); if (reduce) { drawHero(0); render(0); } else wake(); }, 120); });
})();
