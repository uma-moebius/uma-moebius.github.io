/* A small SUN drawn in characters (same glyph ramp and pinks as the home page), for the 404 and thank-you pages.
   Fills every <pre class="mini-sun" data-rows="N">; the light drifts slowly unless reduced motion is set. */
(function () {
  var CHARS = " .·:-=+*sun%#@", LV = CHARS.length;
  var STOPS = [[0, [42, 18, 32]], [.28, [110, 29, 67]], [.6, [255, 92, 154]], [.84, [255, 156, 194]], [1, [255, 227, 238]]];
  function color(t) {
    for (var s = 0; s < STOPS.length - 1; s++) if (t <= STOPS[s + 1][0]) {
      var a = STOPS[s], b = STOPS[s + 1], u = (t - a[0]) / (b[0] - a[0]);
      return "rgb(" + [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * u); }).join(",") + ")";
    }
    return "rgb(255,227,238)";
  }
  var COLORS = []; for (var k = 0; k < LV; k++) COLORS.push(color(k / (LV - 1)));
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var suns = Array.prototype.slice.call(document.querySelectorAll("pre.mini-sun"));
  function draw(el, t) {
    var rows = +el.dataset.rows || 11, cols = Math.round(rows * 14 / 4.8) | 1, cx = (cols - 1) / 2, cy = (rows - 1) / 2;
    var az = -.75 + Math.sin(t * .0004) * .35, elv = .35 + Math.sin(t * .0003 + 1) * .1;
    var L0 = Math.sin(az) * Math.cos(elv), L1 = -Math.sin(elv), L2 = Math.cos(az) * Math.cos(elv), html = "";
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var nx = (i - cx) / (cx + .5), ny = (j - cy) / (cy + .5), r2 = nx * nx + ny * ny;
        if (r2 > 1) { html += " "; continue; }
        var nz = Math.sqrt(1 - r2), d = Math.max(0, nx * L0 + ny * L1 + nz * L2), lon = Math.atan2(nx, nz);
        var tex = .5 + .3 * Math.sin(ny * 11 + Math.sin(lon * 2 + ny * 3) * 1.2) + .2 * Math.sin(lon * 9) * Math.sin(ny * 17 + lon * 2);
        var b = .06 + d * (.7 + .38 * tex) + .05 * tex, lvl = Math.max(1, Math.min(LV - 1, Math.round(b * (LV - 1))));
        html += '<span style="color:' + COLORS[lvl] + '">' + CHARS[lvl] + "</span>";
      }
      html += "\n";
    }
    el.innerHTML = html;
  }
  function frame(t) { suns.forEach(function (el) { draw(el, t); }); if (!reduce) setTimeout(function () { requestAnimationFrame(frame); }, 120); }
  if (suns.length) frame(0);
})();
