/* One character field — ASCII wordmark → ASCII SUN (still at rest, light drifts) → the SUN opens a mouth and
   swallows the camera → the dark thins into Works → a setting sun at the footer. Input velocity drives rotation + glitch. */
(function () {
  var A = window.ASCII;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
  // one world clock: every periodic thing is a whole number of beats (or an integer split of one) of the 60 BPM heart
  var BEAT = 1000, TAU = Math.PI * 2;
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
  var bg = scene.querySelector(".scene__bg"), cv = scene.querySelector(".scene__canvas"), g = cv.getContext("2d");
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
  var SUN_HOT = 1.05, SUN_HOT_BEAT = .92, sunDk = 0;   // light needed for the top tone at rest / on the beat: keeps it to the core of the highlight (≈4% / ≈8%)
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

  var W = 0, H = 0, dpr = 1, BASE = 8, ATS = null, ATZ = {}, R0 = 300, fcx = 0, fcy = 0, small = false;
  function build() {
    dpr = Math.min(2, devicePixelRatio || 1);
    var r = bg.getBoundingClientRect(); W = r.width; H = r.height; small = W < 769;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    BASE = small ? 6 : 8;
    CHARS = A.inkRamp(" ;====+*sun%#@", "sun", 600); GLYPHS = CHARS + WILD + A.EDGE + A.AIR;
    ATS = A.atlas(GLYPHS, COLORS, BASE, BASE * 1.75, 600, dpr);          // rest: dense ball (line = 1.75 × cell width)
    ATZ = {}; warmZoom();                                                // dive: one atlas per device-pixel cell width → tiles blit 1:1, never rescaled
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
  }
  function prog(el) { var r = el.getBoundingClientRect(), span = r.height - H; return span > 0 ? A.clamp(-r.top / span) : 1; }

  var rot = 0, ringRot = 0, lastRead = "";
  var SUN_END = .36, DIVE_END = .8, moS = 0, moV = 0, moT = 0;
  function springMo(target, t) { // critically damped, ~120ms: scroll steps arrive as one smooth motion through the whole scene
    var dt = moT ? Math.min(.05, (t - moT) / 1000) : 0, w = 1 / .12; moT = t;
    if (!dt || target === 0 && moS < 1e-4) { moS = target; moV = 0; return moS; }
    var x = moS - target, e = Math.exp(-w * dt), c = moV + w * x;
    moS = target + (x + c * dt) * e; moV = (moV - c * w * dt) * e;
    if (moS < 0) { moS = 0; moV = 0; } else if (moS > 1) { moS = 1; moV = 0; }
    return moS;
  }
  function frameState(t) {
    var pa = reduce ? .3 : prog(sun), pw = reduce ? 1 : (works.getBoundingClientRect().top <= 0 ? prog(works) : 0);
    var pf = reduce ? pa : springMo(pa, t); // everything that moves follows one sprung progress; text and anchors stay on raw scroll
    var rise = A.smooth(pf / .16), nk = A.clamp(pf / SUN_END), k = reduce ? 0 : A.smooth((pf - SUN_END) / (DIVE_END - SUN_END));
    var thin = A.clamp((pf - DIVE_END) / (1 - DIVE_END)) * .9, u = A.clamp(pw / .2);
    if (pa >= 1) thin = (window.WORKS_VIEW && window.WORKS_VIEW.empty) ? .9 : .9 + .1 * u; // empty Works: the thinned field stays
    if (reduce && works.getBoundingClientRect().top < H * .5) thin = 1; // static mode: SUN frame only while About is on screen
    var drift = reduce ? 0 : t;
    var az = (-62 + 62 * nk) * Math.PI / 180 + Math.sin(drift * TAU / (27 * BEAT)) * .22, el = .1 + .42 * nk + Math.sin(drift * TAU / (37 * BEAT) + 1) * .08;
    var Ls = [Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)], Ld = [-.25, -.32, .91];
    var L = [Ls[0] + (Ld[0] - Ls[0]) * k, Ls[1] + (Ld[1] - Ls[1]) * k, Ls[2] + (Ld[2] - Ls[2]) * k], n = Math.hypot(L[0], L[1], L[2]);
    var halfDiag = Math.hypot(W, H) / 2, Rfill = halfDiag * 3.2;
    // mouth: a thin crooked slit appears as the dive starts and opens wide, centred on the sphere = on the zoom axis
    var mo = reduce ? 0 : A.smooth((k - .1) / .85);
    return {
      pa: pa, pw: pw, k: k, thin: thin, nk: nk, a: reduce ? (sun.getBoundingClientRect().top <= 1 ? 1 : 0) : rise,   // static mode: shown only once the field is pinned
      z: Math.pow(3, 1 - (1 - k) * (1 - k)), R: R0 * (.35 + .65 * rise) * Math.pow(Rfill / R0, k), // geometric zoom; cells grow a little ahead of it (fewer blits mid-dive)
      cx: fcx + (W / 2 - fcx) * k, cy: fcy + (H / 2 - fcy) * k,   // entering About: the SUN grows in place from small (never slides in half-clipped)
      L: [L[0] / n, L[1] / n, L[2] / n],
      mo: mo, m: mouth(mo, 0)
    };
  }

  // mouth: the first 60% of mo plays Yuma's recorded mouth take up to its widest open (scroll-driven, reversible);
  // the rest is one slow, monotonic growth from that peak pose into the swallow shape at mo = 1
  var MC = window.SUN_MOUTH, MN = MC ? MC.open.length : 0, HUMAN_END = .6;
  function msample(key, x) { var a = MC[key], i = Math.floor(x), f = x - i; if (i <= 0) return a[0]; if (i >= MN - 1) return a[MN - 1]; return a[i] + (a[i + 1] - a[i]) * f; }
  function human(x) {
    var O = msample("open", x), Wd = msample("width", x), Rd = msample("roundness", x), up = msample("upper", x), lo = msample("lower", x), as = msample("asym", x);
    var span = up < 0 && lo > up ? lo - up : 0;
    return { on: O > .004, ma: Wd * (.2 + .16 * A.smooth(O / .3)), mb: .003 + .3 * O, my: .05 * (up + lo), lip: .012 + .022 * O,
      prof: .95 - .5 * Rd, tilt: as * 6, up: span > 1e-3 ? -up / span : .5, wob: .35 };
  }
  function mouth(mo, myS) {
    if (!MN) return { on: mo > 0, ma: .1 + .52 * Math.pow(mo, 1.4), mb: .003 + .62 * Math.pow(mo, 3.2), my: myS, lip: .012 + .022 * mo, prof: .7, tilt: 0, up: .5, wob: 1 };
    var S = { ma: .62, mb: .623, my: myS, lip: .034, prof: .7, tilt: 0, up: .5, wob: 1 };   // the swallow shape at mo = 1
    if (mo <= HUMAN_END) return human(mo / HUMAN_END * (MN - 1));
    var H = human(MN - 1), u = A.smooth((mo - HUMAN_END) / (1 - HUMAN_END)), o = { on: true };
    ["ma", "mb", "my", "lip", "prof", "tilt", "up", "wob"].forEach(function (key) { o[key] = H[key] + (S[key] - H[key]) * u; });
    return o;
  }

  // sphere shading shared by the SUN and the footer sun → one material
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

  function zoomAtlas(dw) { return ATZ[dw] || (ATZ[dw] = A.atlas(GLYPHS, COLORS, dw / dpr, dw / dpr * 1.75, 600, dpr)); }
  function warmZoom() { // build the dive atlases while idle, smallest first
    var lo = Math.round(BASE * dpr), hi = Math.round(BASE * 3 * dpr) + 1, w = lo;
    (function step() { if (w > hi) return; zoomAtlas(w++); (window.requestIdleCallback || setTimeout)(step); })();
  }
  // ---------- air that flows: small rigid shapes, whole-cell steps at a constant speed (no easing, no per-cell random swaps) ----------
  // each band of rows is a strip that slides past the grid; the strip is cut into slots, and some slots hold one short shape
  // (1–3 cells, one character). A cell shows whatever part of the strip is over it, so a shape keeps its outline and its
  // character while it travels; bands at different heights move at different speeds, so the field shears slowly
  function shapeAt(u, j, bw, bh, dens, seed) { // → the shape's character pick (0..1), or -1 for empty
    var bx = Math.floor(u / bw), by = Math.floor(j / bh), h = A.hash(bx + seed, by * 1.7 + seed);
    if (h >= dens) return -1;
    var len = 1 + ((A.hash(bx * 1.3 + seed, by + 7) * 3) | 0), x0 = (A.hash(bx + 3, by * 2.1 + seed) * (bw - len + 1)) | 0;
    var row = (A.hash(bx * .7, by + 11 + seed) * bh) | 0, tall = A.hash(bx, by + 13) < .3 && row < bh - 1;
    var lu = u - bx * bw, lj = j - by * bh;
    if (lu < x0 || lu >= x0 + len || (lj !== row && !(tall && lj === row + 1 && lu > x0))) return -1;
    return A.hash(bx * 2.9 + seed, by + 5);
  }
  var RING_BAND = 3, RING_SPEED = 3, MOUTH_SPEED = 4;   // rows per band; cells per beat at the top / bottom of the ring; cells per beat at the mouth's mid-line
  function ringAir(i, j, beats, ny, f, r2, rowH) { // around the SUN: upper bands drift one way, lower bands the other → reads as a slow swirl around it
    var band = Math.floor(j / RING_BAND), jr = j - band * RING_BAND, bny = ny - (jr - (RING_BAND - 1) / 2) * rowH;   // a band moves at the speed of its middle row
    var v = Math.round(-bny * RING_SPEED * 4) / 4, u = i - Math.floor(beats * v + A.hash(band, 3) * 64);
    var swell = AIR_BEAT ? heart(beats * BEAT - Math.sqrt(r2) * 300) * .25 : 0;
    var c = shapeAt(u, j, 6, RING_BAND, .2 + .55 * f + swell, 0);   // the soft envelope: more shapes near the rim, none past 1.15 R
    if (c < 0) return -1;
    return c < .45 ? 0 : c < .78 ? 1 : 2;                              // . · :
  }
  function mouthAir(i, j, beats, ex, depth, up) { // inside the mouth: both halves slide toward the centre line and vanish there
    var side = ex < 0 ? 1 : -1, ax = ex < 0 ? -ex : ex; if (ax < .07 || depth < .22) return -1;
    var v = Math.round(MOUTH_SPEED * (.5 + .5 * depth) * 4) / 4;      // deeper rows (nearer the slit's middle) are drawn in faster
    var u = i - side * Math.floor(beats * v);
    var c = shapeAt(u, j, 6, 2, .22 + .26 * depth, side > 0 ? 20 : 40);   // sparse: never a row of marks along the lips (no teeth, no lashes)
    if (c < 0) return -1;
    return up ? (c < .6 ? 0 : 3) : (c < .6 ? 4 : 5);                   // above the slit . ,  (weight at the bottom) / below ' `  (weight at the top)
  }
  function drawField(t, st) {
    var E = (st.pa >= 1 || st.k > 0) ? 0 : energy, cw = BASE * st.z, ch = BASE * 1.75 * st.z;
    var dw = Math.max(1, Math.round(cw * dpr)), AT = st.z > 1.001 ? zoomAtlas(dw) : ATS, dh = AT.th;
    var R = st.R, cx = st.cx, cy = st.cy, L0 = st.L[0], L1 = st.L[1], L2 = st.L[2], top = LV - 1, tw = AT.tw, th = AT.th, atlas = AT.canvas;
    var ext = R * 1.16, ox = W / 2, oy = H / 2;
    var i0 = Math.floor((Math.max(0, cx - ext) - ox) / cw) - 1, i1 = Math.ceil((Math.min(W, cx + ext) - ox) / cw) + 1;
    var j0 = Math.floor((Math.max(0, cy - ext) - oy) / ch) - 1, j1 = Math.ceil((Math.min(H, cy + ext) - oy) / ch) + 1;
    var tick = Math.floor(t / (BEAT / 20)), beats = t / BEAT, glitch = E > .02, dk = st.k, phase = st.k * 7 + rot * 2.5, thin = st.thin;
    var M = st.m, mouth = st.mo > 0 && M.on, ma = M.ma, mb = M.mb, my = M.my, lip = M.lip, P = M.prof, wob = M.wob, breath = t * TAU / (6 * BEAT);
    sunDk = st.k;
    var beatOn = !reduce && st.k === 0 && st.pa < 1 && (((t % BEAT) + BEAT) % BEAT) < 560;   // the SUN answers the heartbeat only while it is at rest
    var rimOn = R > cw * 3, rbw = ch * .5 / R, rlo = (1 - rbw) * (1 - rbw), rhi = (1 + rbw) * (1 + rbw), CAVA = 3 + (A.AIR.length - 3) * dk;   // as the dive zooms in, the deep air turns from dots into : , ' ` → read as type, not as specks
    // mouth as a signed field (px; + inside the open mouth, − on lips / sphere), so its outline is found like the rim
    var cOpen = 0, cDy = 0, cLim = 0, cUp = false;
    function cav(nx, ny) {
      var ex = nx / ma, ax = ex < 0 ? -ex : ex; if (ax >= 1.25) { cOpen = 0; return -1e9; }
      var open = ax < 1 ? Math.pow(1 - ax * ax, P) : 0;
      // crooked, slowly breathing slit (asymmetric: no face, no teeth)
      var mid = my + M.tilt * ex * mb + wob * mb * (.18 * Math.sin(ex * 2.3 + .7) + .05 * Math.sin(ex * 5.1 + breath * .6));
      var hgt = mb * open * (1 + wob * (.06 * Math.sin(breath + ex * 3.1) + .04 * Math.sin(breath * 1.5 - ex * 6.3)));
      var dyS = ny - mid, lim = dyS < 0 ? hgt * 2 * M.up : hgt * 2 * (1 - M.up), dy = dyS < 0 ? -dyS : dyS; // upper lip lift vs jaw drop
      cOpen = open; cDy = dy; cLim = lim; cUp = dyS < 0;
      return (lim - dy - (ax > 1 ? (ax - 1) * ma : 0)) * R;
    }
    function blit(gi, lvl, i, py, off) { g.drawImage(atlas, gi * tw, lvl * th, tw, th, Math.round((ox + i * cw + off) * dpr), py, dw, dh); }
    var lipCol = {};   // the mouth field is not an exact distance: remember which cells already carry a lip crossing (per column / in this row)
    for (var j = j0; j < j1; j++) {
      var y = oy + (j + .5) * ch, ny = (y - cy) / R, off = 0, hot = false, py = Math.round((oy + j * ch) * dpr), lipRow = -9;
      if (py > cv.height || py + dh < 0) continue;
      if (glitch) { var band = j >> 1, hb = A.hash(band, tick); if (hb < E * .55) { off = Math.round((A.hash(band * 3.1, tick + 7) - .5) * E * 36) * cw; hot = hb < E * .16; } }
      for (var i = i0; i < i1; i++) {
        if (thin > 0 && A.hash(i, j + 500) < thin) continue;
        var x = ox + (i + .5) * cw, nx = (x - cx) / R, r2 = nx * nx + ny * ny, lvl, gi;
        var wildHit = glitch && A.hash(i + j * 131, tick) < E * .4;
        // rim: the cells the sphere outline actually passes through (one per row / column) take a stroke along it
        if (rimOn && r2 > rlo && r2 < rhi) {
          var rr = Math.sqrt(r2), ux = nx / rr, uy = ny / rr, sd = (rr - 1) * R, eg = A.stroke(ux, uy, sd, cw, ch);
          if (eg >= 0) {
            var rb = shade(ux * .999, uy * .999, .998, L0, L1, L2, Math.atan2(ux, .04) + rot, dk, phase);
            lvl = Math.round((rb > 1 ? 1 : rb < 0 ? 0 : rb) * top); lvl = lvl < 4 ? 4 : lvl > top - 1 ? top - 1 : lvl;  // the dark side keeps a dim contour
            // shadow side: the contour thins out and breaks into air, so the terminator stays soft (full line wherever it is lit)
            var lit = Math.max(dk, A.smooth((rb - .08) / .3)), hd = A.hash(i + 913.1, j * 1.7 + 5.3);
            if (!wildHit && hd > .15 + .85 * lit) {
              if (hd > .5 + .5 * lit) continue;
              blit(GA + (hd > .4 + .5 * lit ? 0 : 1), hot ? ST : T_DEEP, i, py, off); continue;
            }
            gi = wildHit ? LV + ((A.hash(i * 7 + j, tick + 3) * WILD.length) | 0) : GE + eg;
            blit(gi, hot ? ST : sunTone(lvl, rb, i, j, beatOn && heart(t - rr * 300) > .4), i, py, off); continue;
          }
        }
        if (r2 <= 1) {
          var lon = Math.atan2(nx, Math.sqrt(1 - r2)) + rot;
          var b = shade(nx, ny, r2, L0, L1, L2, lon, dk, phase);
          if (mouth && (nx / ma) > -1.25 && (nx / ma) < 1.25) {
            var s0 = cav(nx, ny), open = cOpen, dy = cDy, lim = cLim;
            if (s0 > -2 * ch && s0 < 2 * ch) { // near the outline: is it inside this cell?
              var hx = cw * .5 / R, hy = ch * .5 / R;
              var gx = (cav(nx + hx, ny) - cav(nx - hx, ny)) / cw, gy = (cav(nx, ny + hy) - cav(nx, ny - hy)) / ch, gl = Math.hypot(gx, gy);
              if (gl > 1e-6) {
                var mnx = gx / gl, mny = gy / gl, ds = s0 / gl, meg = A.stroke(mnx, mny, ds, cw, ch);
                if (meg >= 3 ? lipRow === i - 1 : meg >= 0 && lipCol[i] === j - 1) meg = -1;   // the neighbour already drew this crossing
                if (meg >= 3) lipRow = i; else if (meg >= 0) lipCol[i] = j;
                if (meg >= 0) { // the lip line: one stroke per crossing, in the lip tone
                  var lb = .62 + .3 * (.6 + .4 * open);
                  lvl = Math.min(top - 3, Math.round(lb * top));   // the lip line stays pink: a crisp line, not a white drawn outline
                  gi = wildHit ? LV + ((A.hash(i * 7 + j, tick + 3) * WILD.length) | 0) : GE + meg;
                  blit(gi, hot ? ST : sunTone(lvl, lb, i, j, false), i, py, off); continue;
                }
              }
            }
            if (s0 > 0) { // cavity: sparse rigid patches of air sliding cell by cell toward the mouth centre (being drawn in)
              var q = dy / lim, depth = (1 - q * q) * open, mg = mouthAir(i, j, beats, nx / ma, depth, cUp);
              if (mg < 0) continue;
              blit(GA + mg, T_DIM, i, py, off); continue;
            }
            var lw = lip * (.4 + .6 * open), e2 = dy - lim;
            if (e2 < lw) b = .62 + .3 * (1 - e2 / lw) * (.6 + .4 * open);          // soft lip edge, brighter
            else if (e2 < lw * 3.2) b *= .45 + .55 * ((e2 - lw) / (lw * 2.2));   // the fold just outside the lip sinks into shade
          }
          lvl = Math.round((b > 1 ? 1 : b < 0 ? 0 : b) * top);
          if (lvl <= 0) continue;
          gi = lvl;
          if (lvl <= 5 && r2 > .77 && dk < 1) { // the dark rows near the shadow-side contour break into air too: no hard '=' edge against the dark
            var fade = A.smooth((Math.sqrt(r2) - .88) / .12) * (1 - dk) * (1 - lvl / 6), hz = A.hash(i + 377.7, j * 2.3 + 1.1);
            if (hz < fade) { if (hz < fade * .45) continue; gi = GA + (hz < fade * .75 ? 0 : 1); lvl = -1; }
          }
        } else if (r2 < 1.32) { // air around the SUN
          var f = (1.15 - Math.sqrt(r2)) / .15; if (f <= 0) continue;
          var ag = ringAir(i, j, beats, ny, f, r2, ch / R); if (ag < 0) continue;
          gi = GA + ag; lvl = ag === 2 ? -2 : -1;
        } else continue;
        if (wildHit) gi = LV + ((A.hash(i * 7 + j, tick + 3) * WILD.length) | 0);
        blit(gi, hot ? ST : lvl === -1 ? T_DEEP : lvl === -2 ? T_DIM : sunTone(lvl, b, i, j, beatOn && heart(t - Math.sqrt(r2) * 300) > .4), i, py, off);
      }
    }
  }

  function drawUI(t, st) {
    // corner text fades before the dive starts, so the growing sphere never covers it
    pin.style.setProperty("--fade", (1 - A.clamp((st.pa - (SUN_END - .02)) / .03)).toFixed(3));
    ringEl.style.setProperty("--rx", st.cx + "px"); ringEl.style.setProperty("--ry", st.cy + "px");
    ringEl.style.setProperty("--rr", (st.R * 1.12) + "px");
    ringEl.style.setProperty("--ro", st.thin >= 1 ? "0" : (st.a * (1 - A.clamp(st.k * 2.2))).toFixed(3));
    ringEl.style.setProperty("--rot", ringRot.toFixed(2) + "deg");
    var mins = Math.round((6 + st.nk * 6) * 60), hh = String(Math.floor(mins / 60)).padStart(2, "0"), mm = String(mins % 60).padStart(2, "0");
    var txt = hh + ":" + mm + " · ALT " + String(Math.round(st.nk * 62)).padStart(2, "0") + "° · AZ " + String(Math.round(90 + st.nk * 90)).padStart(3, "0") + "°";
    if (energy > .2) txt = txt.replace(/[0-9]/g, function (m) { return Math.random() < energy * .6 ? "#%01"[(Math.random() * 4) | 0] : m; });
    if (txt !== lastRead) { readout.textContent = txt; lastRead = txt; }
  }

  var calm = true;
  function wild(t) {
    var E = energy, tick = Math.floor(t / (BEAT / 16));
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
  var hg = hcv ? hcv.getContext("2d") : null, HW = null, heroVis = true, heroT0 = 0;
  function buildHero() {
    HW = null; if (!hg || !h1) return;
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
    var tick = Math.floor(t / 50), glitch = E > .03, intro = reduce ? 1 : A.clamp((t - heroT0) / 1100);
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
    // only the cells whose character changed are redrawn; a full redraw while rows can shift (glitch), during the intro,
    // and whenever a tile does not sit on whole device pixels (neighbouring tiles could overlap by a pixel)
    var full = glitch || intro < 1 || !HW.shown || HW.wasGlitch || Math.abs(cw * dpr - Math.round(cw * dpr)) > 1e-3 || !HW.snap;
    if (!HW.shown) { HW.shown = new Int16Array(N); var on = function (v) { return Math.abs(v * dpr - Math.round(v * dpr)) < 1e-3; };
      HW.snap = on(ch) && on(HW.gx0) && on(HW.gy0); }
    if (full) { hg.clearRect(0, 0, hcv.width, hcv.height); HW.shown.fill(-1); }
    HW.wasGlitch = glitch;
    for (n = 0; n < N; n++) {
      c = cs[n];
      // pressure: rises at once with the travelling beat, then lets go over ~0.3s; tone and character are recomputed from the fixed base every frame
      var lt = t - c.dly, p = 0;
      if (!reduce) { var tg = press(lt); p = P[n] * hold; if (tg > p) p = tg; if (p < .004) p = 0; P[n] = p; }
      var gi, tn;
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
      if (!reduce && c.inN >= 0 && accentAt(t - c.dly) > .45) k2 = code[c.inN];   // accent: characters slide one cell outward, whole, no tween
      if (c.h > intro) continue;
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
    var st = frameState(t);
    diving = st.k > 0 && st.pa < 1;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.globalAlpha = st.a; if (st.thin < 1) drawField(t, st); g.globalAlpha = 1;
    if (window.WORKS_VIEW) window.WORKS_VIEW.draw(g, dpr, W / 2, H / 2, st.pw);
    drawUI(t, st);
  }
  function frame(t) {
    var dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;
    energy *= Math.pow(.9, dt / 16.7); if (energy < .01) energy = 0;
    // no idle spin: rotation only from input (pointer velocity + scroll)
    rot += energy * dt * .0035 + scrollAcc * .0009; ringRot += energy * dt * .25 + scrollAcc * .05; scrollAcc = 0;
    if (visible) render(t);
    if (heroVis) drawHero(t);
    wild(t);
    if ((visible || heroVis || energy > 0 || !calm) && !document.hidden) requestAnimationFrame(frame); else { running = false; lastT = 0; }
  }
  function wake() { if (ready && !running && !reduce && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  function readyHero(cb) { // Baloo 2 must be loaded before the letterforms are sampled
    if (!document.fonts || !document.fonts.load) return cb();
    var done = false, go = function () { if (!done) { done = true; cb(); } };
    document.fonts.load("800 100px \"Baloo 2\"").then(go, go); setTimeout(go, 2000);
  }
  A.ready(function () { readyHero(function () {
    build(); buildHero(); drawDusk(); ready = true; heroT0 = performance.now();
    root.classList.add(hero && HW ? "wm-ascii" : "wm-plain");
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
  var rz; addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (!ready) return; build(); buildHero(); drawDusk(); if (reduce) { drawHero(0); render(0); } else wake(); }, 120); });
})();
