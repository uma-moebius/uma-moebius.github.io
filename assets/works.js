/* Works: a pinned full-screen scene, driven by window.SITE_WORKS (assets/works-data.js).
   Hover / focus = sparse large characters; confirm = density steps 24→16→10→6→4px → the sharp image.
   An empty list renders the empty state: the character field stays and one monospace line types in. */
(function () {
  var WORKS = (window.SITE_WORKS || []).slice();

  var A = window.ASCII;
  var list = document.getElementById("works-index"), stage = document.getElementById("works-stage"), empty = document.getElementById("works-empty");
  if (!list || !stage || !A) return;
  var pinEl = stage.parentElement;

  // ---- empty state: no works yet → index + stage stay out of the page, one line types in with the scene ----
  if (!WORKS.length) {
    list.hidden = true; stage.hidden = true;
    var typed = empty && empty.querySelector(".works__empty-type"), line = empty ? empty.dataset.line : "", shown = -1;
    if (empty) empty.hidden = false;
    window.WORKS_VIEW = { empty: true, busy: function () { return false; }, draw: function (g, d, gx, gy, pw) {
      var u = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : A.clamp(pw / .2);
      pinEl.style.setProperty("--in", u.toFixed(3)); pinEl.classList.toggle("is-live", u > .95);
      var n = Math.round(A.clamp((u - .35) / .6) * line.length);       // types in while the scene assembles
      if (n !== shown && typed) { shown = n; typed.textContent = line.slice(0, n); }
    } };
    return;
  }
  if (empty) empty.hidden = true;
  var img = stage.querySelector("img"), status = document.getElementById("works-status");
  var reduceQ = matchMedia("(prefers-reduced-motion: reduce)"), instant = function () { return reduceQ.matches; }, canHover = matchMedia("(hover: hover) and (pointer: fine)");
  var RAMP = " .:-=+*o%#@", SPARSE_RAMP = "  .:+*o#@@";
  var current = 0, previewing = -1, hoverIdx = -1, lastPointer = "mouse";
  var bitmaps = WORKS.map(function (w) { var im = new Image(); im.crossOrigin = "anonymous"; im.src = w.src; if (im.decode) im.decode().catch(function () {}); return im; });

  // ---- index (monospace rows: 01  Title ..... 2026) ----
  var rows = WORKS.map(function (w, n) {
    var li = document.createElement("li"), b = document.createElement("button");
    b.type = "button"; b.className = "works__row"; b.setAttribute("aria-controls", "works-stage");
    b.innerHTML = '<span class="works__mark" aria-hidden="true"></span><span class="works__no">' + String(n + 1).padStart(2, "0") +
      '</span><span class="works__title">' + w.title + '</span><span class="works__year">' + w.year + "</span>";
    li.appendChild(b); list.appendChild(li); return b;
  });
  function setTint(w) { document.body.style.setProperty("--tint", w.color); }
  function markRows() {
    rows.forEach(function (b, n) {
      if (n === current) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      b.classList.toggle("is-preview", n === previewing);
    });
    list.classList.toggle("is-previewing", previewing >= 0);
  }

  // ---- cell sizes: sparse → dense (desktop / mobile) ----
  function sizes() { return innerWidth < 769 ? [18, 12, 8, 5, 3] : [24, 16, 10, 6, 4]; }
  var RATIO = 1.75;

  // ---- layers: per (work, size) an offscreen canvas of the stage, transparent bg (frameless on the page) ----
  var S = 0, dpr = 1, cache = {}, atlases = {}, grid = { ox: 0, oy: 0 }, stageRect = null;
  function geom(rect, d, gx, gy) {
    var sz = Math.round(rect.width);
    var sparse = sizes()[0], ox = ((gx - rect.left) % sparse + sparse) % sparse, oy = ((gy - rect.top) % (sparse * RATIO) + sparse * RATIO) % (sparse * RATIO);
    if (sz !== S || d !== dpr || Math.abs(ox - grid.ox) > .5 || Math.abs(oy - grid.oy) > .5) { S = sz; dpr = d; grid.ox = ox; grid.oy = oy; cache = {}; atlases = {}; queue = []; }
  }
  function atlasFor(s) { return atlases[s] || (atlases[s] = A.atlas(s === sizes()[0] ? SPARSE_RAMP : RAMP, ["#fff"], s, s * RATIO, 600, dpr)); }
  function canvas() { var c = document.createElement("canvas"); c.width = Math.round(S * dpr); c.height = Math.round(S * dpr); return c; }
  function sharp(n) {
    var k = "i" + n; if (cache[k]) return cache[k];
    var c = canvas(); c.getContext("2d").drawImage(bitmaps[n], 0, 0, c.width, c.height); return (cache[k] = c);
  }
  function build(n, s) {
    var k = n + ":" + s; if (cache[k]) return cache[k];
    var sparse = s === sizes()[0], ch = s * RATIO, ox = sparse ? grid.ox : (S % s) / 2, oy = sparse ? grid.oy : (S % ch) / 2;
    var cols = Math.floor((S - ox) / s), nr = Math.floor((S - oy) / ch);
    var sm = document.createElement("canvas"); sm.width = cols; sm.height = nr;
    var sg = sm.getContext("2d"); sg.imageSmoothingQuality = "high";
    sg.drawImage(bitmaps[n], 0, 0, bitmaps[n].naturalWidth, bitmaps[n].naturalHeight, -ox / s, -oy / ch, S / s, S / ch);
    var data = null; try { data = sg.getImageData(0, 0, cols, nr); } catch (e) {} // real (cross-origin) images need CORS
    var AT = atlasFor(s), mk = canvas(), mg = mk.getContext("2d"), top = AT.n - 1;
    if (data) {
      var d = data.data, lo = 1, hi = 0, L = new Float32Array(cols * nr), q;
      for (q = 0; q < L.length; q++) { var v = (.2126 * d[q * 4] + .7152 * d[q * 4 + 1] + .0722 * d[q * 4 + 2]) / 255; L[q] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
      var span = Math.max(.2, hi - lo);
      for (q = 0; q < L.length; q++) {
        var m = Math.max(d[q * 4], d[q * 4 + 1], d[q * 4 + 2]), f = m > 0 ? Math.min(3.2, 240 / m) : 1; // bright, legible glyph colours
        d[q * 4] = Math.min(255, d[q * 4] * f + 10); d[q * 4 + 1] = Math.min(255, d[q * 4 + 1] * f + 10); d[q * 4 + 2] = Math.min(255, d[q * 4 + 2] * f + 10); d[q * 4 + 3] = 255;
        var t = (L[q] - lo) / span; if (m < 22) t = 0; // near-black → page shows through
        var gi = Math.round(t * top);
        if (gi > 0) mg.drawImage(AT.canvas, gi * AT.tw, 0, AT.tw, AT.th, Math.round((ox + (q % cols) * s) * dpr), Math.round((oy + Math.floor(q / cols) * ch) * dpr), AT.tw, AT.th);
      }
      sg.putImageData(data, 0, 0);
    } else for (var j = 0; j < nr; j++) for (var i = 0; i < cols; i++) mg.drawImage(AT.canvas, (top - 2) * AT.tw, 0, AT.tw, AT.th, Math.round((ox + i * s) * dpr), Math.round((oy + j * ch) * dpr), AT.tw, AT.th);
    var out = canvas(), og = out.getContext("2d");
    og.imageSmoothingEnabled = false; og.drawImage(sm, 0, 0, cols, nr, Math.round(ox * dpr), Math.round(oy * dpr), Math.round(cols * s * dpr), Math.round(nr * ch * dpr));
    og.globalCompositeOperation = "destination-in"; og.drawImage(mk, 0, 0);
    return (cache[k] = out);
  }
  // build layers ahead of time, one per frame (keeps clicks hitch-free)
  var queue = [];
  function prefetch(n) { sizes().forEach(function (s) { if (!cache[n + ":" + s]) queue.push([n, s]); }); if (!cache["i" + n]) queue.push([n, 0]); }
  function pump() { var job = queue.shift(); if (!job) return; if (job[1]) build(job[0], job[1]); else sharp(job[0]); }

  // ---- view state + sequences ----
  // view: what the stage shows at rest: {n, s} with s = 0 meaning the sharp image
  var view = { n: 0, s: sizes()[0] }, seq = null, introDone = false, reveal = 0;
  function layer(st) { return st.s ? build(st.n, st.s) : sharp(st.n); }
  function fwd(n, dt) { var z = sizes(), out = z.map(function (s, k) { return { n: n, s: s, d: k ? dt : 60 }; }); out.push({ n: n, s: 0, d: 280 }); return out; }
  function rev(n) { var z = sizes().slice().reverse(); return z.map(function (s) { return { n: n, s: s, d: 85 }; }); }
  function play(steps, from, soft) { seq = { steps: steps, from: from, t0: performance.now(), soft: !!soft }; }
  // hover in: image → dense → sparse (current), then the hovered work's sparse gist; hover out: back up to the image
  function hoverIn(n) { var z = sizes().slice().reverse(); return z.map(function (s) { return { n: current, s: s, d: 45 }; }).concat([{ n: n, s: sizes()[0], d: 60 }]); }
  function hoverOut() { var z = sizes(); return z.map(function (s, k) { return { n: current, s: s, d: k ? 50 : 60 }; }).concat([{ n: current, s: 0, d: 150 }]); }
  function syncImg() {
    var show = !seq && previewing < 0 && view.s === 0 && reveal >= 1;
    img.style.opacity = show ? "1" : "0";
  }

  function preview(n) {
    if ((seq && !seq.soft) || !introDone) return;
    if (n === current) { restore(); return; }
    if (n === previewing) return;
    var was = previewing; previewing = n; setTint(WORKS[n]); markRows(); prefetch(n);
    if (was < 0 && view.s === 0 && !instant()) play(hoverIn(n), { n: current, s: 0 }, true);
    syncImg();
  }
  function restore() {
    if (previewing < 0) return;
    var was = previewing; previewing = -1; setTint(WORKS[current]); markRows();
    if (view.s === 0 && !instant() && !(seq && !seq.soft)) play(hoverOut(), { n: was, s: sizes()[0] }, true);
    syncImg();
  }
  function confirm(n) {
    if ((seq && !seq.soft) || !introDone) return;
    if (seq) seq = null;
    if (n === current) { restore(); return; }
    var wasPreview = previewing === n, old = current, from = previewing >= 0 ? { n: previewing, s: sizes()[0] } : { n: view.n, s: view.s };
    current = n; previewing = -1; markRows(); setTint(WORKS[n]);
    img.src = WORKS[n].src; img.alt = WORKS[n].alt || WORKS[n].title + ", " + WORKS[n].year;
    if (status) status.textContent = "Showing " + WORKS[n].title + ", " + WORKS[n].year + ".";
    if (instant()) { view = { n: n, s: 0 }; syncImg(); return; }
    var steps = (wasPreview ? [] : rev(old)).concat(fwd(n, wasPreview ? 190 : 150));
    play(steps, from); syncImg();
  }

  // ---- drawing, called by scene.js every frame while the scene is on screen ----
  function blitAt(g, c, a) { if (a <= 0) return; g.globalAlpha = a; g.drawImage(c, Math.round(stageRect.left * dpr), Math.round(stageRect.top * dpr)); g.globalAlpha = 1; }
  function revealPath(g, u) { // sparse cells appear one by one (hash order) — the same character field the SUN thinned into
    var s = sizes()[0], ch = s * RATIO, cols = Math.floor((S - grid.ox) / s), nr = Math.floor((S - grid.oy) / ch);
    g.beginPath();
    for (var j = 0; j < nr; j++) for (var i = 0; i < cols; i++) {
      var gi = Math.round((stageRect.left + grid.ox - gridX) / s) + i, gj = Math.round((stageRect.top + grid.oy - gridY) / ch) + j;
      if (A.hash(gi, gj + 500) < u) g.rect(Math.round((stageRect.left + grid.ox + i * s) * dpr), Math.round((stageRect.top + grid.oy + j * ch) * dpr), Math.ceil(s * dpr), Math.ceil(ch * dpr));
    }
  }
  var gridX = 0, gridY = 0;
  function draw(g, d, gx, gy, pw) {
    stageRect = stage.getBoundingClientRect(); gridX = gx; gridY = gy;
    if (stageRect.bottom < 0 || stageRect.top > innerHeight) return;
    geom(stageRect, d, gx, gy);
    // intro: reveal sparse cells while the scene assembles (pw 0 → .2), then resolve to the image once
    var u = reduceQ.matches ? 1 : A.clamp(pw / .2);
    if (u !== reveal) { reveal = u; syncImg(); }
    stage.parentElement.style.setProperty("--in", u.toFixed(3)); stage.parentElement.classList.toggle("is-live", u > .95);
    if (!introDone && u >= 1 && !instant()) { introDone = true; play(fwd(current, 170), { n: current, s: sizes()[0] }); prefetch(current); }
    if (instant() && u >= 1 && !introDone) { introDone = true; view = { n: current, s: 0 }; syncImg(); }
    if (introDone && u < .6 && !seq) { introDone = false; view = { n: current, s: sizes()[0] }; previewing = -1; markRows(); syncImg(); }
    if (!introDone && u < 1) {
      if (u > 0) { g.save(); revealPath(g, u); g.clip(); blitAt(g, build(current, sizes()[0]), 1); g.restore(); }
      return;
    }
    if (seq) {
      var t = performance.now() - seq.t0, acc = 0, k = 0, steps = seq.steps;
      while (k < steps.length - 1 && t >= acc + steps[k].d) { acc += steps[k].d; k++; }
      if (k === steps.length - 1 && t >= acc + steps[k].d) { if (!seq.soft) view = { n: steps[k].n, s: steps[k].s }; seq = null; syncImg(); if (hoverIdx >= 0 && hoverIdx !== current) preview(hoverIdx); }
      else {
        var prev = k ? steps[k - 1] : seq.from, cur = steps[k], fade = cur.s === 0 ? cur.d : Math.min(70, cur.d), a = A.clamp((t - acc) / fade);
        blitAt(g, layer(prev), 1 - (cur.s === 0 ? a : 0)); blitAt(g, layer(cur), a);
        return;
      }
    }
    pump();
    if (previewing >= 0) { blitAt(g, build(previewing, sizes()[0]), 1); return; }
    if (view.s) blitAt(g, layer(view), 1); // at rest with the image: the DOM <img> shows, canvas draws nothing
  }
  function busy() { return !!seq || queue.length > 0; }

  // ---- events ----
  rows.forEach(function (b, n) {
    b.addEventListener("pointerdown", function (e) { lastPointer = e.pointerType; });
    b.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse" && canHover.matches) { hoverIdx = n; preview(n); } });
    b.addEventListener("focus", function () { if (b.matches(":focus-visible")) { lastPointer = "keyboard"; preview(n); } });
    b.addEventListener("click", function () { confirm(n); });
  });
  list.addEventListener("pointerleave", function (e) {
    if (e.pointerType !== "mouse") return;
    hoverIdx = -1;
    var f = document.activeElement, fi = rows.indexOf(f);
    if (fi >= 0 && f.matches(":focus-visible")) preview(fi); else restore();
  });
  list.addEventListener("focusout", function (e) { if (!list.contains(e.relatedTarget) && hoverIdx < 0) restore(); });
  list.addEventListener("keydown", function (e) {
    var fi = rows.indexOf(document.activeElement); if (fi < 0) return;
    var to = e.key === "ArrowDown" ? fi + 1 : e.key === "ArrowUp" ? fi - 1 : e.key === "Home" ? 0 : e.key === "End" ? rows.length - 1 : -2;
    if (to === -2) return; e.preventDefault(); rows[Math.max(0, Math.min(rows.length - 1, to))].focus();
  });
  A.ready(function () { cache = {}; atlases = {}; queue = []; WORKS.forEach(function (w, n) { queue.push([n, sizes()[0]]); }); });

  img.src = WORKS[0].src; img.alt = WORKS[0].alt || WORKS[0].title + ", " + WORKS[0].year;
  setTint(WORKS[0]); markRows(); syncImg();
  window.WORKS_VIEW = { empty: false, draw: draw, busy: busy };
})();
