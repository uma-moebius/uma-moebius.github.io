/* The creature's flesh: one material for everything that is me. The name kneaded by the opening and the SUN after it are
   drawn by this same code (glyph set, light, shading, tones), so the body never turns into another drawing on the way.
   Callers fill a per-cell signed distance field (D, px, negative = flesh), a height field (Hh) and a fold field (FO),
   then ask for one code per cell: glyph index * 8 + tone (0 = empty). */
window.FLESH = (function () {
  "use strict";
  var A = window.ASCII;
  var RAMP = " .\u00b7:+*sun%#@", EDGE = "_-\u00af/|\\", AIR = ".\u00b7:,'`", THORN = "/\\|-<>^v";
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function inkOrder(chars) {
    var v = A.ink(chars, 600), idx = []; for (var i = 0; i < chars.length; i++) idx.push(i);
    idx.sort(function (a, b) { return v[a] - v[b] || a - b; }); return idx.map(function (i) { return chars[i]; }).join("");
  }
  // the glyph table, measured after the faces are in (extra characters may follow it; they never move the shared ones)
  function glyphs() {
    var interior = inkOrder(RAMP.slice(1));
    return { chars: " " + interior + EDGE + AIR + THORN,
      gi: { ramp: 1, nramp: interior.length, edge: 1 + interior.length, air: 1 + interior.length + EDGE.length, thorn: 1 + interior.length + EDGE.length + AIR.length } };
  }
  var LIGHT = (function () { var l = [-.55, -.7, .6], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
  var HALF = (function () { var h = [LIGHT[0], LIGHT[1], LIGHT[2] + 1], n = Math.hypot(h[0], h[1], h[2]); return [h[0] / n, h[1] / n, h[2] / n]; })();
  // height of the flesh above the page at signed distance d (px) for a body `dep` px deep
  function height(d, dep) { var xx = clamp(-d / dep); return Math.sqrt(1 - (1 - xx) * (1 - xx)) * dep; }
  // a flesh cell (D[k] <= 0): its outline stroke, or its interior character, lit from the upper left with a warm rim from below
  function cell(D, Hh, FO, k, i, j, cols, rows, cw, ch, tt, lift, gi) {
    var dd = D[k];
    var il = i > 0 ? k - 1 : k, ir = i < cols - 1 ? k + 1 : k, ju = j > 0 ? k - cols : k, jd = j < rows - 1 ? k + cols : k;
    var gx = (D[ir] - D[il]) / ((ir - il) * cw || 1), gy = (D[jd] - D[ju]) / (((jd - ju) / cols) * ch || 1), gn = Math.sqrt(gx * gx + gy * gy) || 1;
    var nx = gx / gn, ny = gy / gn, ext = .5 * (Math.abs(nx) * cw + Math.abs(ny) * ch);
    var hx = (Hh[ir] - Hh[il]) / ((ir - il) * cw || 1), hy = (Hh[jd] - Hh[ju]) / (((jd - ju) / cols) * ch || 1);
    var n0 = -hx, n1 = -hy, n2 = 1, nl = Math.sqrt(n0 * n0 + n1 * n1 + 1); n0 /= nl; n1 /= nl; n2 /= nl;
    var dif = Math.max(0, n0 * LIGHT[0] + n1 * LIGHT[1] + n2 * LIGHT[2]), sp = Math.max(0, n0 * HALF[0] + n1 * HALF[1] + n2 * HALF[2]), s2 = sp * sp, s16 = s2 * s2 * s2 * s2 * s2 * s2 * s2 * s2, spec = s16 * s2;
    var tex = .5 + .5 * Math.sin((i * cw) * .045 + Math.sin((j * ch) * .03 + tt * .4) * 2.2) * Math.sin((j * ch) * .05 - tt * .3);
    var rim = Math.max(0, n0 * .62 + n1 * .55 + n2 * .2) * (1 - n2) * 1.4;   // warm light from below-right: the underside stays flesh, not void
    var b = .16 + .66 * dif + .42 * spec + .1 * tex + .3 * rim + lift - .4 * FO[k];
    if (dd > -ext * 1.05) { // the outline: a stroke along it
      var an = Math.atan2(-nx, ny) * 57.2958; if (an < 0) an += 180; if (an >= 180) an -= 180;
      var oyc = clamp(dd / (ny || 1e-3) / ch, -1, 1), eg;
      if (an < 28 || an >= 152) eg = oyc < -.2 ? 0 : oyc > .2 ? 2 : 1; else if (an >= 68 && an < 112) eg = 4; else eg = an < 90 ? 5 : 3;
      return (gi.edge + eg) * 8 + (b > .62 ? 3 : b > .34 ? 2 : 1);
    }
    var lv = clamp(b * .92 + .08), gidx = gi.ramp + Math.min(gi.nramp - 1, Math.max(2, Math.round(lv * (gi.nramp - 1))));
    var tn2 = spec > .78 || b > 1.06 ? 4 : b > .6 ? 3 : b > .33 ? 2 : 1;
    if (FO[k] > .45) tn2 = Math.max(0, tn2 - 2);
    return gidx * 8 + tn2;
  }
  // just off the flesh (0 < dd): a sparse dust of air characters that drifts three steps a second
  function air(dd, i, j, cw, beat, wide, flow, gi) {
    var band = cw * (2.6 + beat * 3.2 + wide);
    if (dd < band) {
      var hh = A.hash(i * 1.31 + flow * .17, j * 2.7 - flow * .11);
      if (hh < .16 * (1 - dd / band) + beat * .1) return (gi.air + ((hh * 37) | 0) % 6) * 8 + (dd < band * .4 && beat > .4 ? 1 : 0);
    }
    return 0;
  }
  function fleshNoise(x, y, t) {
    return Math.sin(x * .0105 + t * 1.25 + Math.sin(y * .016 - t * .8) * 1.8) * Math.sin(y * .0125 - t * 1.05 + Math.sin(x * .0085 + t * .6) * 1.6)
         + .45 * Math.sin(x * .023 - y * .019 + t * 1.9 + Math.sin(x * .004 + t) * 2);
  }
  // the cell size: the same grid (origin at the screen's top left) for the opening and the SUN
  function cellW(W) { return W < 600 ? 4 : 7; }
  return { TONES: ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"], glyphs: glyphs, height: height, cell: cell, air: air, noise: fleshNoise, cellW: cellW, LIGHT: LIGHT };
})();
