(function () {
  var works = document.getElementById("works-grid");
  if (works) {
    var frames = Array.prototype.slice.call(works.querySelectorAll(".works__frame"));
    var moving = false;
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ease = "cubic-bezier(0.22, 1, 0.36, 1)";
    var duration = 680;
    // Desktop columns: the sliding square crosses a row that is only the
    // gutter wide while the other two resize, so it waits until that row
    // is open and the clicked square grows after the slide has passed.
    var travelDelay = 340;
    var growDelay = 440;
    // Narrow layout: the clicked square and the large one exchange places.
    // A straight cross overlaps, so the large square parks in the free
    // corner, the clicked square slides up the open column, and the parked
    // square walks the gap between the rows into its slot before the grow.
    var narrowShrink = 400;
    var narrowShift = 380;
    var narrowAcross = 300;
    var narrowDown = 300;
    var narrowGrow = 680;
    // Resting corners are 7.7348% on the large square and 11.3636% on a
    // small one. The place changes before the size animates, so the radius
    // has to start from the old proportion of the new box and ease across
    // with the scale. Otherwise the clicked corners jump.
    var largeRadius = 0.077348;
    var smallRadius = 0.113636;

    function byPlace(place) {
      return works.querySelector('.works__frame[data-place="' + place + '"]');
    }

    function labelFrames() {
      frames.forEach(function (frame) {
        var large = frame.dataset.place === "large";
        if (large) {
          frame.setAttribute("aria-current", "true");
          frame.setAttribute("aria-label", "Featured work");
          frame.tabIndex = -1;
        } else {
          frame.removeAttribute("aria-current");
          frame.setAttribute("aria-label", "Show this work larger");
          frame.tabIndex = 0;
        }
      });
    }

    function measure() {
      var boxes = new Map();
      frames.forEach(function (frame) {
        var rect = frame.getBoundingClientRect();
        boxes.set(frame, {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height
        });
      });
      return boxes;
    }

    function clearMotion() {
      frames.forEach(function (frame) {
        if (frame.getAnimations) {
          frame.getAnimations().forEach(function (anim) { anim.cancel(); });
        }
        frame.style.transform = "";
        frame.style.transition = "";
        frame.style.transformOrigin = "";
        frame.style.borderRadius = "";
        frame.style.zIndex = "";
      });
      moving = false;
    }

    function shift(to, at) {
      var sx = at.width / to.width;
      var sy = at.height / to.height;
      return "translate(" + (at.left - to.left) + "px, " + (at.top - to.top) + "px) scale(" + sx + ", " + sy + ")";
    }

    function corner(width, large) {
      return ((large ? largeRadius : smallRadius) * width) + "px";
    }

    function place(next) {
      works.dataset.side = next.side;
      next.large.dataset.place = "large";
      next.top.dataset.place = "top";
      next.bottom.dataset.place = "bottom";
      labelFrames();
    }

    function play(next) {
      if (motion) {
        place(next);
        return;
      }

      var shrink = next.shrink;
      var grow = next.large;
      var travel = frames.filter(function (frame) {
        return frame !== shrink && frame !== grow;
      })[0];
      var first = measure();
      var travelBox = first.get(travel);
      var growBox = first.get(grow);
      var stacked = Math.abs(travelBox.left - growBox.left) < Math.abs(travelBox.top - growBox.top);
      var timing = new Map();
      timing.set(shrink, { delay: 0, dur: duration });
      timing.set(travel, { delay: stacked ? travelDelay : 0, dur: duration });
      timing.set(grow, { delay: stacked ? growDelay : 0, dur: duration });

      place(next);
      var last = measure();
      moving = true;

      if (!stacked) {
        playNarrow(shrink, grow, travel, first, last);
        return;
      }

      frames.forEach(function (frame) {
        var from = first.get(frame);
        var to = last.get(frame);
        var sx = from.width / to.width;
        var sy = from.height / to.height;
        frame.style.transformOrigin = "top left";
        frame.style.transition = "none";
        frame.style.zIndex = frame === grow ? "3" : frame === travel ? "2" : "1";
        frame.style.borderRadius = corner(to.width, frame === shrink);
        frame.style.transform = "translate(" + (from.left - to.left) + "px, " + (from.top - to.top) + "px) scale(" + sx + ", " + sy + ")";
      });

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          frames.forEach(function (frame) {
            var spec = timing.get(frame);
            var move = spec.dur + "ms " + ease + " " + spec.delay + "ms";
            frame.style.transition = "transform " + move + ", border-radius " + move;
            frame.style.transform = "translate(0px, 0px) scale(1, 1)";
            frame.style.borderRadius = corner(last.get(frame).width, frame === grow);
          });
        });
      });

      window.setTimeout(clearMotion, growDelay + duration + 80);
    }

    function playNarrow(shrink, grow, travel, first, last) {
      var growFrom = first.get(grow);
      var travelFrom = first.get(travel);
      var shrinkFrom = first.get(shrink);
      var shrinkTo = last.get(shrink);
      var growTo = last.get(grow);
      var leftX = Math.min(growFrom.left, travelFrom.left);
      var rightX = Math.max(growFrom.left, travelFrom.left);
      var topY = shrinkFrom.top;
      var bottomY = growFrom.top;
      var side = growFrom.width;
      var bandTop = topY + side;
      var band = bottomY - bandTop;
      var midY = bandTop + (band - side) / 2;
      var clickedLeft = growFrom.left <= travelFrom.left;

      function square(x, y) {
        return { left: x, top: y, width: side, height: side };
      }

      var parkX = clickedLeft ? rightX : leftX;
      var holdX = clickedLeft ? leftX : rightX;
      var park = square(parkX, topY);
      var midPark = square(parkX, midY);
      var midHold = square(holdX, midY);
      var grown = square(holdX, topY);
      var t1 = narrowShrink;
      var t2 = t1 + narrowShift;
      var t3 = t2 + narrowAcross;
      var t4 = t3 + narrowDown;
      var total = t4 + narrowGrow;

      function at(ms) {
        return ms / total;
      }

      shrink.style.transformOrigin = "top left";
      grow.style.transformOrigin = "top left";
      shrink.style.transition = "none";
      grow.style.transition = "none";
      shrink.style.zIndex = "2";
      grow.style.zIndex = "3";
      travel.style.zIndex = "1";
      shrink.style.transform = shift(shrinkTo, shrinkFrom);
      grow.style.transform = shift(growTo, growFrom);
      shrink.style.borderRadius = corner(shrinkTo.width, true);
      grow.style.borderRadius = corner(growTo.width, false);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          shrink.style.transition = "border-radius " + narrowShrink + "ms " + ease;
          shrink.style.borderRadius = corner(shrinkTo.width, false);
          grow.style.transition = "border-radius " + narrowGrow + "ms " + ease + " " + t4 + "ms";
          grow.style.borderRadius = corner(growTo.width, true);

          shrink.animate([
            { transform: shift(shrinkTo, shrinkFrom), easing: ease },
            { transform: shift(shrinkTo, park), offset: at(t1), easing: ease },
            { transform: shift(shrinkTo, midPark), offset: at(t2), easing: ease },
            { transform: shift(shrinkTo, midHold), offset: at(t3), easing: ease },
            { transform: shift(shrinkTo, shrinkTo), offset: at(t4), easing: ease },
            { transform: "translate(0px, 0px) scale(1, 1)", offset: 1 }
          ], { duration: total, fill: "forwards" });

          grow.animate([
            { transform: shift(growTo, growFrom), easing: ease },
            { transform: shift(growTo, growFrom), offset: at(t1), easing: ease },
            { transform: shift(growTo, grown), offset: at(t2), easing: ease },
            { transform: shift(growTo, grown), offset: at(t4), easing: ease },
            { transform: "translate(0px, 0px) scale(1, 1)", offset: 1 }
          ], { duration: total, fill: "forwards" });
        });
      });

      window.setTimeout(clearMotion, total + 120);
    }

    works.addEventListener("click", function (event) {
      var frame = event.target.closest(".works__frame");
      if (!frame || moving || frame.dataset.place === "large") return;

      var large = byPlace("large");
      var top = byPlace("top");
      var bottom = byPlace("bottom");
      var other = frame === top ? bottom : top;
      play({
        side: works.dataset.side === "left" ? "right" : "left",
        large: frame,
        shrink: large,
        top: frame === top ? large : other,
        bottom: frame === bottom ? large : other
      });
    });

    labelFrames();
  }

  var form = document.getElementById("contact-form");
  if (!form) return;

  var cfg = window.SITE_CONFIG || {};
  var formId = (cfg.formspreeFormId || "").trim();
  var error = document.getElementById("form-error");

  if (formId) {
    form.setAttribute("action", "https://formspree.io/f/" + formId);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (error) error.hidden = true;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var endpoint = form.getAttribute("action") || "";
    var button = form.querySelector(".send");

    if (!formId || endpoint.indexOf("formspree.io/f/") === -1) {
      showError("This form is not ready to send yet.");
      return;
    }

    if (button) button.disabled = true;

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("submit failed");
        window.location.assign("/thank-you/");
      })
      .catch(function () {
        if (button) button.disabled = false;
        showError("Could not send. Please try again.");
      });
  });

  function showError(message) {
    if (!error) return;
    error.hidden = false;
    error.textContent = message;
  }
})();
