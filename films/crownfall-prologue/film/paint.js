/* The painterly finish: every scene is drawn in code as before, then passed through this shader so it reads as a painted
   tableau instead of flat vector shapes. Still code only, and still deterministic: the textures are made from seeded
   noise, and nothing depends on the frame before.

     K.paint(ctx, look)   paints over what is on ctx's canvas. look = { amount, warp, smooth, stroke, edge, canvas, bloom,
                          grade, vignette, shift } (all optional; 0..1 unless noted). amount 0 leaves the frame untouched.

   What it does, in order: wobbles every edge by a few pixels the way a hand does (a low and a high band of noise);
   merges fine detail into strokes (a symmetric-nearest-neighbour filter, which keeps edges); lays brush strokes and
   colour mottling into the mid-tones; pools pigment along edges; shows the canvas weave; lets fire, windows and sky bloom
   (two blurred levels of the bright parts); grades it (cool shadows, warm lights, a gentle S-curve); darkens the corners.
   Titles, the chapter card and the subtitles are drawn after it and stay crisp. */
(function () {
  'use strict';
  const K = window.KIT, W = K.W, H = K.H;
  let gl = null, glc = null, failed = false, P = {}, T = {}, F = {}, quad = null;

  const VERT = `#version 300 es
  in vec2 aPos; out vec2 vUv;
  void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

  // the bright parts of the frame, box-filtered down
  const BRIGHT = `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSrc; uniform vec2 uPx;
  void main() {
    vec3 s = vec3(0.0);
    for (int y = -1; y <= 2; y++) for (int x = -1; x <= 2; x++) s += texture(uSrc, vUv + (vec2(float(x), float(y)) - 0.5) * uPx).rgb;
    s /= 16.0;
    float l = max(max(s.r, s.g), s.b);
    o = vec4(s * smoothstep(0.62, 0.98, l), 1.0);
  }`;

  const BLUR = `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSrc; uniform vec2 uStep;
  void main() {
    vec3 s = texture(uSrc, vUv).rgb * 0.1964825501511404;
    s += (texture(uSrc, vUv + uStep * 1.411764705882353).rgb + texture(uSrc, vUv - uStep * 1.411764705882353).rgb) * 0.2969069646728344;
    s += (texture(uSrc, vUv + uStep * 3.2941176470588234).rgb + texture(uSrc, vUv - uStep * 3.2941176470588234).rgb) * 0.09447039785044732;
    s += (texture(uSrc, vUv + uStep * 5.176470588235294).rgb + texture(uSrc, vUv - uStep * 5.176470588235294).rgb) * 0.010381362401148057;
    o = vec4(s, 1.0);
  }`;

  const FINAL = `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o;
  uniform sampler2D uSrc, uNoise, uStroke, uBloomA, uBloomB;
  uniform vec2 uRes, uShift;
  uniform float uAmount, uWarp, uSmooth, uStrokeAmt, uEdge, uCanvas, uBloom, uGrade, uVignette;
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
  void main() {
    vec2 px = 1.0 / uRes, fc = vUv * uRes;
    vec3 orig = texture(uSrc, vUv).rgb;
    vec4 n1 = texture(uNoise, fc / 512.0 * 0.5 + uShift);
    vec4 n2 = texture(uNoise, fc / 512.0 * 2.1 + uShift.yx * 1.7);
    // the hand: edges wander by a few pixels, more slowly than they wobble
    vec2 wuv = vUv + ((n1.rg - 0.5) * 9.0 + (n2.rg - 0.5) * 2.6) * uWarp * px;
    vec3 c = texture(uSrc, wuv).rgb;
    // strokes: of each pair of opposite neighbours keep the one nearer the centre colour, so detail merges but edges hold
    if (uSmooth > 0.0) {
      vec3 acc = c; float r = 2.6 * uSmooth;
      for (int i = 0; i < 6; i++) {
        float a = float(i) * 0.5235987756 + n2.a * 1.2;
        vec2 d = vec2(cos(a), sin(a)) * (r * (1.0 + 0.6 * float(i % 2))) * px;
        vec3 p = texture(uSrc, wuv + d).rgb, q = texture(uSrc, wuv - d).rgb;
        vec3 dp = p - c, dq = q - c;
        acc += dot(dp, dp) < dot(dq, dq) ? p : q;
      }
      c = acc / 7.0;
    }
    float l = luma(c);
    float mid = smoothstep(0.015, 0.22, l) * (1.0 - 0.75 * smoothstep(0.7, 1.0, l));
    // pigment pools where two strokes meet
    float gx = luma(texture(uSrc, wuv + vec2(px.x * 1.6, 0.0)).rgb) - luma(texture(uSrc, wuv - vec2(px.x * 1.6, 0.0)).rgb);
    float gy = luma(texture(uSrc, wuv + vec2(0.0, px.y * 1.6)).rgb) - luma(texture(uSrc, wuv - vec2(0.0, px.y * 1.6)).rgb);
    float edge = clamp(length(vec2(gx, gy)) * 3.2, 0.0, 1.0);
    c *= 1.0 - edge * 0.26 * uEdge;
    // brush strokes and mottling in the mid-tones
    float st = texture(uStroke, fc / 1024.0 + uShift).r, big = texture(uStroke, fc / 1024.0 * 0.31 + uShift.yx).g;
    c *= 1.0 + ((st - 0.5) * 0.20 + (big - 0.5) * 0.22) * mid * uStrokeAmt;
    float m = n1.a - 0.5;
    c += vec3(m * 0.045, m * 0.012, -m * 0.05) * mid * uStrokeAmt;
    // the canvas shows through, most where the paint is thin and light
    float weave = texture(uNoise, fc / 512.0 * 1.0 + uShift * 3.1).b;
    c *= 1.0 + (weave - 0.5) * 0.11 * uCanvas * smoothstep(0.02, 0.35, l);
    // light blooms
    vec3 b = texture(uBloomA, vUv).rgb * 0.55 + texture(uBloomB, vUv).rgb * 0.85;
    b = clamp(b * uBloom * vec3(1.0, 0.93, 0.84), 0.0, 1.0);
    c = 1.0 - (1.0 - clamp(c, 0.0, 1.0)) * (1.0 - b);
    // the grade: cool shadows, warm lights, a gentle S-curve, a little more colour
    float L = luma(c);
    c = mix(c, c * vec3(0.90, 0.99, 1.12), (1.0 - smoothstep(0.0, 0.42, L)) * 0.45 * uGrade);
    c = mix(c, c * vec3(1.09, 1.01, 0.89), smoothstep(0.40, 1.0, L) * 0.40 * uGrade);
    c = mix(vec3(luma(c)), c, 1.0 + 0.12 * uGrade);
    c = clamp(c, 0.0, 1.0);
    c = mix(c, c * c * (3.0 - 2.0 * c), 0.16 * uGrade);
    c = c * (1.0 - 0.022 * uGrade) + vec3(0.010, 0.013, 0.020) * uGrade;
    vec2 q = vUv - 0.5;
    c *= 1.0 - smoothstep(0.36, 1.0, length(q * vec2(1.0, 1.28))) * 0.34 * uVignette;
    o = vec4(mix(orig, c, uAmount), 1.0);
  }`;

  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function program(fs) {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }
  function texture(w, h, data, repeat) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data || null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  }
  function target(w, h) { const tex = texture(w, h, null, false), fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); return { tex, fb, w, h }; }

  // tileable value noise on a grid that wraps, so the textures repeat without a seam
  function tileNoise(size, cells, seed) {
    const R = K.rng(seed), g = new Float32Array(cells * cells); for (let i = 0; i < g.length; i++) g[i] = R();
    const out = new Float32Array(size * size), sm = x => x * x * (3 - 2 * x);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = x / size * cells, fy = y / size * cells, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
      const a = g[(y0 % cells) * cells + (x0 % cells)], b = g[(y0 % cells) * cells + ((x0 + 1) % cells)], c = g[((y0 + 1) % cells) * cells + (x0 % cells)], d = g[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
      out[y * size + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
    return out;
  }
  function fbmTile(size, cells, seed, oct) { const out = new Float32Array(size * size); let amp = 0.5, norm = 0; for (let o = 0; o < oct; o++) { const n = tileNoise(size, cells << o, seed + o * 31); for (let i = 0; i < out.length; i++) out[i] += n[i] * amp; norm += amp; amp *= 0.5; } for (let i = 0; i < out.length; i++) out[i] /= norm; return out; }

  // R,G: the warp field; B: canvas weave and tooth; A: slow mottling
  function noiseData() {
    const S = 512, r = fbmTile(S, 4, 9101, 3), g = fbmTile(S, 4, 9202, 3), a = fbmTile(S, 3, 9303, 2), tooth = tileNoise(S, 256, 9404), fine = tileNoise(S, 128, 9505);
    const d = new Uint8Array(S * S * 4);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = y * S + x, weave = 0.5 + 0.22 * Math.sin(x * 2 * Math.PI / 4) * 0.5 + 0.22 * Math.sin(y * 2 * Math.PI / 4) * 0.5;
      const b = weave * 0.55 + tooth[i] * 0.25 + fine[i] * 0.20;
      d[i * 4] = Math.round(r[i] * 255); d[i * 4 + 1] = Math.round(g[i] * 255); d[i * 4 + 2] = Math.round(K.clamp(b, 0, 1) * 255); d[i * 4 + 3] = Math.round(a[i] * 255);
    }
    return d;
  }
  // brush strokes painted with the 2D canvas: R fine strokes, G broad ones; drawn nine times over so the tile wraps
  function strokeData() {
    const S = 1024, c = K.canvas(S, S), x = c.getContext('2d'), R = K.rng(9606);
    const layer = (n, len, wid, base, spread, chan) => {
      for (let i = 0; i < n; i++) {
        const px = R() * S, py = R() * S, a = base + (R() - 0.5) * spread, L = len * (0.5 + R()), w = wid * (0.5 + R()), v = Math.round(40 + R() * 175), bend = (R() - 0.5) * 0.5;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const sx = px + ox * S, sy = py + oy * S; if (sx < -L || sx > S + L || sy < -L || sy > S + L) continue;
          x.save(); x.translate(sx, sy); x.rotate(a); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.55;
          const g = x.createLinearGradient(0, -w / 2, 0, w / 2), col = chan === 0 ? `${v},0,0` : `0,${v},0`;
          g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.25, `rgba(${col},1)`); g.addColorStop(0.8, `rgba(${col},0.85)`); g.addColorStop(1, `rgba(${col},0)`);
          x.fillStyle = g; x.beginPath(); x.moveTo(-L / 2, -w / 2); x.quadraticCurveTo(0, -w / 2 + bend * w, L / 2, -w / 2); x.lineTo(L / 2, w / 2); x.quadraticCurveTo(0, w / 2 + bend * w, -L / 2, w / 2); x.closePath(); x.fill();
          x.restore();
        }
      }
    };
    // each channel is painted on its own canvas (source-over within a channel), then the two are merged
    const one = (n, len, wid, base, spread, chan) => { x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.fillStyle = chan === 0 ? 'rgb(128,0,0)' : 'rgb(0,128,0)'; x.fillRect(0, 0, S, S); layer(n, len, wid, base, spread, chan); return x.getImageData(0, 0, S, S).data.slice(); };
    const fine = one(5200, 46, 7, -0.5, 1.1, 0), broad = one(900, 260, 54, -0.35, 0.9, 1), d = new Uint8Array(S * S * 4);
    for (let i = 0; i < S * S; i++) { d[i * 4] = fine[i * 4]; d[i * 4 + 1] = broad[i * 4 + 1]; d[i * 4 + 3] = 255; }
    return d;
  }

  function init() {
    if (gl || failed) return !!gl;
    try {
      glc = K.canvas(W, H);
      gl = glc.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
      if (!gl) throw new Error('no WebGL2');
      P.bright = program(BRIGHT); P.blur = program(BLUR); P.final = program(FINAL);
      quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      T.src = texture(W, H, null, false);
      T.noise = texture(512, 512, noiseData(), true); T.stroke = texture(1024, 1024, strokeData(), true);
      F.a0 = target(W / 4, H / 4); F.a1 = target(W / 4, H / 4); F.b0 = target(W / 8, H / 8); F.b1 = target(W / 8, H / 8);
      gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    } catch (e) { failed = true; gl = null; console.warn('paint: ' + e.message + ' (the film is drawn without the painterly finish)'); }
    return !!gl;
  }
  function pass(prog, fbo, w, h, set) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, w, h); gl.useProgram(prog.p); set(prog.u); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function bind(unit, tex, loc) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc, unit); }

  const DEFAULT = { amount: 1, warp: 1, smooth: 1, stroke: 1, edge: 1, canvas: 1, bloom: 0.6, grade: 1, vignette: 1, shift: 0 };
  K.PAINT_DEFAULT = DEFAULT;
  K.paint = function (ctx, look) {
    const L = Object.assign({}, DEFAULT, look || {});
    if (L.amount <= 0.001 || !init()) return false;
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, T.src); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (L.bloom > 0) {
      pass(P.bright, F.a0.fb, F.a0.w, F.a0.h, u => { bind(0, T.src, u.uSrc); gl.uniform2f(u.uPx, 1 / W, 1 / H); });
      pass(P.blur, F.a1.fb, F.a1.w, F.a1.h, u => { bind(0, F.a0.tex, u.uSrc); gl.uniform2f(u.uStep, 1 / F.a0.w, 0); });
      pass(P.blur, F.a0.fb, F.a0.w, F.a0.h, u => { bind(0, F.a1.tex, u.uSrc); gl.uniform2f(u.uStep, 0, 1 / F.a0.h); });
      pass(P.blur, F.b1.fb, F.b1.w, F.b1.h, u => { bind(0, F.a0.tex, u.uSrc); gl.uniform2f(u.uStep, 1.6 / F.b0.w, 0); });
      pass(P.blur, F.b0.fb, F.b0.w, F.b0.h, u => { bind(0, F.b1.tex, u.uSrc); gl.uniform2f(u.uStep, 0, 1.6 / F.b0.h); });
    }
    pass(P.final, null, W, H, u => {
      bind(0, T.src, u.uSrc); bind(1, T.noise, u.uNoise); bind(2, T.stroke, u.uStroke); bind(3, F.a0.tex, u.uBloomA); bind(4, F.b0.tex, u.uBloomB);
      gl.uniform2f(u.uRes, W, H); gl.uniform2f(u.uShift, (L.shift * 0.37) % 1, (L.shift * 0.61) % 1);
      gl.uniform1f(u.uAmount, L.amount); gl.uniform1f(u.uWarp, L.warp); gl.uniform1f(u.uSmooth, L.smooth); gl.uniform1f(u.uStrokeAmt, L.stroke);
      gl.uniform1f(u.uEdge, L.edge); gl.uniform1f(u.uCanvas, L.canvas); gl.uniform1f(u.uBloom, L.bloom); gl.uniform1f(u.uGrade, L.grade); gl.uniform1f(u.uVignette, L.vignette);
    });
    gl.flush();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'copy'; ctx.filter = 'none'; ctx.drawImage(glc, 0, 0); ctx.restore();
    return true;
  };
})();
