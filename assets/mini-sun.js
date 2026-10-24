/* A small SUN drawn in characters (same glyph ramp and five tones as the home page), for the 404 page.
   Fills every <pre class="mini-sun" data-rows="N">; the light drifts slowly unless reduced motion is set. */
(function () {
  var CHARS = " .·:-=+*sun%#@", LV = CHARS.length;
  // the home page's five tones, capped at the light pink (never white)
  var TONES = ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"], TT = TONES.length - 1, HOT = 1.05, HOT_BEAT = .92;   // light needed for the top tone at rest / on the beat (as on the home page)
  // one world clock: 60 BPM; the light drifts over 27 and 37 beats like the main SUN; redrawn eight times a beat
  var BEAT = 1000, TAU = Math.PI * 2, STEP = BEAT / 8;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var suns = Array.prototype.slice.call(document.querySelectorAll("pre.mini-sun"));
  function tone(lvl, b, up) { // from the level every frame (never accumulated); the beat lifts by one; only the core of the highlight reaches the top
    var f = lvl / (LV - 1), tn = f < .2 ? 0 : f < .42 ? 1 : f < .64 ? 2 : f < .96 ? 3 : 4, ok = b >= (up ? HOT_BEAT : HOT);
    if (tn === TT && !ok) tn = TT - 1;
    if (up && tn < TT) { tn++; if (tn === TT && (f < .8 || !ok)) tn = TT - 1; }
    return tn;
  }
  function draw(el, t) {
    var rows = +el.dataset.rows || 11, cols = Math.round(rows * 14 / 4.8) | 1, cx = (cols - 1) / 2, cy = (rows - 1) / 2;
    var az = -.75 + Math.sin(t * TAU / (27 * BEAT)) * .35, elv = .35 + Math.sin(t * TAU / (37 * BEAT) + 1) * .1;
    var L0 = Math.sin(az) * Math.cos(elv), L1 = -Math.sin(elv), L2 = Math.cos(az) * Math.cos(elv), html = "";
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var nx = (i - cx) / (cx + .5), ny = (j - cy) / (cy + .5), r2 = nx * nx + ny * ny;
        if (r2 > 1) { html += " "; continue; }
        var nz = Math.sqrt(1 - r2), d = Math.max(0, nx * L0 + ny * L1 + nz * L2), lon = Math.atan2(nx, nz);
        var tex = .5 + .3 * Math.sin(ny * 11 + Math.sin(lon * 2 + ny * 3) * 1.2) + .2 * Math.sin(lon * 9) * Math.sin(ny * 17 + lon * 2);
        var b = .06 + d * (.7 + .38 * tex) + .05 * tex, lvl = Math.max(1, Math.min(LV - 1, Math.round(b * (LV - 1))));
        html += '<span style="color:' + TONES[tone(lvl, b, false)] + '">' + CHARS[lvl] + "</span>";
      }
      html += "\n";
    }
    el.innerHTML = html;
  }
  function frame() {
    var t = performance.now(); suns.forEach(function (el) { draw(el, t); });
    if (!reduce) setTimeout(function () { requestAnimationFrame(frame); }, STEP - (performance.now() % STEP));   // stay on the beat grid
  }
  if (suns.length) { if (reduce) suns.forEach(function (el) { draw(el, 0); }); else frame(); }
})();
