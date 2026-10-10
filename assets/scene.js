/* One character field — ASCII SUN (still at rest, light drifts) → the SUN opens a mouth and
   swallows the camera → the dark thins into dots. Input velocity drives rotation + glitch. */
(function () {
  var A = window.ASCII;
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  var root = document.documentElement;
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
  var sun = scene.querySelector(".sunsec"), pin = sun.querySelector(".sunsec__pin");
  var label = pin.querySelector(".sunsec__label"), bio = pin.querySelector(".sunsec__bio"), links = pin.querySelector(".sunsec__links"), readout = pin.querySelector(".sunsec__readout");
  var ringEl = bg.querySelector(".scene__ring");
  var CHARS = " .·:-=+*sun%#@", LV = CHARS.length, WILD = "SUN01/#:<>*", GLYPHS = CHARS + WILD;
  var COLORS = A.ramp([[0, "#2a1220"], [.28, "#6e1d43"], [.6, "#ff5c9a"], [.84, "#ff9cc2"], [1, "#ffe3ee"]], LV);

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
    if (!small) { x0 = bi.r + 24; x1 = li.l - 24; y0 = ro.b + 16; y1 = H - 24; }
    else { x0 = 8; x1 = W - 8; y0 = ro.b + 16; y1 = H - 16; }
    var rfs = Math.max(11, Math.min(18, (Math.min(x1 - x0, y1 - y0) / 2) * .045));
    R0 = (Math.min(x1 - x0, y1 - y0) / 2 - rfs) / 1.12; fcx = (x0 + x1) / 2; fcy = (y0 + y1) / 2;
    ringEl.style.setProperty("--rfs", rfs + "px");
  }
  function prog(el) { var r = el.getBoundingClientRect(), span = r.height - H; return span > 0 ? A.clamp(-r.top / span) : 1; }

  var rot = 0, ringRot = 0, lastRead = "";
  var SUN_END = .36, DIVE_END = .8;
  function frameState(t) {
    var pa = reduce ? .3 : prog(sun);
    var rise = A.smooth(pa / .16), nk = A.clamp(pa / SUN_END), k = reduce ? 0 : A.smooth((pa - SUN_END) / (DIVE_END - SUN_END));
    var thin = A.clamp((pa - DIVE_END) / (1 - DIVE_END)) * .9;
    var drift = reduce ? 0 : t;
    var az = (-62 + 62 * nk) * Math.PI / 180 + Math.sin(drift * .00023) * .22, el = .1 + .42 * nk + Math.sin(drift * .00017 + 1) * .08;
    var Ls = [Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)], Ld = [-.25, -.32, .91];
    var L = [Ls[0] + (Ld[0] - Ls[0]) * k, Ls[1] + (Ld[1] - Ls[1]) * k, Ls[2] + (Ld[2] - Ls[2]) * k], n = Math.hypot(L[0], L[1], L[2]);
    var halfDiag = Math.hypot(W, H) / 2, Rfill = halfDiag * 3.2;
    // mouth: a thin crooked slit appears as the dive starts, opens wide, and its centre drifts onto the camera axis
    var mo = reduce ? 0 : A.smooth((k - .1) / .85);
    return {
      pa: pa, k: k, thin: thin, nk: nk,
      z: Math.pow(3, 1 - (1 - k) * (1 - k)), R: R0 * Math.pow(Rfill / R0, k), // geometric zoom; cells grow a little ahead of it (fewer blits mid-dive)
      cx: fcx + (W / 2 - fcx) * k, cy: (fcy + (1 - rise) * H * .62) + (H / 2 - (fcy + (1 - rise) * H * .62)) * k,
      L: [L[0] / n, L[1] / n, L[2] / n],
      mo: mo, ma: .1 + .52 * Math.pow(mo, 1.4), mb: .003 + .62 * Math.pow(mo, 3.2), my: .2 * (1 - A.smooth(k / .92)), lip: .012 + .022 * mo
    };
  }

  // sphere shading of the SUN
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
  function drawField(t, st) {
    var E = (st.pa >= 1 || st.k > 0) ? 0 : energy, cw = BASE * st.z, ch = BASE * 1.75 * st.z;
    var dw = Math.max(1, Math.round(cw * dpr)), AT = st.z > 1.001 ? zoomAtlas(dw) : ATS, dh = AT.th;
    var R = st.R, cx = st.cx, cy = st.cy, L0 = st.L[0], L1 = st.L[1], L2 = st.L[2], top = LV - 1, tw = AT.tw, th = AT.th, atlas = AT.canvas;
    var ext = R * 1.16, ox = W / 2, oy = H / 2;
    var i0 = Math.floor((Math.max(0, cx - ext) - ox) / cw) - 1, i1 = Math.ceil((Math.min(W, cx + ext) - ox) / cw) + 1;
    var j0 = Math.floor((Math.max(0, cy - ext) - oy) / ch) - 1, j1 = Math.ceil((Math.min(H, cy + ext) - oy) / ch) + 1;
    var tick = Math.floor(t / 45), slow = Math.floor(t / 140), glitch = E > .02, dk = st.k, phase = st.k * 7 + rot * 2.5, thin = st.thin;
    var mouth = st.mo > 0, ma = st.ma, mb = st.mb, my = st.my, lip = st.lip, breath = t * .0011, mslow = Math.floor(t / 240);
    for (var j = j0; j < j1; j++) {
      var y = oy + (j + .5) * ch, ny = (y - cy) / R, off = 0, hot = false, py = Math.round((oy + j * ch) * dpr);
      if (py > cv.height || py + dh < 0) continue;
      if (glitch) { var band = j >> 1, hb = A.hash(band, tick); if (hb < E * .55) { off = (A.hash(band * 3.1, tick + 7) - .5) * E * cw * 36; hot = hb < E * .16; } }
      for (var i = i0; i < i1; i++) {
        if (thin > 0 && A.hash(i, j + 500) < thin) continue;
        var x = ox + (i + .5) * cw, nx = (x - cx) / R, r2 = nx * nx + ny * ny, lvl;
        if (r2 <= 1) {
          var lon = Math.atan2(nx, Math.sqrt(1 - r2)) + rot;
          var b = shade(nx, ny, r2, L0, L1, L2, lon, dk, phase);
          if (mouth) {
            var ex = nx / ma;
            if (ex > -1.25 && ex < 1.25) {
              var ax = ex < 0 ? -ex : ex, open = ax < 1 ? Math.pow(1 - ax * ax, .7) : 0;
              // crooked, slowly breathing slit (asymmetric: no face, no teeth)
              var mid = my + mb * (.18 * Math.sin(ex * 2.3 + .7) + .05 * Math.sin(ex * 5.1 + breath * .6));
              var hgt = mb * open * (1 + .06 * Math.sin(breath + ex * 3.1) + .04 * Math.sin(breath * 1.7 - ex * 6.3));
              var dy = ny - mid; if (dy < 0) dy = -dy;
              if (dy < hgt) { // cavity: sparse, dark, deeper toward the middle
                var q = dy / hgt, depth = (1 - q * q) * open, hc2 = A.hash(i * 2.7 + j * 9.1, mslow);
                if (hc2 > .11 + .3 * (1 - depth) * (1 - depth)) continue;
                // glyph and tone are picked separately: tiny marks ('.', '·', ':') in deep plum → the dark reads as characters
                gi = depth > .6 ? 1 : depth > .3 ? 2 : 3; lvl = depth > .6 ? 5 : depth > .3 ? 6 : 8;
                g.drawImage(atlas, gi * tw, lvl * th, tw, th, Math.round((ox + i * cw + off) * dpr), py, dw, dh);
                continue;
              }
              var lw = lip * (.4 + .6 * open), e2 = dy - hgt;
              if (e2 < lw) b = .62 + .3 * (1 - e2 / lw) * (.6 + .4 * open);          // soft lip edge, brighter
              else if (e2 < lw * 3.2) b *= .45 + .55 * ((e2 - lw) / (lw * 2.2));   // the fold just outside the lip sinks into shade
            }
          }
          lvl = Math.round((b > 1 ? 1 : b < 0 ? 0 : b) * top);
        } else if (r2 < 1.32) {
          var f = (1.15 - Math.sqrt(r2)) / .15; if (f <= 0) continue;
          var hc = A.hash(i * 1.3 + j * 7.7, slow); if (hc > f * .5) continue;
          lvl = hc < f * .12 ? 2 : 1;
        } else continue;
        if (lvl <= 0) continue;
        var gi = lvl;
        if (glitch && A.hash(i + j * 131, tick) < E * .4) gi = LV + ((A.hash(i * 7 + j, tick + 3) * WILD.length) | 0);
        g.drawImage(atlas, gi * tw, (hot ? top : lvl) * th, tw, th, Math.round((ox + i * cw + off) * dpr), py, dw, dh);
      }
    }
  }

  function drawUI(t, st) {
    // corner text fades before the dive starts, so the growing sphere never covers it
    pin.style.setProperty("--fade", (1 - A.clamp((st.pa - (SUN_END - .02)) / .03)).toFixed(3));
    ringEl.style.setProperty("--rx", st.cx + "px"); ringEl.style.setProperty("--ry", st.cy + "px");
    ringEl.style.setProperty("--rr", (st.R * 1.12) + "px");
    ringEl.style.setProperty("--ro", st.thin >= 1 ? "0" : (1 - A.clamp(st.k * 2.2)).toFixed(3));
    ringEl.style.setProperty("--rot", ringRot.toFixed(2) + "deg");
    var mins = Math.round((6 + st.nk * 6) * 60), hh = String(Math.floor(mins / 60)).padStart(2, "0"), mm = String(mins % 60).padStart(2, "0");
    var txt = hh + ":" + mm + " · ALT " + String(Math.round(st.nk * 62)).padStart(2, "0") + "° · AZ " + String(Math.round(90 + st.nk * 90)).padStart(3, "0") + "°";
    if (energy > .2) txt = txt.replace(/[0-9]/g, function (m) { return Math.random() < energy * .6 ? "#%01"[(Math.random() * 4) | 0] : m; });
    if (txt !== lastRead) { readout.textContent = txt; lastRead = txt; }
  }

  var calm = true;
  function wild(t) {
    var E = energy, tick = Math.floor(t / 60);
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

  // ---------- loop: only while the scene is on screen (or something is settling) ----------
  var running = false, visible = false, lastT = 0, ready = false;
  function render(t) {
    var st = frameState(t);
    diving = st.k > 0 && st.pa < 1;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    if (st.thin < 1) drawField(t, st);
    drawUI(t, st);
  }
  function frame(t) {
    var dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;
    energy *= Math.pow(.9, dt / 16.7); if (energy < .01) energy = 0;
    // no idle spin: rotation only from input (pointer velocity + scroll)
    rot += energy * dt * .0035 + scrollAcc * .0009; ringRot += energy * dt * .25 + scrollAcc * .05; scrollAcc = 0;
    if (visible) render(t);
    wild(t);
    if ((visible || energy > 0 || !calm) && !document.hidden) requestAnimationFrame(frame); else { running = false; lastT = 0; }
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
