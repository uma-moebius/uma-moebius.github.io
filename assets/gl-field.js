/* The scene field on the GPU. Each character cell is one quad that copies its tile 1:1 from the same glyph atlas the 2D path
   draws from (whole device pixels, nearest texels, premultiplied alpha), so both paths put the same pixels on screen; only the
   per-cell drawImage calls go away. Returns null where WebGL is missing or would run in software: the caller keeps Canvas 2D. */
window.ASCII_GL = function (cv, onFail, onRestore, still) {
  // still = the static (reduced-motion) frame: drawn once and then left on screen, so its buffer must outlive compositing
  var OPTS = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: !!still, failIfMajorPerformanceCaveat: true, powerPreference: "low-power" };
  var gl = null, kind = "webgl2", inst = null;
  try { gl = cv.getContext("webgl2", OPTS); if (!gl) { kind = "webgl"; gl = cv.getContext("webgl", OPTS); } } catch (e) { gl = null; }
  if (!gl) return null;
  // a software rasteriser (no usable GPU) would be slower than Canvas 2D: keep 2D there
  var dbg = gl.getExtension("WEBGL_debug_renderer_info"), gpu = String(gl.getParameter(gl.RENDERER)) + " " + (dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "");
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpu)) { fail(); return null; }

  var VS = "attribute vec2 corner; attribute vec4 cell; uniform vec2 view; uniform vec4 tile; uniform vec2 tex; varying highp vec2 uv;\n" +
    "void main() { vec2 p = cell.xy + corner * tile.xy; uv = (cell.zw * tile.zw + corner * tile.zw) / tex;\n" +
    "  gl_Position = vec4(p.x / view.x * 2.0 - 1.0, 1.0 - p.y / view.y * 2.0, 0.0, 1.0); }";
  var FS = "precision highp float; uniform sampler2D atlas; uniform float alpha; varying highp vec2 uv;\n" +
    "void main() { gl_FragColor = texture2D(atlas, uv) * alpha; }";
  var prog, L = {}, cornerBuf, cellBuf, maxTex = 0, gen = 0, lost = false, dead = false, timer = 0;
  var data = new Float32Array(4 * 4096), n = 0, cur = null, vw = 1, vh = 1, live = [], KEEP = 8;   // a few atlases stay on the GPU (the dive walks through them in order)
  var lc = null, lg = null, lt = null, inked = false, used = false, shim = null;

  function setup() {
    if (kind === "webgl") { inst = gl.getExtension("ANGLE_instanced_arrays"); if (!inst) return false; }
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS); if (!v || !f) return false;
    prog = gl.createProgram(); gl.attachShader(prog, v); gl.attachShader(prog, f);
    gl.bindAttribLocation(prog, 0, "corner"); gl.bindAttribLocation(prog, 1, "cell"); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    ["view", "tile", "tex", "atlas", "alpha"].forEach(function (k) { L[k] = gl.getUniformLocation(prog, k); });
    gl.uniform1i(L.atlas, 0);
    cornerBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    cellBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    if (inst) inst.vertexAttribDivisorANGLE(1, 1); else gl.vertexAttribDivisor(1, 1);
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // source-over on premultiplied colour, as Canvas 2D
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.clearColor(0, 0, 0, 0);
    maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE); gl.viewport(0, 0, vw, vh); gen++; live = []; lt = null;
    return true;
  }
  if (!setup()) { fail(); return null; }   // a context exists but cannot draw: the caller swaps in a fresh canvas for 2D
  function fail() { if (dead) return; dead = true; clearTimeout(timer); if (gl && !gl.isContextLost()) { var x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); } }

  function giveUp() { if (dead) return; dead = true; setTimeout(onFail, 0); }   // after the current frame, never inside it
  function texture(canvas) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (canvas) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    return t;
  }
  function atlasTex(AT) {
    var e = AT.gl;
    if (e && e.gen === gen) { var at = live.indexOf(e); if (at < live.length - 1) { live.splice(at, 1); live.push(e); } gl.bindTexture(gl.TEXTURE_2D, e.t); return true; }
    if (AT.canvas.width > maxTex || AT.canvas.height > maxTex) return false;
    e = AT.gl = { t: texture(AT.canvas), gen: gen, at: AT }; live.push(e);
    while (live.length > KEEP) { var old = live.shift(); gl.deleteTexture(old.t); old.at.gl = null; }
    gl.bindTexture(gl.TEXTURE_2D, e.t); return true;
  }
  function draw(count) {
    if (inst) inst.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, count); else gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
  }

  cv.addEventListener("webglcontextlost", function (e) {
    if (dead) return; e.preventDefault(); lost = true;
    timer = setTimeout(function () { if (lost && !dead) { dead = true; onFail(); } }, 700);   // not back soon: hand over to Canvas 2D for good
  });
  cv.addEventListener("webglcontextrestored", function () {
    if (dead) return; clearTimeout(timer); lost = false;
    if (!setup()) { giveUp(); return; }
    onRestore();
  });

  return {
    kind: kind,
    size: function (w, h) { vw = w; vh = h; if (!lost && !dead) gl.viewport(0, 0, w, h); },
    clear: function () { if (lost || dead) return; gl.clear(gl.COLOR_BUFFER_BIT); },
    // one batch per frame: every quad shares the atlas, the device-pixel tile size and the frame's opacity
    begin: function (AT, dw, dh, alpha) { cur = { AT: AT, dw: dw, dh: dh, a: alpha }; n = 0; },
    add: function (gi, lvl, x, y) {
      if (n * 4 >= data.length) { var d = new Float32Array(data.length * 2); d.set(data); data = d; }
      var o = n * 4; data[o] = x; data[o + 1] = y; data[o + 2] = gi; data[o + 3] = lvl; n++;
    },
    end: function () {
      if (lost || dead || !cur || !n) return;
      var AT = cur.AT; if (!atlasTex(AT)) { giveUp(); return; }
      gl.uniform2f(L.view, vw, vh); gl.uniform4f(L.tile, cur.dw, cur.dh, AT.tw, AT.th);
      gl.uniform2f(L.tex, AT.canvas.width, AT.canvas.height); gl.uniform1f(L.alpha, cur.a);
      gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf); gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * 4), gl.STREAM_DRAW);
      draw(n); cur = null;
    },
    // a layer still drawn with Canvas 2D calls (the Works images): painted offscreen, then laid over the field in one quad
    layer: function (fn) {
      if (!lc) {
        lc = document.createElement("canvas"); lg = lc.getContext("2d");
        var quiet = { save: 1, restore: 1, beginPath: 1, closePath: 1, rect: 1, clip: 1, setTransform: 1, resetTransform: 1, moveTo: 1, lineTo: 1, measureText: 1 };
        shim = new Proxy(lg, {
          get: function (t, k) { var v = t[k]; return typeof v === "function" ? function () { if (!quiet[k]) inked = true; return v.apply(t, arguments); } : v; },
          set: function (t, k, v) { t[k] = v; return true; }
        });
      }
      if (lc.width !== vw || lc.height !== vh) { lc.width = vw; lc.height = vh; used = false; }
      if (used) { lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalAlpha = 1; lg.clearRect(0, 0, vw, vh); used = false; }
      inked = false; fn(shim);
      if (!inked || lost || dead) return;
      used = true;
      if (!lt || lt.gen !== gen) lt = { t: texture(null), gen: gen };
      gl.bindTexture(gl.TEXTURE_2D, lt.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lc);
      gl.uniform2f(L.view, vw, vh); gl.uniform4f(L.tile, vw, vh, vw, vh); gl.uniform2f(L.tex, vw, vh); gl.uniform1f(L.alpha, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, cellBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 0]), gl.STREAM_DRAW);
      draw(1);
    }
  };
};
