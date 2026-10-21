document.documentElement.classList.add("js");
// the opening plays where motion is welcome; otherwise the hero shows the formed name, still
if (window.matchMedia && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.documentElement.classList.add("birth");
