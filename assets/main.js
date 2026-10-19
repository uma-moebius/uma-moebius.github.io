(function () {
  // Works lives in works.js; this file only handles the contact form.

  var form = document.getElementById("contact-form");
  if (!form) return;

  var cfg = window.SITE_CONFIG || {};
  var siteKey = (cfg.turnstileSiteKey || "").trim();
  var error = document.getElementById("form-error");
  var slot = document.getElementById("turnstile");
  var widget = null;

  window.onTurnstileLoad = function () {
    if (!slot || !siteKey || !window.turnstile) return;
    widget = window.turnstile.render(slot, {
      sitekey: siteKey,
      theme: "dark",
      size: "flexible",
      appearance: "interaction-only",
      "before-interactive-callback": function () { slot.classList.add("is-visible"); },
      "after-interactive-callback": function () { slot.classList.remove("is-visible"); }
    });
  };

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (error) error.hidden = true;

    ["name", "message"].forEach(function (fieldName) {
      var field = form.elements[fieldName];
      if (field) field.value = field.value.trim();
    });

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var data = new FormData(form);
    if (!data.get("cf-turnstile-response")) {
      showError("Please complete the check first.");
      return;
    }

    var button = form.querySelector(".send");
    if (button) button.disabled = true;

    // A stalled request never rejects, so Send would stay disabled.
    var sendWait = 15000;
    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, sendWait);

    fetch(form.getAttribute("action") || "/api/contact", {
      method: "POST",
      body: data,
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then(function (response) {
        window.clearTimeout(timer);
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok || !body.ok) throw new Error(body.error || "Could not send. Please try again.");
          window.location.assign("/thank-you/");
        });
      })
      .catch(function (e) {
        window.clearTimeout(timer);
        if (button) button.disabled = false;
        if (window.turnstile && widget !== null) window.turnstile.reset(widget);
        showError(e && e.name !== "AbortError" && e.message ? e.message : "Could not send. Please try again.");
      });
  });

  function showError(message) {
    if (!error) return;
    error.hidden = false;
    error.textContent = message;
  }
})();
