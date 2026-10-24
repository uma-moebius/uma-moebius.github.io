/* Works shown in the Works scene, newest first. Empty → the "no works yet" state.
   Add one object per work; the index, the character preview and the density steps follow automatically:
   { id: "slug", title: "Title", year: 2026, color: "#3d5afe", src: "https://<image host>/slug.webp", alt: "optional alt text" }
   src must be same-origin or served with CORS (Access-Control-Allow-Origin), or the characters cannot be read from it. */
window.SITE_WORKS = [];
/* About portrait. Empty until the picture is hosted (same CORS rule as a work). */
window.SITE_PORTRAIT = "";
