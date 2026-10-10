/* One character field — ASCII SUN (still at rest, light drifts). */
(function () {
  var A = window.ASCII;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- scene ----------
  var scene = document.querySelector(".scene"); if (!scene) return;
  var bg = scene.querySelector(".scene__bg"), cv = scene.querySelector(".scene__canvas"), g = cv.getContext("2d");
  var sun = scene.querySelector(".sunsec"), pin = sun.querySelector(".sunsec__pin");
  var label = pin.querySelector(".sunsec__label"), bio = pin.querySelector(".sunsec__bio"), links = pin.querySelector(".sunsec__links"), readout = pin.querySelector(".sunsec__readout");
  var ringEl = bg.querySelector(".scene__ring");
  var CHARS = " .·:-=+*sun%#@", LV = CHARS.length, WILD = "SUN01/#:<>*", GLYPHS = CHARS + WILD;
  var COLORS = A.ramp([[0, "#2a1220"], [.28, "#6e1d43"], [.6, "#ff5c9a"], [.84, "#ff9cc2"], [1, "#ffe3ee"]], LV);

  for (var k = 0; k < 16; k++) for (var c = 0; c < 3; c++) {
    var sp = document.createElement("span"); sp.className = "scene__glyph"; sp.textContent = "SUN"[c];
    sp.style.setProperty("--a", (k * 22.5 + c * 4.4) + "deg"); ringEl.appendChild(sp);
  }

  var W = 0, H = 0, dpr = 1, BASE = 8, ATS = null, R0 = 300, fcx = 0, fcy = 0, small = false;
  function build() {
    dpr = Math.min(2, devicePixelRatio || 1);
    var r = bg.getBoundingClientRect(); W = r.width; H = r.height; small = W < 769;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    BASE = small ? 6 : 8;
    ATS = A.atlas(GLYPHS, COLORS, BASE, BASE * 1.75, 600, dpr);          // rest: dense ball (line = 1.75 × cell width)
    fit();
  }
  // the sphere (+ ring) lives in the free area between the text blocks → never overlaps bio / links / readout
  function fit() {
    var p = pin.getBoundingClientRect();
    function rr(el) { var b = el.getBoundingClientRect(); return { l: b.left - p.left, r: b.right - p.left, t: b.top - p.top, b: b.bottom - p.top }; }
    var la = rr(label), bi = rr(bio), li = rr(links), ro = rr(readout), x0, x1, y0, y1;
    // readout + label sit at the top; bio / links in the bottom corners (desktop) or under the label (mobile)
    if (!small) { x0 = bi.r + 24; x1 = li.l - 24; y0 = ro.b + 16; y1 = H - 24; }
    else { x0 = 8; x1 = W - 8; y0 = ro.b + 16; y1 = H - 16; }
    var rfs = Math.max(11, Math.min(18, (Math.min(x1 - x0, y1 - y0) / 2) * .045));
    R0 = (Math.min(x1 - x0, y1 - y0) / 2 - rfs) / 1.12; fcx = (x0 + x1) / 2; fcy = (y0 + y1) / 2;
    ringEl.style.setProperty("--rfs", rfs + "px");
  }
  function prog(el) { var r = el.getBoundingClientRect(), span = r.height - H; return span > 0 ? A.clamp(-r.top / span) : 1; }

  var rot = 0, ringRot = 0, lastRead = "";
  var SUN_END = .9;
  function frameState(t) {
    var pa = reduce ? .3 : prog(sun);
    var rise = A.smooth(pa / .16), nk = A.clamp(pa / SUN_END);
    var drift = reduce ? 0 : t;
    var az = (-62 + 62 * nk) * Math.PI / 180 + Math.sin(drift * .00023) * .22, el = .1 + .42 * nk + Math.sin(drift * .00017 + 1) * .08;
    var L = [Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)], n = Math.hypot(L[0], L[1], L[2]);
    return {
      pa: pa, nk: nk, R: R0, cx: fcx, cy: fcy + (1 - rise) * H * .62,
      L: [L[0] / n, L[1] / n, L[2] / n]
    };
  }

  // sphere shading of the SUN
  function shade(nx, ny, r2, L0, L1, L2, lon) {
    var nz = Math.sqrt(1 - r2), d = nx * L0 + ny * L1 + nz * L2; if (d < 0) d = 0;
    var tex = .5 + .3 * Math.sin(ny * 11 + Math.sin(lon * 2 + ny * 3) * 1.2) + .2 * Math.sin(lon * 9) * Math.sin(ny * 17 + lon * 2);
    return .06 + d * (.7 + .38 * tex) + .05 * tex;
  }

  function drawField(t, st) {
    var cw = BASE, ch = BASE * 1.75, AT = ATS, dw = AT.tw, dh = AT.th;
    var R = st.R, cx = st.cx, cy = st.cy, L0 = st.L[0], L1 = st.L[1], L2 = st.L[2], top = LV - 1, tw = AT.tw, th = AT.th, atlas = AT.canvas;
    var ext = R * 1.16, ox = W / 2, oy = H / 2;
    var i0 = Math.floor((Math.max(0, cx - ext) - ox) / cw) - 1, i1 = Math.ceil((Math.min(W, cx + ext) - ox) / cw) + 1;
    var j0 = Math.floor((Math.max(0, cy - ext) - oy) / ch) - 1, j1 = Math.ceil((Math.min(H, cy + ext) - oy) / ch) + 1;
    var slow = Math.floor(t / 140);
    for (var j = j0; j < j1; j++) {
      var y = oy + (j + .5) * ch, ny = (y - cy) / R, py = Math.round((oy + j * ch) * dpr);
      if (py > cv.height || py + dh < 0) continue;
      for (var i = i0; i < i1; i++) {
        var x = ox + (i + .5) * cw, nx = (x - cx) / R, r2 = nx * nx + ny * ny, lvl;
        if (r2 <= 1) {
          var lon = Math.atan2(nx, Math.sqrt(1 - r2)) + rot, b = shade(nx, ny, r2, L0, L1, L2, lon);
          lvl = Math.round((b > 1 ? 1 : b < 0 ? 0 : b) * top);
        } else if (r2 < 1.32) {
          var f = (1.15 - Math.sqrt(r2)) / .15; if (f <= 0) continue;
          var hc = A.hash(i * 1.3 + j * 7.7, slow); if (hc > f * .5) continue;
          lvl = hc < f * .12 ? 2 : 1;
        } else continue;
        if (lvl <= 0) continue;
        g.drawImage(atlas, lvl * tw, lvl * th, tw, th, Math.round((ox + i * cw) * dpr), py, dw, dh);
      }
    }
  }

  function drawUI(t, st) {
    ringEl.style.setProperty("--rx", st.cx + "px"); ringEl.style.setProperty("--ry", st.cy + "px");
    ringEl.style.setProperty("--rr", (st.R * 1.12) + "px");
    ringEl.style.setProperty("--rot", ringRot.toFixed(2) + "deg");
    var mins = Math.round((6 + st.nk * 6) * 60), hh = String(Math.floor(mins / 60)).padStart(2, "0"), mm = String(mins % 60).padStart(2, "0");
    var txt = hh + ":" + mm + " · ALT " + String(Math.round(st.nk * 62)).padStart(2, "0") + "° · AZ " + String(Math.round(90 + st.nk * 90)).padStart(3, "0") + "°";
    if (txt !== lastRead) { readout.textContent = txt; lastRead = txt; }
  }

  // ---------- loop: only while the scene is on screen ----------
  var running = false, visible = false, ready = false;
  function render(t) {
    var st = frameState(t);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    drawField(t, st);
    drawUI(t, st);
  }
  function frame(t) {
    if (visible) render(t);
    if (visible && !document.hidden) requestAnimationFrame(frame); else running = false;
  }
  function wake() { if (ready && !running && !reduce && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  A.ready(function () {
    build(); ready = true;
    if (reduce) {
      render(0);
      return;
    }
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; wake(); }).observe(scene);
    document.addEventListener("visibilitychange", wake);
    wake();
  });
  // a face that arrives late changes text boxes → refit so the SUN never overlaps the corner text
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", function () { if (ready) { fit(); if (reduce) render(0); } });
  var rz; addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(function () { if (!ready) return; build(); if (reduce) render(0); else wake(); }, 120); });
})();
