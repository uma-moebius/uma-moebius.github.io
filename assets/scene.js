/* The page's own field behind About and Works: the Works characters, the heading decode, the cursor and the
   setting sun at the footer. The SUN's body itself is drawn by the opening (birth.js) on its own canvas, all the way down.
   Input velocity drives glitch. */
(function () {
  var A = window.ASCII;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
  // one world clock: every periodic thing is a whole number of beats (or an integer split of one) of the 60 BPM heart
  var BEAT = 1000, TAU = Math.PI * 2;
  // the first beat: on the first visit of a session, opened at the top, the world waits in near-silence and starts on one heartbeat.
  // The clock's zero is that beat (an accent, beat 0 of 4), so the heart and the air start together
  var HUSH = 900, CLK0 = 0, silent = false;   // ms of silence before the first beat; the world clock's zero (page time); waiting for it
  var cursor = document.querySelector(".sun-cursor");
  if (fine && !reduce) root.classList.add("has-sun-cursor");

  // ---------- input velocity ----------
  var energy = 0, lx = null, ly = 0, lt = 0, lastY = scrollY, lastYT = performance.now();
  function kick(v) { if (!reduce && v > 0) energy = Math.min(1, Math.max(energy, v)); wake(); }
  addEventListener("pointermove", function (e) {
    if (cursor) { root.style.setProperty("--cx", e.clientX + "px"); root.style.setProperty("--cy", e.clientY + "px");
      cursor.classList.toggle("is-over", !!(e.target.closest && e.target.closest("a,button,input,textarea"))); }
    var now = performance.now();
    if (lx !== null && e.pointerType === "mouse") { var dt = Math.max(8, now - lt); kick((Math.hypot(e.clientX - lx, e.clientY - ly) / dt - .7) / 3.2); }
    lx = e.clientX; ly = e.clientY; lt = now;
  }, { passive: true });
  addEventListener("scroll", function () {
    var now = performance.now(), dy = scrollY - lastY, dt = Math.max(8, now - lastYT);
    lastY = scrollY; lastYT = now; kick((Math.abs(dy) / dt - .6) / 2.5);
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
  // glyph roles (A.EDGE / A.AIR): the interior ramp holds no air or stroke characters — the dark side is ';' and '=' rows, not dust
  // the interior set; its order is re-measured (ink coverage, JetBrains Mono 600) before the first atlas — 'sun' stays as one block
  var CHARS = " ;====+*sun%#@", LV = CHARS.length, WILD = "SUN01/#:<>*", GE = LV + WILD.length, GA = GE + A.EDGE.length;
  var GLYPHS = CHARS + WILD + A.EDGE + A.AIR;
  // the same five tones as the wordmark, capped at the light pink (never white); atlas rows are tones, not levels
  var COLORS = ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"], ST = COLORS.length - 1;
  var SUN_TL = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4];   // glyph level → resting tone
  var SUN_HOT = 1.05, SUN_HOT_BEAT = .92;   // light needed for the top tone (at rest; the beat value is unused: the heartbeat belongs to the wordmark)
  // tone of a sphere cell from its level, recomputed every frame (never accumulated); `up` = the beat lifts it by one
  function sunTone(lvl, b, i, j, up) {
    var tn = SUN_TL[lvl], ok = b >= (up ? SUN_HOT_BEAT : SUN_HOT);
    if (tn === undefined) tn = ST;
    if (tn === ST && !ok) tn = ST - 1;
    if (up && tn < ST) { tn++; if (tn === ST && (lvl < SUN_TL.length - 3 || !ok)) tn = ST - 1; }
    return tn;
  }

  var W = 0, H = 0, PH = 0, dpr = 1, BASE = 8, R0 = 300, fcx = 0, fcy = 0, small = false;
  function build() {
    dpr = Math.min(2, devicePixelRatio || 1);
    var r = bg.getBoundingClientRect(); W = r.width; H = r.height; small = W < 769;
    PH = Math.max(H, cv.getBoundingClientRect().height);   // painted height: the large viewport on phones (H stays the layout box)
    cv.width = Math.round(W * dpr); cv.height = Math.round(PH * dpr); if (GPU) GPU.size(cv.width, cv.height);
    BASE = small ? 6 : 8;
    CHARS = A.inkRamp(" ;====+*sun%#@", "sun", 600); GLYPHS = CHARS + WILD + A.EDGE + A.AIR;
    fit();
  }
  // the free area around the status screen (the still body under reduced motion sits there)
  function fit() {
    var p = pin.getBoundingClientRect();
    function rr(el) { if (!el) return null; var b = el.getBoundingClientRect(); return { l: b.left - p.left, r: b.right - p.left, t: b.top - p.top, b: b.bottom - p.top }; }
    var blocks = [rr(pin.querySelector(".status__stats")), rr(pin.querySelector(".status__portrait"))];
    var half;
    if (!small) { fcx = W / 2; fcy = H / 2; half = Math.min((W - 48) / 2, (H - 48) / 2); }
    else { fcx = W / 2; fcy = H / 2; half = Math.min(W - 16, H - 32) / 2; }
    blocks.forEach(function (b) {
      if (!b || b.r <= b.l || b.b <= b.t) return;
      var dx = Math.max(b.l - 24 - fcx, 0, fcx - b.r - 24), dy = Math.max(b.t - 24 - fcy, 0, fcy - b.b - 24);
      half = Math.min(half, Math.hypot(dx, dy));
    });
    if (half < 16) half = 16;
    var pad = Math.max(11, Math.min(18, half * .045));   // the margin around the sphere (keeps its size)
    R0 = (half - pad) / 1.12;
  }
  function prog(el) { var r = el.getBoundingClientRect(), span = r.height - H; return span > 0 ? A.clamp(-r.top / span) : 1; }
  // the opening (birth.js) takes the first stretch of About's pinned scroll; About's own timeline starts after it, unchanged
  var BR = window.BIRTH && window.BIRTH.on ? window.BIRTH : null;
  function birthOn() { return BR && BR.on && root.classList.contains("birth"); }
  window.SCENE_GEO = function () { return ready ? { cx: fcx, cy: fcy, R: R0 } : null; };

  function frameState() {
    var pw = reduce ? 1 : (works.getBoundingClientRect().top <= 0 ? prog(works) : 0);
    return { pw: pw };
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

  function drawUI(t, st) {
    // About's text shows once the body has settled, and gives way as Works comes in
    pin.style.setProperty("--fade", (reduce ? 1 : (birthOn() ? BR.x : 1) * (1 - A.clamp(st.pw / .2))).toFixed(3));
  }

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
    if (!dusk) return;
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
    var st = frameState(t), WV = window.WORKS_VIEW;
    if (GPU) {
      GPU.clear();
      if (WV) GPU.layer(function (lg) { WV.draw(lg, dpr, W / 2, H / 2, st.pw); });
    } else {
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
      if (WV) WV.draw(g, dpr, W / 2, H / 2, st.pw);
    }
    drawUI(t, st);
  }
  function frame(t) {
    var dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;
    energy *= Math.pow(.9, dt / 16.7); if (energy < .01) energy = 0;
    var wt = t - CLK0; if (silent && wt > HB_WAVE + 200) silent = false;   // once the first beat has crossed the whole name
    if (visible) render(wt);
    if (heroVis) drawHero(wt);
    if ((visible || heroVis || energy > 0) && !document.hidden) requestAnimationFrame(frame); else { running = false; lastT = 0; }
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
