/* Shared character-rendering helpers. One glyph atlas per cell size; frames only blit tiles. */
window.ASCII = (function () {
  var FAMILY = '"JetBrains Mono", ui-monospace, monospace';
  var ADV = null; // advance width per 1px of font size
  function adv() {
    if (ADV) return ADV;
    var g = document.createElement("canvas").getContext("2d"); g.font = "400 100px " + FAMILY;
    return (ADV = g.measureText("M").width / 100 || .6);
  }
  // atlas for a given cell (cw × ch css px): rows = colours, cols = chars
  function atlas(chars, colors, cw, ch, weight, dpr) {
    var px = cw / adv(), tw = Math.max(1, Math.round(cw * dpr)), th = Math.max(1, Math.round(ch * dpr));
    var c = document.createElement("canvas"); c.width = tw * chars.length; c.height = th * colors.length;
    var g = c.getContext("2d"); g.font = (weight || 400) + " " + (px * dpr) + "px " + FAMILY; g.textAlign = "center"; g.textBaseline = "middle";
    for (var r = 0; r < colors.length; r++) { g.fillStyle = colors[r]; for (var i = 0; i < chars.length; i++) g.fillText(chars[i], i * tw + tw / 2, r * th + th / 2 + dpr * .5); }
    return { canvas: c, tw: tw, th: th, cw: cw, ch: ch, n: chars.length };
  }
  function hex(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function ramp(stops, n) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var t = n === 1 ? 0 : k / (n - 1), a = stops[0], b = stops[stops.length - 1];
      for (var s = 0; s < stops.length - 1; s++) if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
      var u = (t - a[0]) / ((b[0] - a[0]) || 1), A = hex(a[1]), B = hex(b[1]);
      out.push("rgb(" + Math.round(A[0] + (B[0] - A[0]) * u) + "," + Math.round(A[1] + (B[1] - A[1]) * u) + "," + Math.round(A[2] + (B[2] - A[2]) * u) + ")");
    }
    return out;
  }
  function ready(cb) {
    var done = false; function go() { if (!done) { done = true; ADV = null; cb(); } }
    // every face the layout measures (mono cells, the Inter Tight bio that bounds the SUN) must be in before the first fit
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load("400 13px " + FAMILY), document.fonts.load("600 13px " + FAMILY),
      document.fonts.load('400 16px "Inter Tight"'), document.fonts.load('500 16px "Inter Tight"')]).then(function () { return document.fonts.ready; }).then(go, go);
    setTimeout(go, 1500); if (!document.fonts) go();
  }
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  return { atlas: atlas, ramp: ramp, ready: ready, hash: hash, clamp: clamp, smooth: smooth, FAMILY: FAMILY };
})();
