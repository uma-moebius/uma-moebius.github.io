// Everything is served from the static assets.
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
