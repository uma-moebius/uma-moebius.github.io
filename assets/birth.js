/* The opening: the pink creature is me. Scattered cells divide and gather into the name, it beats (60 BPM, a strong beat
   and a weak one, a soft swell with thorns tearing out of the edge), and scrolling kneads the name like flesh into one
   sphere, the SUN, out of whose rim the ring is born. A finger or the pointer sticks to the flesh, stretches it and lets go.
   One signed field (px, negative = flesh) is evaluated per character cell and drawn as glyphs. The sphere ends exactly on the
   SUN of the scene (same centre and radius), and the scene takes over from there. Reduced motion: the formed name, still. */
(function () {
  "use strict";
  var A = window.ASCII, FL = window.FLESH, root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TONES = ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"];
  var MONO = A ? A.FAMILY : '"JetBrains Mono", ui-monospace, monospace';
  var scene = document.querySelector(".scene"), sun = document.querySelector(".sunsec"), bg = scene && scene.querySelector(".scene__bg");
  var cv = reduce ? document.querySelector(".hero__canvas") : document.querySelector(".birth__canvas");
  var ringEl = bg && bg.querySelector(".scene__ring");
  // the scene reads this: x = how far the scene's own SUN has taken over (0 = the birth owns the screen)
  var STATE = window.BIRTH = { on: !reduce, x: reduce ? 1 : 0, still: reduce };
  function off() { STATE.on = false; STATE.x = 1; root.classList.remove("birth"); }
  if (!A || !FL || !cv || !scene || !sun || !bg) { off(); return; }

  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function sm(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function io(v) { v = clamp(v); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var hash = A.hash;
  function back(v) { v = clamp(v); var c = 1.9; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); }
  function smin(a, b, k) { if (k <= 0) return Math.min(a, b); var h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * .25; }

  // ---------- glyphs: the flesh material (flesh.js), shared with the SUN ----------
  var GLYPHS, gi = {}, AT = null, GPU = null, g = null;

  // ---------- layout ----------
  var L = {};
  function geo() { var s = window.SCENE_GEO && window.SCENE_GEO(); return s; }
  function layout() {
    var r = (reduce ? cv : bg).getBoundingClientRect(), W = r.width, H = r.height, PH = Math.max(H, cv.getBoundingClientRect().height);
    var dpr = Math.min(2, devicePixelRatio || 1), mobile = W < 600, cw = FL.cellW(W), ch = cw * 1.75;
    var sg = geo() || { cx: W / 2, cy: H / 2, R: mobile ? W * .39 : H * .34 };
    L = { W: W, H: H, PH: PH, dpr: dpr, mobile: mobile, cw: cw, ch: ch, cols: Math.ceil(W / cw), rows: Math.ceil(PH / ch),
          tx: W / 2, ty: mobile ? H * .46 : H / 2, sx: sg.cx, sy: sg.cy, R: sg.R };
    L.cx = L.tx; L.cy = L.ty;
    cv.width = Math.round(W * dpr); cv.height = Math.round(PH * dpr); if (GPU) GPU.size(cv.width, cv.height);
    var GL = FL.glyphs(); GLYPHS = GL.chars; gi = GL.gi;
    AT = A.atlas(GLYPHS, TONES, cw, ch, 600, dpr);
    buildText(); buildTree();
    var n = L.cols * L.rows;
    L.D = new Float32Array(n); L.Hh = new Float32Array(n); L.F = new Float32Array(n); L.FX = new Float32Array(n); L.FY = new Float32Array(n);
    L.fold = new Float32Array(n); L.code = new Int32Array(n);
  }

  // the name as a signed distance field (screen px at rest), from its own mask by an exact squared-distance transform
  function edt1(f, n, d, v, z) {
    var k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (var q = 1; q < n; q++) {
      var s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0; for (q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  }
  function edt(mask, w, h, inside) {
    var INF = 1e20, out = new Float64Array(w * h), n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1), x, y;
    for (x = 0; x < w * h; x++) out[x] = (mask[x] === inside) ? 0 : INF;
    for (x = 0; x < w; x++) { for (y = 0; y < h; y++) f[y] = out[y * w + x]; edt1(f, h, d, v, z); for (y = 0; y < h; y++) out[y * w + x] = d[y]; }
    for (y = 0; y < h; y++) { for (x = 0; x < w; x++) f[x] = out[y * w + x]; edt1(f, w, d, v, z); for (x = 0; x < w; x++) out[y * w + x] = d[x]; }
    return out;
  }
  function buildText() {
    var lines = L.mobile ? ["yuma.", "tanemura"] : ["yuma.tanemura"], s = L.mobile ? 1 : .5;
    var m = document.createElement("canvas").getContext("2d");
    var fs = 100; m.font = "800 " + fs + "px \"Baloo 2\"";
    var widest = Math.max.apply(null, lines.map(function (t) { return m.measureText(t).width; }));
    fs = fs * (L.W * (L.mobile ? 1.12 : 1.14)) / widest;
    var lh = fs * .74, pad = 80;
    m.font = "800 " + fs + "px \"Baloo 2\"";
    var tmA = m.measureText(lines[0]), tmZ = m.measureText(lines[lines.length - 1]);
    var asc = tmA.actualBoundingBoxAscent, desc = tmZ.actualBoundingBoxDescent, inkH = asc + lh * (lines.length - 1) + desc;
    var tw = Math.max.apply(null, lines.map(function (t) { return m.measureText(t).width; }));
    var Wg = Math.ceil((tw + pad * 2) * s), Hg = Math.ceil((inkH + pad * 2) * s);
    var c = document.createElement("canvas"); c.width = Wg; c.height = Hg; var x = c.getContext("2d");
    x.scale(s, s); x.font = "800 " + fs + "px \"Baloo 2\""; x.textAlign = "center"; x.textBaseline = "alphabetic"; x.fillStyle = "#000";
    try { x.letterSpacing = (-0.012 * fs).toFixed(1) + "px"; } catch (e) {}
    lines.forEach(function (t, k) { x.fillText(t, Wg / s / 2, pad + asc + k * lh); });
    var a = x.getImageData(0, 0, Wg, Hg).data, mask = new Uint8Array(Wg * Hg);
    for (var q = 0; q < mask.length; q++) mask[q] = a[q * 4 + 3] > 127 ? 1 : 0;
    var dO = edt(mask, Wg, Hg, 1), dI = edt(mask, Wg, Hg, 0), SD = new Float32Array(Wg * Hg);
    for (q = 0; q < SD.length; q++) SD[q] = (mask[q] ? -(Math.sqrt(dI[q]) - .5) : (Math.sqrt(dO[q]) - .5)) / s;
    L.T = { SD: SD, w: Wg, h: Hg, s: s, ox: L.tx - Wg / s / 2, oy: L.ty - Hg / s / 2, halfW: tw / 2, halfH: inkH / 2, fs: fs, pad: pad };
  }
  function textSD(x, y) { // the name at rest, around (tx, ty)
    var T = L.T, gx = (x - T.ox) * T.s - .5, gy = (y - T.oy) * T.s - .5;
    if (gx < 0 || gy < 0 || gx >= T.w - 1 || gy >= T.h - 1) {
      var ex = Math.max(-gx, 0, gx - (T.w - 1)), ey = Math.max(-gy, 0, gy - (T.h - 1));
      return T.pad * .8 + Math.hypot(ex, ey) / T.s;
    }
    var i = gx | 0, j = gy | 0, fx = gx - i, fy = gy - j, w = T.w, k = j * w + i, S = T.SD;
    return (S[k] * (1 - fx) + S[k + 1] * fx) * (1 - fy) + (S[k + w] * (1 - fx) + S[k + w + 1] * fx) * fy;
  }

  // ---------- birth: a lineage tree over the letter mass ----------
  var D0 = 3;   // 8 founders, fed by drifting dust
  function buildTree() {
    var pts = [], cw = L.cw, ch = L.ch;
    for (var j = 0; j < L.rows; j++) for (var i = 0; i < L.cols; i++) {
      var x = (i + .5) * cw, y = (j + .5) * ch; if (textSD(x, y) < -cw * .2) pts.push([x, y]);
    }
    var id = 0;
    function node(p, depth) {
      var sx = 0, sy = 0; p.forEach(function (q) { sx += q[0]; sy += q[1]; });
      var n = { cx: sx / p.length, cy: sy / p.length, n: p.length, depth: depth, id: id++, kids: null };
      n.h = hash(n.id * .37, depth + 1.3);
      if (p.length > 3 && depth < 14) {
        var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        p.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
        var ax = (x1 - x0) >= (y1 - y0) ? 0 : 1; p.sort(function (a, b) { return a[ax] - b[ax]; });
        var mid = p.length >> 1; n.kids = [node(p.slice(0, mid), depth + 1), node(p.slice(mid), depth + 1)];
      }
      return n;
    }
    var rootN = node(pts.length ? pts : [[L.tx, L.ty]], 0), founders = [];
    (function walk(n) { if (n.depth === D0 || !n.kids) { founders.push(n); return; } n.kids.forEach(walk); })(rootN);
    founders.forEach(function (f, k) { // a founder starts as nothing, somewhere near (not at) its place, and is fed by dust
      f.sx = lerp(f.cx, L.tx, .25) + (hash(k, 9.1) - .5) * L.W * .35; f.sy = L.ty + (hash(k, 4.4) - .5) * L.H * .55;
      f.dust = [];
      for (var q = 0; q < 16; q++) { var a = hash(k * 31 + q, 2.2) * Math.PI * 2, rr = .25 + .75 * Math.sqrt(hash(k * 17 + q, 5.5));
        f.dust.push({ x: L.tx + Math.cos(a) * rr * L.W * .55, y: L.ty + Math.sin(a) * rr * L.H * .52, t0: .12 + hash(q, k + .5) * .5, h: hash(q + 3, k) }); }
    });
    var maxD = 0; (function walk(n) { maxD = Math.max(maxD, n.depth); if (n.kids) n.kids.forEach(walk); })(rootN);
    L.founders = founders; L.maxD = maxD;
  }
  var BIRTH = { gather0: .45, gather1: 2.1, div0: 1.15, div1: 2.55, toText0: 2.3, toText1: 3.0 };
  function splitTime(n) { var span = BIRTH.div1 - BIRTH.div0, k = (n.depth - D0) / Math.max(1, L.maxD - D0); return BIRTH.div0 + span * Math.pow(k, .72) + (n.h - .5) * .12; }
  function splat(x, y, r) {
    var cw = L.cw, ch = L.ch, i0 = Math.max(0, Math.floor((x - r) / cw)), i1 = Math.min(L.cols - 1, Math.ceil((x + r) / cw)),
        j0 = Math.max(0, Math.floor((y - r) / ch)), j1 = Math.min(L.rows - 1, Math.ceil((y + r) / ch)), r2 = r * r, F = L.F, FX = L.FX, FY = L.FY;
    for (var j = j0; j <= j1; j++) { var dy = (j + .5) * ch - y;
      for (var i = i0; i <= i1; i++) { var dx = (i + .5) * cw - x, q = (dx * dx + dy * dy) / r2; if (q >= 1) continue;
        var w = 1 - q, k = j * L.cols + i; F[k] += w * w * w; var gq = -6 * w * w / r2; FX[k] += gq * dx; FY[k] += gq * dy; } }
  }
  function birthField(t) {
    L.F.fill(0); L.FX.fill(0); L.FY.fill(0);
    var eg = io((t - BIRTH.gather0) / (BIRTH.gather1 - BIRTH.gather0)), grow = lerp(.75, 1, sm((t - .6) / 1.0));
    var unit = L.cw * L.ch / Math.PI;
    function draw(n, x, y) {
      if (n.kids && t >= splitTime(n)) {
        var e = back((t - splitTime(n)) / .5);
        n.kids.forEach(function (c) { draw(c, x + (c.cx - n.cx) * e, y + (c.cy - n.cy) * e); });   // daughters push apart, then settle
        return;
      }
      var r = Math.sqrt(n.n * unit) * lerp(1.45, 2.3, clamp(Math.log(n.n) / Math.LN2 / 8 - .15)) * grow; r = Math.max(r, L.cw * 2.3);
      var wob = (1 - eg) * 26 + 2.5 * (1 - sm((t - 2.2) / .8));   // a living cell is never still
      splat(x + Math.sin(t * 1.7 + n.h * 40) * wob * .4, y + Math.cos(t * 1.3 + n.h * 31) * wob * .3, r);
    }
    L.founders.forEach(function (f) {
      var dx = Math.sin(t * .55 + f.h * 20) * 34, dy = Math.cos(t * .47 + f.h * 13) * 22;
      var fx = lerp(f.sx + dx, f.cx, eg), fy = lerp(f.sy + dy, f.cy, eg), fed = 0;
      f.dust.forEach(function (p) { // dust drifts, then is drawn in along a curve and swallowed by its founder
        var u = clamp((t - p.t0) / .45), e = u * u * (3 - 2 * u);
        if (u >= 1) { fed++; return; }
        var wx = p.x + Math.sin(t * .9 + p.h * 30) * 40, wy = p.y + Math.cos(t * .7 + p.h * 20) * 26;
        var ox = -(fy - wy), oy = fx - wx, bend = Math.sin(Math.PI * e) * .35 * (p.h - .5);
        splat(lerp(wx, fx, e) + ox * bend, lerp(wy, fy, e) + oy * bend, L.cw * lerp(2.1, 2.8, e));
      });
      var gf = Math.sqrt(fed / f.dust.length);
      if (gf > 0) { var keep = grow; grow = keep * gf; draw(f, fx, fy); grow = keep; }
    });
  }

  // ---------- heart (60 BPM, strong + weak 180ms later, every 4th an accent) ----------
  function pulse(x, a, d) { return x < 0 ? 0 : x < a ? x / a : Math.exp(-(x - a) / d); }
  function press(t) {
    if (t < 0) return 0; var n = Math.floor(t), x = t - n;
    if (n % 4) return Math.min(1, pulse(x, .03, .075) + .45 * pulse(x - .18, .03, .075));
    return 1.3 * Math.min(1, pulse(x, .05, .17) + .45 * pulse(x - .18, .04, .12));
  }
  function sharp(t) { // the tear: only the first instant of each strong beat, and of the weak one at half strength
    if (t < 0) return 0; var x = t - Math.floor(t);
    var a = x < .02 ? x / .02 : Math.exp(-(x - .02) / .085), b = x < .2 ? 0 : x < .21 ? (x - .2) / .01 * .6 : .6 * Math.exp(-(x - .21) / .06);
    return Math.max(a, b);
  }

  // ---------- the morph (scroll) ----------
  var INV = null;
  function morphTables(m) { // column-wise viscous squeeze: the centre gives first, the ends lag and stretch
    var Ah = L.T.halfW, Amax = Ah + 600, N = 700, lam = .36, Qt = Ah / (L.R * .78), xs = new Float32Array(N + 1);
    for (var k = 0; k <= N; k++) { var a = k / N * Amax, ma = clamp((m - lam * Math.min(1, a / Ah)) / (1 - lam)); xs[k] = a / (1 + (Qt - 1) * io(ma)); }
    var Xmax = Math.ceil(Math.max(L.W, L.PH)) + 40, inv = new Float32Array(Xmax + 1), mas = new Float32Array(Xmax + 1), qs = new Float32Array(Xmax + 1), k2 = 0;
    for (var X = 0; X <= Xmax; X++) {
      while (k2 < N && xs[k2 + 1] < X) k2++;
      var a2; if (X >= xs[N]) a2 = Amax + (X - xs[N]); else { var f = (X - xs[k2]) / Math.max(1e-6, xs[k2 + 1] - xs[k2]); a2 = (k2 + f) / N * Amax; }
      inv[X] = a2; var ma2 = clamp((m - lam * Math.min(1, a2 / Ah)) / (1 - lam)); mas[X] = ma2; qs[X] = 1 + (Qt - 1) * io(ma2);
    }
    INV = { inv: inv, ma: mas, q: qs, Xmax: Xmax, m: m };
  }
  var fleshNoise = FL.noise;
  // signed distance of the body at screen point (x, y), morph m, time t; `calm` (0..1) stills the flesh into the SUN's clean circle
  var OUT = { d: 0, fold: 0, dep: 0 };
  function body(x, y, m, t, beat, calm) {
    var cx = L.cx, cy = L.cy, R = L.R, dx = x - cx, dy = y - cy, ox = L.tx - cx, oy = L.ty - cy;   // the name is kneaded around the moving centre
    if (m <= 0.0005) {
      var d0 = textSD(x + ox, y + oy) + .9 * L.cw * fleshNoise(x * 1.6, y * 1.6, t * .5) * .35 - beat * L.cw * .95;
      OUT.d = d0; OUT.fold = 0; OUT.dep = L.cw * 3.6; return OUT;
    }
    var X = Math.min(INV.Xmax, Math.abs(dx)), Xi = X | 0, Xf = X - Xi, X2 = Math.min(INV.Xmax, Xi + 1);
    var a = INV.inv[Xi] * (1 - Xf) + INV.inv[X2] * Xf, ma = INV.ma[Xi], Q = INV.q[Xi];
    var Vt = L.T.halfH / Math.max(Math.sqrt(Math.max(0, R * R - X * X)) * .92, R * .16), V = lerp(1, Vt, io(ma));
    var ux = cx + (dx < 0 ? -a : a), uy = cy + dy * V;
    var fat = R * .1 * sm(m / .42) * (1 - sm((m - .55) / .3));   // the letters swell into meat before they are kneaded
    var dT = textSD(ux + ox, uy + oy) / Math.sqrt(Q * Math.max(V, .35)) - fat;
    var rc = R * sm((m - .06) / .68), dC = Math.hypot(dx, dy) - rc;
    var k = R * .55 * Math.sin(Math.PI * clamp(m)) + 1;
    var dU = smin(dT, rc > 1 ? dC : 1e4, k);
    var w = sm((m - .58) / .36), dFull = Math.hypot(dx, dy) - R;
    var d = lerp(dU, dFull, w);
    var amp = L.cw * (.3 + 1.7 * Math.pow(Math.sin(Math.PI * clamp(m * .95)), .8)) + L.cw * .35 * w;
    d += (1 - calm) * amp * fleshNoise(x, y, t) * (1 + .6 * Math.sin(Math.PI * m));
    d -= beat * L.cw * lerp(.95, 1.6, w);
    OUT.d = d;
    var dT0 = dT + fat; OUT.fold = (1 - w) * sm(m * 4) * Math.exp(-(dT0 * dT0) / (L.cw * L.cw * 2.2));
    OUT.dep = lerp(L.cw * 3.6, R * .95, sm(m / .8));
    return OUT;
  }

  // ---------- physics: sprung scroll, sticky flesh ----------
  var PH = { ps: 0, pv: 0, D: [0, 0], Dv: [0, 0], C: [0, 0], att: false, last: null, t: 0 };
  function poke(x, y) { // pointer warp: the flesh around C is carried by D, falling off with a gaussian
    var s = L.R * .5, ex = x - PH.C[0], ey = y - PH.C[1], f = Math.exp(-(ex * ex + ey * ey) / (s * s));
    PK[0] = x - PH.D[0] * f; PK[1] = y - PH.D[1] * f; return PK;
  }
  var PK = [0, 0];
  function step(dt, raw, ptr, m, calm) {
    var w = 2 * Math.PI * .85, z = .55, acc0 = -w * w * (PH.ps - raw) - 2 * z * w * PH.pv;
    PH.pv += acc0 * dt; PH.ps += PH.pv * dt;
    var lim = L.R * .5 * .95;
    if (ptr && PH.last) {
      var vx = (ptr.x - PH.last.x), vy = (ptr.y - PH.last.y);
      if (!PH.att && (vx || vy)) {
        var p = poke(ptr.x, ptr.y), d = body(p[0], p[1], m, PH.t, 0, calm).d;
        if (d < 0) { PH.att = true; PH.C = [ptr.x - PH.D[0], ptr.y - PH.D[1]]; PH.Dv = [0, 0]; }
      }
      if (PH.att) {
        PH.D[0] += vx; PH.D[1] += vy;
        if (Math.hypot(PH.D[0], PH.D[1]) > lim) { PH.att = false; PH.Dv = [vx / dt * .35, vy / dt * .35]; }   // it tears free and snaps back
      }
    } else if (PH.att) { PH.att = false; PH.Dv = [0, 0]; }
    if (!PH.att) { // slow, underdamped: byon
      var w2 = 2 * Math.PI * 1.05, z2 = .16;
      for (var q = 0; q < 2; q++) { var acc = -w2 * w2 * PH.D[q] - 2 * z2 * w2 * PH.Dv[q]; PH.Dv[q] += acc * dt; PH.D[q] += PH.Dv[q] * dt; }
    }
    PH.last = ptr ? { x: ptr.x, y: ptr.y } : null;
  }

  // ---------- scroll: the opening owns the first part of About's pinned stretch ----------
  function birthLen() { return Math.max(1, sun.offsetHeight - 2.8 * L.H); }   // About keeps its own 280vh after it
  function rawProgress() { return clamp(-sun.getBoundingClientRect().top / birthLen()); }
  function pastBirth() { return clamp((-sun.getBoundingClientRect().top - birthLen()) / (L.H * .1)); }
  // phases on the sprung progress: knead → still the flesh → the ring is born → the scene takes over
  var M0 = .03, M1 = .75, CALM0 = .72, CALM1 = .85, RING0 = .78, RING1 = .92, HAND0 = .92, HAND1 = .99;

  // ---------- frame ----------
  var HEART0 = 3.15;   // first heartbeat (s): the moment the name is whole
  function render(t, ps) {
    var cols = L.cols, rows = L.rows, cw = L.cw, ch = L.ch, D = L.D, Hh = L.Hh, FO = L.fold, code = L.code;
    var m = clamp((ps - M0) / (M1 - M0)), calm = sm((ps - CALM0) / (CALM1 - CALM0)), e = io(m);
    L.cx = lerp(L.tx, L.sx, e); L.cy = lerp(L.ty, L.sy, e);
    var hb = t - HEART0, still = reduce, beat = still ? 0 : press(hb) * (1 - calm), shp = (hb >= 0 && !still ? sharp(hb) : 0) * (1 - calm);
    var inBirth = t < BIRTH.toText1, wT = sm((t - BIRTH.toText0) / (BIRTH.toText1 - BIRTH.toText0));
    if (inBirth) birthField(t);
    if (m > 0 && (!INV || INV.m !== m)) morphTables(m);
    // rows that can hold flesh, air or a thorn this frame (the rest stay empty)
    var j0 = 0, j1 = rows;
    if (!inBirth) {
      var reach = Math.max(L.T.halfH + L.T.fs * .25, m > 0 ? L.R * 1.25 : 0) + cw * 16 + Math.hypot(PH.D[0], PH.D[1]);
      j0 = Math.max(0, Math.floor((Math.min(L.ty, L.cy) - reach) / ch)); j1 = Math.min(rows, Math.ceil((Math.max(L.ty, L.cy) + reach) / ch));
    }
    D.fill(1e4); code.fill(0);
    var j, i, k, dep = L.cw * 3.6, tt = still ? 0 : t;
    for (j = j0; j < j1; j++) for (i = 0; i < cols; i++) {
      k = j * cols + i; var x = (i + .5) * cw, y = (j + .5) * ch, p = poke(x, y), d, fold = 0;
      if (inBirth) {
        var F = L.F[k], gl = Math.hypot(L.FX[k], L.FY[k]), dm = F <= 0 ? 400 : clamp((.32 - F) / Math.max(gl, 1e-4), -60, 400);
        if (wT > 0) { var o = body(p[0], p[1], 0, t, 0, 0); d = lerp(dm, o.d, wT); } else d = dm;
      } else { var o2 = body(p[0], p[1], m, tt, beat, calm); d = o2.d; fold = o2.fold; dep = o2.dep; }
      D[k] = d; FO[k] = fold;
      Hh[k] = FL.height(d, dep);
    }
    // shade
    var out = code, lift = beat * .13 * (1 - .5 * sm(m * 2)), dust = inBirth ? (1 - sm((t - 1.2) / 1.4)) : 0, flow = Math.floor(tt * 3);
    for (j = j0; j < j1; j++) for (i = 0; i < cols; i++) {
      k = j * cols + i; var dd = D[k], c = 0;
      if (dd <= 0) c = FL.cell(D, Hh, FO, k, i, j, cols, rows, cw, ch, tt, lift, gi);
      else c = FL.air(dd, i, j, cw, beat, inBirth ? 1.4 : 0, flow, gi);
      out[k] = c;
    }
    if (dust > 0) for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) { // drifting dust before the cells have eaten it
      k = j * cols + i; if (out[k] || D[k] < cw * 4) continue;
      var di = i + Math.floor(t * 2 * (hash(j, 1) - .5)), hd = hash(di * .73, j * 1.9);
      if (hd < .006 * dust) out[k] = (gi.air + 1) * 8 + (hd < .002 ? 1 : 0);
    }
    // the tear: on each strong beat a few points of the outline throw out thorns, and the outline at their root breaks open
    if (shp > .02) {
      var bi = Math.floor(hb), cand = [];
      for (j = Math.max(1, j0); j < Math.min(rows - 1, j1); j++) for (i = 1; i < cols - 1; i++) { k = j * cols + i; var v = D[k]; if (v <= 0 && v > -cw * 1.2 && D[k - 1] < 1e3) cand.push(k); }
      var nT = Math.round((L.mobile ? 12 : 26) * (m > .5 ? .8 : 1)), want = nT / Math.max(1, cand.length);
      for (var q = 0; q < cand.length; q++) {
        k = cand[q]; if (hash(k * .013, bi * 7.7 + 1) >= want) continue;
        i = k % cols; j = (k / cols) | 0;
        var gx2 = (D[k + 1] - D[k - 1]) / (2 * cw), gy2 = (D[k + cols] - D[k - cols]) / (2 * ch), g2 = Math.hypot(gx2, gy2) || 1, ux = gx2 / g2, uy = gy2 / g2;
        var len = (2.5 + hash(k, bi) * 7 * (L.mobile ? .8 : 1)) * shp, aa = Math.atan2(uy, ux) * 57.2958; if (aa < 0) aa += 180;
        var ch1 = (aa < 22 || aa >= 158) ? 3 : (aa >= 68 && aa < 112) ? 2 : (aa < 90 ? 1 : 0);   // index into THORN: / \ | -
        for (var s2 = -1; s2 <= 1; s2 += 2) { var nk = k + s2 * (Math.abs(ux) > Math.abs(uy) ? cols : 1); if (nk > 0 && nk < out.length && hash(nk, bi) < .7) out[nk] = 0; }
        for (var st = 0; st <= len; st++) {
          var px2 = (i + .5) * cw + ux * st * cw * 1.25, py2 = (j + .5) * ch + uy * st * cw * 1.25, ii = Math.floor(px2 / cw), jj = Math.floor(py2 / ch);
          if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) break;
          var tip = st > len - 1;
          out[jj * cols + ii] = (gi.thorn + (tip && hash(k, 3) < .4 ? (ux > 0 ? 5 : 4) : ch1)) * 8 + (tip ? 3 : 4);
        }
      }
    }
    paint();
  }
  function paint() {
    var cols = L.cols, rows = L.rows, cw = L.cw, ch = L.ch, out = L.code, tw = AT.tw, th = AT.th, dpr = L.dpr, j, i, cc;
    if (GPU) { GPU.clear(); GPU.begin(AT, tw, th, 1); }
    else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); }
    for (j = 0; j < rows; j++) { var yy = Math.round(j * ch * dpr);
      for (i = 0; i < cols; i++) { cc = out[j * cols + i]; if (!cc) continue; var g2 = cc >> 3, tone = cc & 7; if (!g2) continue;
        var xx = Math.round(i * cw * dpr);
        if (GPU) GPU.add(g2, tone, xx, yy); else g.drawImage(AT.canvas, g2 * tw, tone * th, tw, th, xx, yy, tw, th); } }
    if (GPU) GPU.end();
  }

  // ---------- the ring is born out of the rim, glyph by glyph, on the scene's own ring (same element, same place) ----------
  var glyphs = ringEl ? ringEl.children : [], ringShown = -1;
  function ring(r, sg) {
    if (!glyphs.length || !sg) return;
    var key = r <= 0 ? 0 : r >= 1 ? 1 : -2;
    if (key === ringShown && key !== -2) return; ringShown = key;
    var Rr = sg.R * 1.12 * sg.bs;
    for (var n = 0; n < glyphs.length; n++) {
      var el = glyphs[n].style;
      if (r >= 1) { el.removeProperty("opacity"); el.removeProperty("--rr"); el.removeProperty("color"); continue; }
      var kk = (n / 3) | 0, order = ((kk * 7) % 16) / 16, a0 = clamp((r - order * .55) / .45);
      if (a0 <= 0) { el.opacity = "0"; continue; }
      el.opacity = "1"; el.setProperty("--rr", lerp(sg.R * .9, Rr, back(a0)).toFixed(2) + "px"); el.color = TONES[a0 < .25 ? 1 : a0 < .55 ? 2 : 3];
    }
  }

  // ---------- drivers ----------
  var ptr = null, last = -1, t0 = 0, running = false, hidden = false;
  function advance(t, raw, m, calm) { // fixed substeps → the same motion whatever the frame rate
    if (last < 0) last = t;
    var span = Math.min(.1, t - last), n = Math.max(1, Math.ceil(span / (1 / 120))), dt = span / n;
    if (m > 0 && (!INV || INV.m !== m)) morphTables(m);
    for (var q = 0; q < n; q++) { PH.t = last + dt * (q + 1); step(dt || 1 / 120, raw, ptr, m, calm); }
    last = t;
  }
  function frame(now) {
    var t = (now - t0) / 1000, raw = rawProgress(), past = pastBirth();
    var sg = geo(); if (sg && (sg.cx !== L.sx || sg.cy !== L.sy || sg.R !== L.R)) { L.sx = sg.cx; L.sy = sg.cy; L.R = sg.R; INV = null; }
    var m0 = clamp((PH.ps - M0) / (M1 - M0)), c0 = sm((PH.ps - CALM0) / (CALM1 - CALM0));
    advance(t, raw, m0, c0);
    if (past > 0 && PH.ps < 1) { PH.ps = Math.max(PH.ps, lerp(PH.ps, 1, past)); }   // already into About: the opening must not trail behind
    var ps = clamp(PH.ps, 0, 1.2), x = Math.max(sm((ps - HAND0) / (HAND1 - HAND0)), past);
    STATE.x = x;
    ring(clamp((ps - RING0) / (RING1 - RING0)), sg);
    var settled = raw >= 1 && Math.abs(PH.ps - 1) < 1e-3 && Math.abs(PH.pv) < 1e-3 && x >= 1;
    // no crossfade: once the scene has drawn the SUN (the same pixels, same flesh) the opening simply steps aside
    if (x >= 1 || (x > 0 && STATE.sunDrawn)) { if (!hidden) { cv.style.visibility = "hidden"; hidden = true; } }
    else { if (hidden) { cv.style.visibility = ""; hidden = false; } render(t, ps); }
    if (settled || document.hidden) { running = false; last = -1; return; }
    requestAnimationFrame(frame);
  }
  function wake() { if (!running && STATE.on && !document.hidden) { running = true; requestAnimationFrame(frame); } }

  function start() {
    if (reduce) { // the formed name, still, where the hero was
      g = cv.getContext("2d"); if (!g) return;
      var fit = function () { layout(); INV = null; render(HEART0 + .5, 0); }; fit();
      var rz; addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(fit, 120); });
      return;
    }
    GPU = window.ASCII_GL ? window.ASCII_GL(cv, function () { GPU = null; g = fresh(); layout(); wake(); }, wake, false) : null;
    if (!GPU) g = cv.getContext("2d") || fresh();
    if (!g && !GPU) { off(); return; }
    layout();
    // opened at the top: the cells are born; arriving mid-page (a link, a restored scroll): the name is already whole
    var atTop = !location.hash && scrollY <= 2;
    t0 = performance.now() - (atTop ? 0 : HEART0 * 1000); STATE.t0 = t0;   // the SUN keeps the flesh on this clock after the handoff
    PH.ps = rawProgress(); ring(0, geo()); ringShown = -1;
    addEventListener("scroll", wake, { passive: true });
    addEventListener("pointermove", function (e) { if (e.pointerType === "mouse") ptr = { x: e.clientX, y: e.clientY }; wake(); }, { passive: true });
    document.addEventListener("pointerleave", function () { ptr = null; });
    document.addEventListener("mouseleave", function () { ptr = null; });
    addEventListener("touchstart", function (e) { var tp = e.touches[0]; if (tp) ptr = { x: tp.clientX, y: tp.clientY }; PH.last = null; wake(); }, { passive: true });
    addEventListener("touchmove", function (e) { var tp = e.touches[0]; if (tp) ptr = { x: tp.clientX, y: tp.clientY }; }, { passive: true });
    addEventListener("touchend", function (e) { if (!e.touches.length) ptr = null; }, { passive: true });
    addEventListener("touchcancel", function () { ptr = null; }, { passive: true });
    document.addEventListener("visibilitychange", wake);
    var rz2, key = ""; addEventListener("resize", function () { clearTimeout(rz2); rz2 = setTimeout(function () {
      var k2 = [innerWidth, bg.offsetHeight, cv.offsetHeight, devicePixelRatio].join(); if (k2 === key) return; key = k2; layout(); INV = null; wake(); }, 140); });
    key = [innerWidth, bg.offsetHeight, cv.offsetHeight, devicePixelRatio].join();
    wake();
  }
  function fresh() { var c = cv.cloneNode(false); cv.parentNode.replaceChild(c, cv); cv = c; return c.getContext("2d"); }
  // both faces must be in before the letterforms and the glyph atlas are measured, and the scene must have placed its SUN
  var fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("800 100px \"Baloo 2\""), document.fonts.load("600 16px " + MONO)]) : Promise.resolve();
  var begun = false;
  function go() { if (begun) return; if (!geo() && !reduce && performance.now() < 4000) { setTimeout(go, 30); return; } begun = true; try { start(); } catch (e) { off(); } }
  fonts.then(function () { A.ready(go); }, function () { A.ready(go); });
  setTimeout(function () { if (!begun) A.ready(go); }, 2500);
})();
