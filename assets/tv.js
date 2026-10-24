/* The inside of the flesh TV.
   window.onTvOpen(reveal) runs once the frame has finished opening.
   Replace it to play a boot animation, then call reveal() to show the title. */
(function () {
  var root = document.documentElement;
  if (!root.classList.contains("birth") || !window.BIRTH) return;

  var SCREENS = ["about", "works", "contact"];
  var FLASH = 240;
  var tv = document.getElementById("tv");
  var title = document.getElementById("tv-title");
  var menu = document.getElementById("tv-menu");
  var noise = document.getElementById("tv-noise");
  var about = document.getElementById("about");
  var works = document.getElementById("works");
  var contact = document.getElementById("contact");
  var items = menu ? Array.prototype.slice.call(menu.querySelectorAll(".tv__item")) : [];
  var panes = { about: about, works: works, contact: contact };

  var endY = null;
  var scene = document.querySelector(".scene");
  var opened = false;
  var mode = "";
  var index = 0;
  var lock = false;
  var noiseGen = 0;
  var watching = false;
  var blockClickUntil = 0;

  if (typeof window.onTvOpen !== "function") {
    window.onTvOpen = function (reveal) { reveal(); };
  }
  if (document.fonts && document.fonts.load) document.fonts.load("16px DotGothic16");

  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function editing(el) {
    if (!el || !el.tagName) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName !== "INPUT") return false;
    var type = (el.type || "text").toLowerCase();
    return type !== "button" && type !== "submit" && type !== "checkbox" && type !== "radio" && type !== "range";
  }

  function jump(y) {
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, y);
    root.style.scrollBehavior = prev;
  }

  function releaseScene() {
    if (!scene) return;
    scene.style.height = "";
    scene.style.overflow = "";
  }

  function measure() {
    if (!window.BIRTH || !window.BIRTH.on || !root.classList.contains("birth")) {
      endY = null;
      releaseScene();
      if (opened) closeTv();
      syncInert();
      return;
    }
    if (!scene || !window.BIRTH.scrollEnd || window.BIRTH.scrollEnd() == null) return;
    var end = window.BIRTH.scrollEnd();
    var top = scene.getBoundingClientRect().top + window.scrollY;
    scene.style.overflow = "clip";
    scene.style.height = Math.max(0, end + window.innerHeight - top) + "px";
    var max = document.scrollingElement.scrollHeight - window.innerHeight;
    if (Math.abs(max - end) > 1) scene.style.height = Math.max(0, end + window.innerHeight - top + (end - max)) + "px";
    endY = window.BIRTH.scrollEnd();
    if (endY != null && window.scrollY > endY + 1) jump(endY);
  }

  function leaveRoom() { return Math.max(64, window.innerHeight * 0.08); }

  function syncInert() {
    var hold = root.classList.contains("birth") && window.BIRTH && window.BIRTH.on;
    for (var k in panes) {
      if (!panes[k]) continue;
      panes[k].inert = !!(hold && mode !== k);
    }
  }

  function setScreenClass(name) {
    for (var i = 0; i < SCREENS.length; i++) root.classList.toggle("tv-" + SCREENS[i], SCREENS[i] === name);
  }

  function hideBacks() {
    var nodes = document.querySelectorAll(".back");
    for (var i = 0; i < nodes.length; i++) nodes[i].hidden = true;
  }

  function showBack(pane) {
    hideBacks();
    var b = pane && pane.querySelector(".back");
    if (!b) return;
    b.hidden = false;
    b.focus({ preventScroll: true });
  }

  function select(i, focus) {
    if (!items.length) return;
    index = Math.max(0, Math.min(items.length - 1, i));
    for (var n = 0; n < items.length; n++) {
      if (n === index) items[n].setAttribute("aria-current", "true");
      else items[n].removeAttribute("aria-current");
    }
    if (focus) items[index].focus({ preventScroll: true });
  }

  function showTitle() {
    if (!opened || !tv) return;
    mode = "title";
    setScreenClass("");
    root.classList.add("tv-open");
    tv.hidden = false;
    if (title) title.hidden = false;
    if (menu) menu.hidden = true;
    if (noise) noise.hidden = true;
    hideBacks();
    syncInert();
    var start = tv.querySelector(".tv__start");
    if (start) start.focus({ preventScroll: true });
  }

  function showMenu() {
    if (!opened || !tv) return;
    mode = "menu";
    setScreenClass("");
    root.classList.add("tv-open");
    tv.hidden = false;
    if (title) title.hidden = true;
    if (menu) menu.hidden = false;
    hideBacks();
    syncInert();
    select(index, true);
  }

  function showScreen(name) {
    if (!opened) return;
    mode = name;
    setScreenClass(name);
    root.classList.add("tv-open");
    if (tv) tv.hidden = true;
    syncInert();
    showBack(panes[name]);
  }

  function closeTv() {
    opened = false;
    mode = "";
    noiseGen++;
    lock = false;
    root.classList.remove("tv-open");
    setScreenClass("");
    if (tv) tv.hidden = true;
    if (noise) noise.hidden = true;
    hideBacks();
    syncInert();
  }

  function finishOpen() {
    if (opened) return;
    opened = true;
    root.classList.add("tv-open");
    var reveal = function () { showTitle(); };
    if (typeof window.onTvOpen === "function") window.onTvOpen(reveal);
    else reveal();
  }

  function fiPx() {
    var v = parseFloat(getComputedStyle(root).getPropertyValue("--fi"));
    return isFinite(v) ? v : 0;
  }

  function drawNoise() {
    if (!noise) return;
    var fi = fiPx();
    var w = Math.max(1, Math.round(window.innerWidth - fi * 2));
    var h = Math.max(1, Math.round(window.innerHeight - fi * 2));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    noise.hidden = false;
    if (noise.width !== Math.round(w * dpr) || noise.height !== Math.round(h * dpr)) {
      noise.width = Math.round(w * dpr);
      noise.height = Math.round(h * dpr);
    }
    var g = noise.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#141018";
    g.fillRect(0, 0, w, h);
    g.font = "500 13px \"JetBrains Mono\", ui-monospace, monospace";
    g.textBaseline = "top";
    var glyphs = ".:-=+*#%@/\\|";
    var colors = ["#3d1528", "#6e1d43", "#b83470", "#ff5c9a", "#ff9cc2"];
    var cw = 14, ch = 22, x, y;
    for (y = 0; y < h; y += ch) {
      for (x = 0; x < w; x += cw) {
        if (Math.random() < 0.38) continue;
        g.fillStyle = colors[(Math.random() * colors.length) | 0];
        g.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y);
      }
    }
  }

  function flash(apply) {
    if (reduceMotion() || !noise) { apply(); return; }
    lock = true;
    var token = ++noiseGen;
    try { drawNoise(); } catch (e) { noise.hidden = true; lock = false; apply(); return; }
    apply();
    var t0 = performance.now();
    requestAnimationFrame(function frame(now) {
      if (token !== noiseGen) return;
      if (now - t0 < FLASH) { try { drawNoise(); } catch (e) {} requestAnimationFrame(frame); return; }
      noise.hidden = true;
      lock = false;
    });
  }

  function begin() {
    if (!opened || mode !== "title" || lock) return;
    showMenu();
  }

  function choose(name) {
    if (!opened || mode !== "menu" || lock) return;
    if (SCREENS.indexOf(name) < 0) return;
    flash(function () { showScreen(name); });
  }

  function back() {
    if (!opened || lock) return;
    if (SCREENS.indexOf(mode) < 0) return;
    flash(function () { showMenu(); });
  }

  function check() {
    if (!window.BIRTH || !window.BIRTH.on || !root.classList.contains("birth")) {
      if (opened) closeTv();
      syncInert();
      return;
    }
    if (endY == null) return;
    if (window.scrollY > endY + 1) jump(endY);
    if (!opened) {
      if (window.scrollY >= endY - 2 && window.BIRTH.x >= 0.98) finishOpen();
    } else if (window.scrollY < endY - leaveRoom()) closeTv();
  }

  function arm() {
    check();
    if (watching || opened || endY == null) return;
    if (window.scrollY <= endY - window.innerHeight * 0.5) return;
    watching = true;
    requestAnimationFrame(function loop() {
      check();
      if (!opened && endY != null && window.scrollY > endY - window.innerHeight * 0.5) requestAnimationFrame(loop);
      else watching = false;
    });
  }

  if (title) title.addEventListener("click", begin);
  items.forEach(function (btn, i) {
    btn.addEventListener("pointerenter", function (e) {
      if (mode !== "menu" || e.pointerType !== "mouse") return;
      select(i, false);
    });
    btn.addEventListener("focus", function () { if (mode === "menu") select(i, false); });
    btn.addEventListener("click", function () {
      if (performance.now() < blockClickUntil) return;
      select(i, false);
      choose(btn.getAttribute("data-screen"));
    });
  });
  if (menu) {
    menu.addEventListener("touchstart", function (e) {
      if (mode !== "menu" || lock) return;
      var t = e.changedTouches[0];
      menu._swipe = { x: t.clientX, y: t.clientY, id: t.identifier };
    }, { passive: true });
    menu.addEventListener("touchmove", function (e) {
      var s = menu._swipe;
      if (!s) return;
      var t = null, i;
      for (i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === s.id) t = e.changedTouches[i];
      if (!t) return;
      var dy = t.clientY - s.y, dx = t.clientX - s.x;
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) e.preventDefault();
    }, { passive: false });
    menu.addEventListener("touchend", function (e) {
      var s = menu._swipe;
      menu._swipe = null;
      if (!s || mode !== "menu") return;
      var t = null, i;
      for (i = 0; i < e.changedTouches.length; i++) if (e.changedTouches[i].identifier === s.id) t = e.changedTouches[i];
      if (!t) return;
      var dy = t.clientY - s.y, dx = t.clientX - s.x;
      if (Math.abs(dy) < 36 || Math.abs(dy) < Math.abs(dx) * 1.15) return;
      blockClickUntil = performance.now() + 80;
      select(index + (dy < 0 ? 1 : -1), true);
    });
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest && e.target.closest(".back");
    if (!b) return;
    e.preventDefault();
    back();
  });
  document.addEventListener("keydown", function (e) {
    if (!opened) return;
    if (mode === "title" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); begin(); return; }
    if (mode === "menu" && !lock) {
      if (e.key === "ArrowDown") { e.preventDefault(); select(index + 1, true); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); select(index - 1, true); return; }
      if (e.key === "Home") { e.preventDefault(); select(0, true); return; }
      if (e.key === "End") { e.preventDefault(); select(items.length - 1, true); return; }
      if ((e.key === "Enter" || e.key === " ") && items[index]) {
        e.preventDefault();
        choose(items[index].getAttribute("data-screen"));
        return;
      }
    }
    if (SCREENS.indexOf(mode) >= 0) {
      if (e.key === "Escape") { e.preventDefault(); back(); return; }
      if ((e.key === "Enter" || e.key === " ") && e.target && e.target.classList && e.target.classList.contains("back")) {
        e.preventDefault();
        back();
        return;
      }
    }
    if (e.key === "Backspace" && !editing(e.target)) {
      e.preventDefault();
      if (SCREENS.indexOf(mode) >= 0) back();
    }
  });

  if ("MutationObserver" in window) {
    new MutationObserver(function () { syncInert(); }).observe(root, { attributes: true, attributeFilter: ["class"] });
  }

  var resizeTimer;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var stay = opened;
      measure();
      if (stay && endY != null) jump(endY);
      check();
    }, 180);
  }
  addEventListener("resize", onResize);
  if (window.visualViewport) visualViewport.addEventListener("resize", onResize);
  function innerScroll(el, delta) {
    while (el && el !== document.documentElement) {
      if (el.scrollHeight > el.clientHeight + 1) {
        var oy = getComputedStyle(el).overflowY;
        if (oy === "auto" || oy === "scroll") {
          if (delta > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
          if (delta < 0 && el.scrollTop > 1) return true;
        }
      }
      el = el.parentElement;
    }
    return false;
  }
  addEventListener("scroll", function () { arm(); }, { passive: true });
  addEventListener("wheel", function (e) {
    if (endY == null || e.deltaY <= 0 || innerScroll(e.target, e.deltaY)) return;
    if (window.scrollY >= endY - 1) e.preventDefault();
  }, { passive: false });
  addEventListener("load", function () { measure(); arm(); });

  syncInert();
  var tries = 0;
  (function wait() {
    if (!window.BIRTH.scrollEnd || window.BIRTH.scrollEnd() == null) {
      if (tries++ < 120) { setTimeout(wait, 50); return; }
    }
    measure();
    arm();
    syncInert();
  })();
})();
