/* The opening: the pink creature is me. Scattered cells divide and gather into the name, it beats (60 BPM, a strong beat
   and a weak one, a soft swell, short spikes pulsing out of the edge), and scrolling kneads the name like flesh into one
   body, the SUN: not a clean sphere but an unsteady lump of many balls of flesh pressed together. Scrolled on, the same body
   (the same mass: it thins as it spreads) stretches long, opens in the middle and spreads to the edges of the screen, where
   it stays as a frame of flesh around everything that follows. A finger or the pointer sticks to the body, stretches it and lets go.
   One signed field (px, negative = flesh) is evaluated per character cell and drawn as glyphs on one fixed canvas, so the
   body stays the same body all the way down. Reduced motion: the formed name, still. */
(function () {
  "use strict";
  var A = window.ASCII, FL = window.FLESH, root = document.documentElement;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TONES = ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"];
  var MONO = A ? A.FAMILY : '"JetBrains Mono", ui-monospace, monospace';
  var scene = document.querySelector(".scene"), sun = document.querySelector(".sunsec"), bg = scene && scene.querySelector(".scene__bg");
  var cv = reduce ? document.querySelector(".hero__canvas") : document.querySelector(".flesh__canvas");
  // the scene reads this: x = how far the body has settled (0 = still forming; About's text shows as it reaches 1)
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
  function layout() {
    var r = (reduce ? cv : bg).getBoundingClientRect(), W = r.width, H = r.height, PH = Math.max(H, cv.getBoundingClientRect().height);
    var dpr = Math.min(2, devicePixelRatio || 1), mobile = W < 600, cw = FL.cellW(W), ch = cw * 1.75;
    L = { W: W, H: H, PH: PH, dpr: dpr, mobile: mobile, cw: cw, ch: ch, cols: Math.ceil(W / cw), rows: Math.ceil(PH / ch),
          tx: W / 2, ty: mobile ? H * .46 : H / 2, sx: W / 2, sy: H / 2, R: Math.min(W, H) * (mobile ? .36 : .34), Hv: innerHeight || H };
    L.cx = L.tx; L.cy = L.ty;
    cv.width = Math.round(W * dpr); cv.height = Math.round(PH * dpr); if (GPU) GPU.size(cv.width, cv.height);
    var GL = FL.glyphs(); GLYPHS = GL.chars; gi = GL.gi;
    AT = A.atlas(GLYPHS, TONES, cw, ch, 600, dpr);
    buildText(); buildTree(); buildBalls(); if (!reduce) frameInset();
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
  function sharp(t) { // the pulse: only the first instant of each strong beat, and of the weak one at half strength
    if (t < 0) return 0; var x = t - Math.floor(t);
    var a = x < .02 ? x / .02 : Math.exp(-(x - .02) / .085), b = x < .2 ? 0 : x < .21 ? (x - .2) / .01 * .6 : .6 * Math.exp(-(x - .21) / .06);
    return Math.max(a, b);
  }

  // ---------- the body: many balls of flesh pressed together ----------
  // Each ball keeps a place on the body: u = where round it sits (0..1), and how deep under the surface. The balls are joined
  // to each other and to a shallow core, so the body reads as lumps all over, with creases where two of them meet.
  // Every ball is a pair lying on itself; as the body spreads into the frame the two part, as a cell divides.
  var B = null, TS = 48, TL = { start: null, list: null, cols: 0 };
  function buildBalls() {
    var n = L.mobile ? 44 : 48, N = n * 2;
    B = { n: N, half: n, u: new Float32Array(N), dd: new Float32Array(N), sz: new Float32Array(N), h: new Float32Array(N), x: new Float32Array(N), y: new Float32Array(N), r: new Float32Array(N) };
    for (var i = 0; i < n; i++) {
      var rho = Math.sqrt((i + .5) / n);
      B.u[i] = B.u[i + n] = (i * .6180339887 + .13) % 1; B.dd[i] = B.dd[i + n] = 1 - .92 * rho;   // spread like seeds in a flower head, deeper toward the middle
      B.sz[i] = B.sz[i + n] = .62 + .8 * Math.pow(hash(i, 2.6), 1.4); B.h[i] = hash(i, 4.1); B.h[i + n] = hash(i, 6.3);
    }
  }
  // a point on the outline of a rounded box (half sizes bx, by, corner radius r), at u of the way round, from the right middle
  var PT = [0, 0];
  function onBox(bx, by, r, u) {
    var P = 4 * bx + 4 * by + 2 * Math.PI * r, s = (((u % 1) + 1) % 1) * P, q = Math.PI * r / 2;
    if (P <= 1e-6) { PT[0] = 0; PT[1] = 0; return PT; }
    var seg = [by, q, 2 * bx, q, 2 * by, q, 2 * bx, q, by];
    for (var k = 0; k < 9; k++) { if (s <= seg[k] || k === 8) break; s -= seg[k]; }
    var a;
    switch (k) {
      case 0: PT[0] = bx + r; PT[1] = s; break;
      case 1: a = s / (r || 1); PT[0] = bx + r * Math.cos(a); PT[1] = by + r * Math.sin(a); break;
      case 2: PT[0] = bx - s; PT[1] = by + r; break;
      case 3: a = Math.PI / 2 + s / (r || 1); PT[0] = -bx + r * Math.cos(a); PT[1] = by + r * Math.sin(a); break;
      case 4: PT[0] = -bx - r; PT[1] = by - s; break;
      case 5: a = Math.PI + s / (r || 1); PT[0] = -bx + r * Math.cos(a); PT[1] = -by + r * Math.sin(a); break;
      case 6: PT[0] = -bx + s; PT[1] = -by - r; break;
      case 7: a = 1.5 * Math.PI + s / (r || 1); PT[0] = bx + r * Math.cos(a); PT[1] = -by + r * Math.sin(a); break;
      default: PT[0] = bx + r; PT[1] = -by + s;
    }
    return PT;
  }
  function rbox(px, py, bx, by, r) {
    var qx = Math.abs(px) - bx, qy = Math.abs(py) - by, ox = qx > 0 ? qx : 0, oy = qy > 0 ? qy : 0;
    return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
  }
  // G: the body's core this frame. cx, cy: centre; bx, by, r: its rounded box; t: depth of the hole in it (Infinity = none);
  // thick: how deep the flesh is; rb: the size of a lump; ring (0..1): how far the balls have moved into the ring's depth
  var G = { cx: 0, cy: 0, bx: 0, by: 0, r: 1, t: Infinity, thick: 1, rb: 1, ring: 0 };
  // the frame: at f = 0 the round body; it stretches into a long bar (f .4), then its middle opens and it spreads out to the
  // screen's edges (f 1). Its area stays that of the round body with its lumps (the lumps sink into the bar as it stretches),
  // so the flesh gets thinner as it spreads.
  function area(bx, by, r) { return 4 * bx * by + 4 * r * (bx + by) + Math.PI * r * r; }
  function eroded(bx, by, r, t) { return t <= r ? area(bx, by, r - t) : area(Math.max(0, bx - (t - r)), Math.max(0, by - (t - r)), 0); }
  function frameEnd() { // the frame's outer box: just past the screen's edges, rounded so the corners are covered too
    var b = Math.round(Math.min(L.W, L.Hv) * (L.mobile ? .075 : .08)), o = b * .15;
    return { bx: L.W / 2 + o - b, by: L.Hv / 2 + o - b, r: b, o: o };
  }
  function frameGeo(f) {
    var A0 = Math.PI * L.R * L.R * (1 + .25 * sm(f / .4)), W = L.W, Hv = L.Hv, s = io(f / .4), g = io((f - .4) / .6), long = W >= Hv, a1 = .3 * Math.max(W, Hv);
    function bar(a) { return (-4 * a + Math.sqrt(16 * a * a + 4 * Math.PI * A0)) / (2 * Math.PI); }   // a bar this long, as thick as the area allows
    var a = s * a1, bx = long ? a : 0, by = long ? 0 : a, r = bar(a);
    if (g > 0) { var E = frameEnd(); bx = lerp(long ? a1 : 0, E.bx, g); by = lerp(long ? 0 : a1, E.by, g); r = lerp(bar(a1), E.r, g); }
    G.cx = lerp(L.sx, W / 2, g); G.cy = lerp(L.sy, Hv / 2, g); G.bx = bx; G.by = by; G.r = r;
    var Aout = area(bx, by, r), t = Infinity;
    if (Aout > A0 * 1.0005) { // the hole: as deep in from the outline as keeps the area
      var want = Aout - A0, lo = 0, hi = r + Math.min(bx, by);
      for (var q = 0; q < 28; q++) { var mid = (lo + hi) / 2; if (eroded(bx, by, r, mid) > want) lo = mid; else hi = mid; }
      t = (lo + hi) / 2;
    }
    G.t = t; G.thick = t < 1e8 ? t : r + Math.min(bx, by); G.rb = Math.min(L.R * .27, G.thick * .75); G.ring = sm((f - .35) / .5);
    return G;
  }
  function frameInset() { // how far in from the screen's edges the settled frame can reach: content stays inside that
    frameGeo(1); var E = frameEnd(), fi = G.t - G.rb * .3 - E.o;
    for (var i = 0; i < B.n; i++) fi = Math.max(fi, (.35 + .45 * B.h[i]) * G.t + G.rb * B.sz[i] * .8 * 1.12 + G.rb * .12 - E.o);
    L.fi = Math.ceil(fi + 6); root.style.setProperty("--fi", L.fi + "px");
  }
  function lumpBody(cx, cy) { G.cx = cx; G.cy = cy; G.bx = 0; G.by = 0; G.r = L.R; G.t = Infinity; G.thick = L.R; G.rb = L.R * .27; G.ring = 0; return G; }
  function placeBalls(tt, beat) {
    var n = B.n, e, bx, by, r, wob = G.rb * .12, br = 1 + .05 * beat, tc = Math.ceil(L.W / TS) + 1, tr = Math.ceil(L.PH / TS) + 1, nt = tc * tr;
    var split = G.ring * .5 / B.half, shrink = 1 - .2 * G.ring;
    for (var i = 0; i < n; i++) {
      var dr = lerp(B.dd[i], .35 + .45 * B.h[i], G.ring);
      e = dr * G.thick;
      if (e <= G.r) { bx = G.bx; by = G.by; r = G.r - e; } else { bx = Math.max(0, G.bx - (e - G.r)); by = Math.max(0, G.by - (e - G.r)); r = 0; }
      var p = onBox(bx, by, r, B.u[i] + (i < B.half ? -split : split));
      B.x[i] = G.cx + p[0] + Math.sin(tt * .7 + B.h[i] * 20) * wob; B.y[i] = G.cy + p[1] + Math.cos(tt * .6 + B.h[i] * 13) * wob;
      B.r[i] = G.rb * B.sz[i] * shrink * br * (1 + .06 * Math.sin(tt * .9 + B.h[i] * 40));
    }
    // which balls can reach which tile of the screen
    if (!TL.start || TL.start.length !== nt + 1) TL.start = new Int32Array(nt + 1);
    var cnt = TL.start, list, reach, i0, i1, j0, j1, a, b;
    cnt.fill(0);
    function each(fn) {
      for (var q = 0; q < n; q++) {
        reach = B.r[q] + G.rb * .4 + L.cw * 7;
        i0 = Math.max(0, Math.floor((B.x[q] - reach) / TS)); i1 = Math.min(tc - 1, Math.floor((B.x[q] + reach) / TS));
        j0 = Math.max(0, Math.floor((B.y[q] - reach) / TS)); j1 = Math.min(tr - 1, Math.floor((B.y[q] + reach) / TS));
        for (b = j0; b <= j1; b++) for (a = i0; a <= i1; a++) fn(b * tc + a, q);
      }
    }
    each(function (k) { cnt[k + 1]++; });
    for (a = 0; a < nt; a++) cnt[a + 1] += cnt[a];
    if (!TL.list || TL.list.length < cnt[nt]) TL.list = new Int32Array(Math.max(cnt[nt], 256) * 2);
    list = TL.list; var fill = new Int32Array(nt);
    each(function (k, q) { list[cnt[k] + fill[k]++] = q; });
    TL.cols = tc; TL.rows = tr;
  }
  var LO = { d: 0, fold: 0 };
  function lumps(x, y) { // signed distance and crease of the body of balls at (x, y)
    var dO = rbox(x - G.cx, y - G.cy, G.bx, G.by, G.r), dc = G.t < 1e8 ? Math.max(dO, -dO - G.t) : dO, rb = G.rb;
    dc = Math.max(dc + rb * .6 * (1 - .5 * G.ring), -rb * .4);   // the core sits just under the balls (in the frame, nearly level with them) and is never deeper than half a lump
    var ti = Math.floor(x / TS), tj = Math.floor(y / TS), d1 = 1e4, d2 = 1e4, ds = 1e4, k = rb * .22;
    if (ti >= 0 && tj >= 0 && ti < TL.cols && tj < TL.rows) {
      var tk = tj * TL.cols + ti, s0 = TL.start[tk], s1 = TL.start[tk + 1], list = TL.list, half = B.half, i1 = -1;
      for (var q = s0; q < s1; q++) {
        var b = list[q], dx = x - B.x[b], dy = y - B.y[b], di = Math.sqrt(dx * dx + dy * dy) - B.r[b], id = b >= half ? b - half : b;
        if (di < d1) { if (id !== i1) d2 = d1; d1 = di; i1 = id; } else if (id !== i1 && di < d2) d2 = di;   // a crease only between two different balls
        ds = smin(ds, di, k);
      }
    }
    LO.d = smin(ds, dc, rb * .3);
    var gap = (d2 - d1) / (L.cw * 1.8);
    LO.fold = d1 < 0 && d2 < 0 ? Math.exp(-gap * gap) * clamp(-d2 / L.cw) : 0;
    return LO;
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
  // signed distance of the body at screen point (x, y), morph m, time t
  var OUT = { d: 0, fold: 0, dep: 0 };
  function body(x, y, m, t, beat) {
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
    var w = sm((m - .58) / .36), lf = 0, d = dU;
    if (w > 0) { var lo = lumps(x, y); d = lerp(dU, lo.d, w); lf = lo.fold; }   // it ends as the body of balls, not a clean sphere
    var amp = L.cw * (.3 + 1.7 * Math.pow(Math.sin(Math.PI * clamp(m * .95)), .8)) + L.cw * .35 * w;
    d += amp * fleshNoise(x, y, t) * (1 + .6 * Math.sin(Math.PI * m));
    d -= beat * L.cw * lerp(.95, 1.3, w);
    OUT.d = d;
    var dT0 = dT + fat; OUT.fold = (1 - w) * sm(m * 4) * Math.exp(-(dT0 * dT0) / (L.cw * L.cw * 2.2)) + w * lf;
    OUT.dep = lerp(L.cw * 3.6, G.rb, sm(m / .8));
    return OUT;
  }

  function frameBody(x, y, t, beat, f) { // the body on its way to the frame, and the frame
    var dO = rbox(x - G.cx, y - G.cy, G.bx, G.by, G.r), dc = G.t < 1e8 ? Math.max(dO, -dO - G.t) : dO;
    if (dc > G.rb * 2 + L.cw * 9) { OUT.d = 1e4; OUT.fold = 0; OUT.dep = G.rb; return OUT; }
    var lo = lumps(x, y);
    OUT.d = lo.d + L.cw * lerp(1, .6, f) * fleshNoise(x, y, t) - beat * L.cw * lerp(1.3, .8, f);
    OUT.fold = lo.fold; OUT.dep = G.rb; return OUT;
  }

  // ---------- physics: sprung scroll, sticky flesh ----------
  var PH = { ps: 0, pv: 0, D: [0, 0], Dv: [0, 0], C: [0, 0], att: false, last: null, t: 0 };
  function poke(x, y) { // pointer warp: the flesh around C is carried by D, falling off with a gaussian
    var s = L.R * .5, ex = x - PH.C[0], ey = y - PH.C[1], f = Math.exp(-(ex * ex + ey * ey) / (s * s));
    PK[0] = x - PH.D[0] * f; PK[1] = y - PH.D[1] * f; return PK;
  }
  var PK = [0, 0];
  function step(dt, raw, ptr, m, f) {
    var w = 2 * Math.PI * .85, z = .55, acc0 = -w * w * (PH.ps - raw) - 2 * z * w * PH.pv;
    PH.pv += acc0 * dt; PH.ps += PH.pv * dt;
    var lim = L.R * .5 * .95;
    if (ptr && PH.last) {
      var vx = (ptr.x - PH.last.x), vy = (ptr.y - PH.last.y);
      if (!PH.att && (vx || vy) && f < .05) {
        var p = poke(ptr.x, ptr.y), d = body(p[0], p[1], m, PH.t, 0).d;
        if (d < 0) { PH.att = true; PH.C = [ptr.x - PH.D[0], ptr.y - PH.D[1]]; PH.Dv = [0, 0]; }
      }
      if (PH.att) {
        PH.D[0] += vx; PH.D[1] += vy;
        if (Math.hypot(PH.D[0], PH.D[1]) > lim || f >= .05) { PH.att = false; PH.Dv = [vx / dt * .35, vy / dt * .35]; }   // it tears free and snaps back
      }
    } else if (PH.att) { PH.att = false; PH.Dv = [0, 0]; }
    if (!PH.att) { // slow, underdamped: byon
      var w2 = 2 * Math.PI * 1.05, z2 = .16;
      for (var q = 0; q < 2; q++) { var acc = -w2 * w2 * PH.D[q] - 2 * z2 * w2 * PH.Dv[q]; PH.Dv[q] += acc * dt; PH.D[q] += PH.Dv[q] * dt; }
    }
    PH.last = ptr ? { x: ptr.x, y: ptr.y } : null;
  }

  // ---------- scroll: the opening owns the first part of About's pinned stretch ----------
  var AFTER = 1.6;   // screens of About's pinned scroll after the opening
  function birthLen() { return Math.max(1, sun.offsetHeight - AFTER * L.H); }
  function rawProgress() { return clamp(-sun.getBoundingClientRect().top / birthLen()); }
  function pastBirth() { return clamp((-sun.getBoundingClientRect().top - birthLen()) / (L.H * .1)); }
  // phases on the sprung progress: knead → the body of balls (held a moment) → it spreads into the frame; About shows inside it
  var M0 = .03, M1 = .4, F0 = .5, F1 = .97, SET0 = .9, SET1 = .98;

  // ---------- frame ----------
  var HEART0 = 3.15;   // first heartbeat (s): the moment the name is whole
  function render(t, ps) {
    var cols = L.cols, rows = L.rows, cw = L.cw, ch = L.ch, D = L.D, Hh = L.Hh, FO = L.fold, code = L.code;
    var m = clamp((ps - M0) / (M1 - M0)), e = io(m);
    L.cx = lerp(L.tx, L.sx, e); L.cy = lerp(L.ty, L.sy, e);
    var hb = t - HEART0, still = reduce, beat = still ? 0 : press(hb), shp = hb >= 0 && !still ? sharp(hb) : 0;
    var tt = still ? 0 : t, f = clamp((ps - F0) / (F1 - F0));
    L.Hv = innerHeight || L.H;
    shp *= 1 - sm(f / .25);   // the pulse lines belong to the body; the frame only swells with the beat
    if (f > 0) { frameGeo(f); placeBalls(tt, beat); } else if (m > .5) { lumpBody(L.cx, L.cy); placeBalls(tt, beat); }
    var inBirth = t < BIRTH.toText1, wT = sm((t - BIRTH.toText0) / (BIRTH.toText1 - BIRTH.toText0));
    if (inBirth) birthField(t);
    if (m > 0 && (!INV || INV.m !== m)) morphTables(m);
    // rows that can hold flesh, air or a thorn this frame (the rest stay empty)
    var j0 = 0, j1 = rows;
    if (!inBirth && f <= 0) {
      var reach = Math.max(L.T.halfH + L.T.fs * .25, m > 0 ? L.R * 1.25 : 0) + cw * 16 + Math.hypot(PH.D[0], PH.D[1]);
      j0 = Math.max(0, Math.floor((Math.min(L.ty, L.cy) - reach) / ch)); j1 = Math.min(rows, Math.ceil((Math.max(L.ty, L.cy) + reach) / ch));
    }
    D.fill(1e4); code.fill(0);
    var j, i, k, dep = L.cw * 3.6;
    for (j = j0; j < j1; j++) for (i = 0; i < cols; i++) {
      k = j * cols + i; var x = (i + .5) * cw, y = (j + .5) * ch, p = poke(x, y), d, fold = 0;
      if (inBirth) {
        var F = L.F[k], gl = Math.hypot(L.FX[k], L.FY[k]), dm = F <= 0 ? 400 : clamp((.32 - F) / Math.max(gl, 1e-4), -60, 400);
        if (wT > 0) { var o = body(p[0], p[1], 0, t, 0); d = lerp(dm, o.d, wT); } else d = dm;
      } else { var o2 = f > 0 ? frameBody(x, y, tt, beat, f) : body(p[0], p[1], m, tt, beat); d = o2.d; fold = o2.fold; dep = o2.dep; }
      D[k] = d; FO[k] = fold;
      Hh[k] = FL.height(d, dep);
    }
    if (shp > .02) pulseLines(hb, shp, j0, j1, dep);
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
    paint();
  }
  // the pulse: on each beat a few points of the outline push the flesh out into short, thin spikes (the SUN's thorn profile),
  // which sink back within the beat. They grow out of the body (a smooth union), so the outline never opens.
  function pulseLines(hb, shp, j0, j1, dep) {
    var cols = L.cols, rows = L.rows, cw = L.cw, ch = L.ch, D = L.D, Hh = L.Hh, bi = Math.floor(hb), cand = [], j, i, k;
    for (j = Math.max(1, j0); j < Math.min(rows - 1, j1); j++) for (i = 1; i < cols - 1; i++) {
      k = j * cols + i; var v = D[k]; if (v <= 0 && v > -cw * 1.2 && (D[k - 1] > 0 || D[k + 1] > 0 || D[k - cols] > 0 || D[k + cols] > 0)) cand.push(k);
    }
    var want = (L.mobile ? 4 : 7) / Math.max(1, cand.length), wb = cw * (L.mobile ? 1.15 : 1.05), sk = cw * .7;
    for (var q = 0; q < cand.length; q++) {
      k = cand[q]; if (hash(k * .013, bi * 7.7 + 1) >= want) continue;
      i = k % cols; j = (k / cols) | 0;
      var gx = (D[k + 1] - D[k - 1]) / (2 * cw), gy = (D[k + cols] - D[k - cols]) / (2 * ch), gl = Math.hypot(gx, gy) || 1, nx = gx / gl, ny = gy / gl;
      var Ls = cw * (2 + 2.4 * hash(k, bi)) * (L.mobile ? .85 : 1) * shp * (1 + .07 * Math.sin(hb * 11 + q * 2.3));
      if (Ls < cw * .6) continue;
      var bx = (i + .5) * cw - nx * cw * .5, by = (j + .5) * ch - ny * ch * .5, slope = Math.sqrt(1 + Math.pow(wb * 1.35 / Ls, 2)), ext = Ls + wb + cw;
      var i0 = Math.max(0, Math.floor((bx - ext) / cw)), i1 = Math.min(cols - 1, Math.ceil((bx + ext) / cw)), jj0 = Math.max(0, Math.floor((by - ext) / ch)), jj1 = Math.min(rows - 1, Math.ceil((by + ext) / ch));
      for (var jj = jj0; jj <= jj1; jj++) for (var ii = i0; ii <= i1; ii++) {
        var qx = (ii + .5) * cw - bx, qy = (jj + .5) * ch - by, a = qx * nx + qy * ny, c = Math.abs(qx * ny - qy * nx), dS;
        if (a > Ls) dS = Math.hypot(a - Ls, c); else dS = (c - wb * Math.pow(1 - Math.max(0, a) / Ls, 1.35)) / slope;
        var kk = jj * cols + ii, d0 = D[kk], h = Math.max(sk - Math.abs(d0 - dS), 0) / sk, d1 = Math.min(d0, dS) - h * h * sk * .25;
        if (d1 < d0) { D[kk] = d1; Hh[kk] = FL.height(d1, dep); }
      }
    }
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

  // ---------- drivers ----------
  var ptr = null, last = -1, t0 = 0, running = false;
  function advance(t, raw, m, f) { // fixed substeps → the same motion whatever the frame rate
    if (last < 0) last = t;
    var span = Math.min(.1, t - last), n = Math.max(1, Math.ceil(span / (1 / 120))), dt = span / n;
    if (m > 0 && (!INV || INV.m !== m)) morphTables(m);
    if (m > .5 && f <= 0) { lumpBody(lerp(L.tx, L.sx, io(m)), lerp(L.ty, L.sy, io(m))); placeBalls(t, 0); }
    for (var q = 0; q < n; q++) { PH.t = last + dt * (q + 1); step(dt || 1 / 120, raw, ptr, m, f); }
    last = t;
  }
  function frame(now) {
    var t = (now - t0) / 1000, raw = rawProgress(), past = pastBirth();
    var m0 = clamp((PH.ps - M0) / (M1 - M0)), f0 = clamp((PH.ps - F0) / (F1 - F0));
    advance(t, raw, m0, f0);
    if (past > 0 && PH.ps < 1) { PH.ps = Math.max(PH.ps, lerp(PH.ps, 1, past)); }   // already into About: the opening must not trail behind
    var ps = clamp(PH.ps, 0, 1);
    STATE.x = Math.max(sm((ps - SET0) / (SET1 - SET0)), past);
    render(t, ps);   // the body is always alive (its heart beats), so it draws every frame while the page is shown
    if (document.hidden) { running = false; last = -1; return; }
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
    PH.ps = rawProgress();
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
  // both faces must be in before the letterforms and the glyph atlas are measured
  var fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load("800 100px \"Baloo 2\""), document.fonts.load("600 16px " + MONO)]) : Promise.resolve();
  var begun = false;
  function go() { if (begun) return; begun = true; try { start(); } catch (e) { off(); } }
  fonts.then(function () { A.ready(go); }, function () { A.ready(go); });
  setTimeout(function () { if (!begun) A.ready(go); }, 2500);
})();
