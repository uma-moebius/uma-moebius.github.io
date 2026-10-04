(function () {
  var form = document.getElementById("contact-form");
  if (!form) return;

  var cfg = window.SITE_CONFIG || {};
  var formId = (cfg.formspreeFormId || "").trim();
  if (formId) {
    form.setAttribute("action", "https://formspree.io/f/" + formId);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var endpoint = form.getAttribute("action") || "";
    if (!formId || endpoint === "#" || endpoint.indexOf("FORMSPREE") !== -1) {
      window.location.href = "./thank-you/";
      return;
    }

    var button = form.querySelector(".send");
    if (button) button.disabled = true;

    fetch(endpoint, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("submit failed");
        window.location.assign("./thank-you/");
      })
      .catch(function () {
        if (button) button.disabled = false;
      });
  });
})();
