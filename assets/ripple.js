/* Links and buttons, in the material of the wordmark and the SUN: on hover (mouse), press or keyboard focus, the label loosens
   into ramp characters for a moment, one cell at a time from left to right, and settles back. Same grid (the label is monospace,
   so a character only ever swaps for another of the same width), same glyphs, two of the five tones, never white.
   The accessible name is the real label (aria-label); the swap runs on animation frames only while it sweeps (~0.3s). */
(function () {
  if (!window.requestAnimationFrame || matchMedia("(prefers-reduced-motion: reduce)").matches) return;   // reduced motion: no ripple, the static hover style stays
  var SEL = ".logo, .nav a, .status__link, .contact__mail";
  var FRONT = "*+", TRAIL = "=";            // the sweep: a dense glyph at its front, a lighter one behind it, then the letter returns
  var T_FRONT = "#ff9cc2", T_TRAIL = "#b83470";   // the top tone and the middle tone of the five
  var hover = matchMedia("(hover: hover) and (pointer: fine)");
  document.documentElement.classList.add("ripple");
  var els = document.querySelectorAll(SEL);
  for (var n = 0; n < els.length; n++) arm(els[n]);
  function arm(el) {
    var cells = null, run = 0, text = el.textContent;
    if (!/\S/.test(text)) return;
    function split() { // once, on first use: one span per character, the label stays as the accessible name
      if (cells) return;
      if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", text.trim());
      el.textContent = ""; cells = [];
      for (var i = 0; i < text.length; i++) { var s = document.createElement("span"); s.setAttribute("aria-hidden", "true"); s.textContent = text[i]; el.appendChild(s); cells.push(s); }
    }
    function play() {
      if (run) return; split();
      var len = cells.length, step = Math.max(12, Math.min(24, 320 / (len + 2))), t0 = performance.now(), last = -1;
      run = requestAnimationFrame(function f(now) {
        var at = Math.floor((now - t0) / step);
        if (at !== last) {
          for (var i = Math.max(0, last - 1); i < len && i <= at; i++) {
            var s = cells[i], ch = text[i], d = at - i;
            if (ch === " " || d > 1) { if (s.style.color) { s.textContent = ch; s.style.color = ""; } continue; }
            s.textContent = d === 0 ? FRONT[i % 2] : TRAIL; s.style.color = d === 0 ? T_FRONT : T_TRAIL;
          }
          last = at;
        }
        if (at < len + 1) run = requestAnimationFrame(f); else run = 0;
      });
    }
    el.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse" && hover.matches) play(); });
    el.addEventListener("pointerdown", function () { play(); });
    el.addEventListener("focus", function () { if (el.matches(":focus-visible")) play(); });
  }
})();
