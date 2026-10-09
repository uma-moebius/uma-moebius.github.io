(function () {
  var works = document.getElementById("works-grid");
  if (works) {
    var frames = Array.prototype.slice.call(works.querySelectorAll(".works__frame"));
    var moving = false;
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ease = "cubic-bezier(0.22, 1, 0.36, 1)";
    var duration = 680;

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
        frame.style.transform = "";
        frame.style.transition = "";
        frame.style.transformOrigin = "";
        frame.style.zIndex = "";
      });
      moving = false;
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

      var first = measure();
      place(next);
      var last = measure();
      moving = true;

      frames.forEach(function (frame) {
        var from = first.get(frame);
        var to = last.get(frame);
        var sx = from.width / to.width;
        var sy = from.height / to.height;
        frame.style.transformOrigin = "top left";
        frame.style.transition = "none";
        frame.style.zIndex = frame === next.large ? "2" : "1";
        frame.style.transform = "translate(" + (from.left - to.left) + "px, " + (from.top - to.top) + "px) scale(" + sx + ", " + sy + ")";
      });

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          frames.forEach(function (frame) {
            frame.style.transition = "transform " + duration + "ms " + ease;
            frame.style.transform = "translate(0px, 0px) scale(1, 1)";
          });
        });
      });

      window.setTimeout(clearMotion, duration + 80);
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
