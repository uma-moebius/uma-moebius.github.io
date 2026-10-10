(function () {
  // Works lives in works.js; this file only handles the contact form.

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

    ["name", "message"].forEach(function (fieldName) {
      var field = form.elements[fieldName];
      if (field) field.value = field.value.trim();
    });

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

    // A stalled request never rejects, so Send would stay disabled.
    var sendWait = 15000;
    var controller = new AbortController();
    var timer = window.setTimeout(function () {
      controller.abort();
    }, sendWait);

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
      signal: controller.signal
    })
      .then(function (response) {
        window.clearTimeout(timer);
        if (!response.ok) throw new Error("submit failed");
        window.location.assign("/thank-you/");
      })
      .catch(function () {
        window.clearTimeout(timer);
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
