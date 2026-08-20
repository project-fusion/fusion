'use client'

import { useEffect, useRef } from 'react'

/**
 * The lattice and the sun, rendered on the GPU.
 *
 * **No library.** This is one full-screen fragment shader and about a hundred
 * lines of setup. `three.js` is roughly 150 kB gzipped and would be the largest
 * thing on the page by a wide margin, in a repository that vendors its own
 * fonts rather than depend on a CDN. Raw WebGL costs nothing but the code.
 *
 * **It is an enhancement and never a requirement.** The CSS sky underneath is
 * the real one: if the context fails to create, or the shader fails to compile,
 * this renders nothing and what a reader sees is the gradient that was always
 * there. Nothing on the page depends on it having worked.
 *
 * What it draws that CSS cannot: the lattice dots take their brightness from
 * their distance to the light, so the field lights up around the sun and falls
 * away from it, and the whole thing drifts. The `/helix` hero does a version of
 * this with twenty four hand-placed dots on staggered timers, written out
 * because a random position chosen at render time is a hydration mismatch. A
 * shader has no such problem: nothing here is markup.
 */

const VERTEX = `#version 300 es
in vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }`

/* The sun sits below the fold and rises with the scroll, which is the same
   movement the CSS version makes and the same argument: the same stack at a
   larger scale each time. Dots are drawn on the spacing lattice, so the field
   is the one the rest of the site is measured against rather than a texture. */
const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uScroll;
uniform vec3 uColor;
out vec4 outColor;

/* Blue hour over a plain, and the optics are the reason it looks like this.
 *
 * **Why the light is blue and not orange.** A sunset is warm because a low sun
 * sends its beam through a long slant of atmosphere, Rayleigh scattering strips
 * the short wavelengths, and red is what survives. A blue sun would be wrong.
 * But blue hour is a real condition and the opposite case: once the sun is a few
 * degrees under the horizon the direct beam is gone entirely, what is left is
 * high-atmosphere scattered light, and that light is overwhelmingly blue. It is
 * the one time of day when this palette is the physically honest one, so that is
 * the moment this draws.
 *
 * **Why the disc is flattened and cut.** Refraction near the horizon lifts the
 * lower limb more than the upper one, so a rising sun is visibly wider than it
 * is tall. And the ground is in front of it: it rises from behind the horizon
 * rather than floating over the plain, which is what it did before.
 *
 * **Why the far ground is not black.** Aerial perspective. Distance fades
 * toward the colour of the air, not toward nothing, so the plain washes into
 * the horizon instead of stopping at it.
 */

float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / uResolution.y;

  float horizon = -0.13;
  float height = mix(0.030, 0.20, uScroll);

  /* The disc sits mostly under the line and climbs a little as the camera
     does, so the ladder is also a dawn. 1.45 is the refraction squash. */
  /* Placed so a real cap clears the line at rest and more of it does by the
     last rung. Squashed by 1.45, so the visible half height is the radius over
     that: buried any deeper and there is no sun in the picture at all, which is
     where this sat before. */
  float sunY = horizon - mix(0.030, 0.004, uScroll);
  vec2 toSun = vec2(p.x, (p.y - sunY) * 1.45);
  float sd = length(toSun);

  float disc = 1.0 - smoothstep(0.075, 0.081, sd);
  float halo = exp(-sd * sd * 18.0);
  float sky = exp(-max(p.y - horizon, 0.0) * 7.0);

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (p.y > horizon) {
    /* Sky: the glow above the line, strongest where the light is under it. */
    float lift = halo * 0.85 + sky * 0.16;
    /* Warm only in the last of it, and toward white rather than to a new hue:
       the heat is at the limb, and everything above it stays the brand. */
    col = mix(uColor, vec3(1.0, 0.94, 0.86), disc * 0.55 + halo * halo * 0.25);
    alpha = clamp(lift + disc, 0.0, 1.0);
  } else {
    float depth = height / (horizon - p.y);
    float across = p.x * depth * 1.7;

    const float GRID = 9.0;
    float lane = across * GRID;
    float row = (depth - uTime * 0.16) * GRID;

    float id = floor(lane);
    float own = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 0.5 + hash(id) * 6.2831));
    float lineW = fwidth(lane) * 1.2 + 0.012;
    float lineX = 1.0 - smoothstep(0.0, lineW, abs(fract(lane) - 0.5));
    float rowW = fwidth(row) * 1.2 + 0.02;
    float lineZ = 1.0 - smoothstep(0.0, rowW, abs(fract(row) - 0.5));
    float node = lineX * lineZ;

    float fog = exp(-depth * 1.15);
    float toward = exp(-abs(p.x) * 1.05);

    float ink = (lineX * 0.5 * own + lineZ * 0.16 + node * 0.26) * fog * (0.5 + toward * 0.85);

    /* Aerial perspective: the last of the plain is the air rather than the
       dark, so the two meet instead of one stopping against the other. */
    float air = (1.0 - fog) * (halo * 0.5 + 0.05) * toward;

    col = uColor * (0.62 + toward * 0.45);
    alpha = clamp(ink + air, 0.0, 1.0);
  }

  outColor = vec4(col, alpha);
}`

/** Any CSS colour to linear-ish sRGB, by asking the 2D canvas to convert it. */
const toRgb = (css: string): [number, number, number] => {
  const probe = document.createElement('canvas')
  probe.width = 1
  probe.height = 1
  const ctx = probe.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return [0.35, 0.5, 0.95]
  }
  ctx.fillStyle = css
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [(r ?? 0) / 255, (g ?? 0) / 255, (b ?? 0) / 255]
}

const compile = (gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null => {
  const shader = gl.createShader(type)
  if (!shader) {
    return null
  }
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function ShaderSky() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) {
      return
    }
    const gl = el.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false })
    if (!gl) {
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    const program = vs && fs ? gl.createProgram() : null
    if (!vs || !fs || !program) {
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return
    }
    /* biome-ignore lint/correctness/useHookAtTopLevel: `useProgram` is WebGL's,
       not React's. The rule matches on the `use` prefix and cannot tell a
       context method from a hook. */
    gl.useProgram(program)

    /* One triangle covering the viewport, which is cheaper than two and has no
       seam down the diagonal. */
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const attr = gl.getAttribLocation(program, 'pos')
    gl.enableVertexAttribArray(attr)
    gl.vertexAttribPointer(attr, 2, gl.FLOAT, false, 0, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uScroll = gl.getUniformLocation(program, 'uScroll')
    const uColor = gl.getUniformLocation(program, 'uColor')

    const brand = getComputedStyle(el).getPropertyValue('color').trim()
    gl.uniform3fv(uColor, toRgb(brand || '#4b7bec'))

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')

    const size = () => {
      /* Capped device pixel ratio: this is a background wash, and rendering it
         at 3x on a phone spends a lot of fill rate on something nobody is
         looking directly at. */
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.floor(el.clientWidth * ratio)
      const h = Math.floor(el.clientHeight * ratio)
      if (el.width !== w || el.height !== h) {
        el.width = w
        el.height = h
        gl.viewport(0, 0, w, h)
      }
      gl.uniform2f(uResolution, el.width, el.height)
    }

    let frame = 0
    let eased = 0
    const start = performance.now()

    const draw = () => {
      size()
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      /* Eased toward the scroll rather than pinned to it. A camera driven
         one to one with the wheel steps as fast as the wheel does, which is
         what made the climb feel like jumps rather than a move. */
      const target = max > 0 ? Math.min(window.scrollY / max, 1) : 0
      eased += (target - eased) * 0.06
      gl.uniform1f(uScroll, eased)
      /* Time stops for a reader who asked not to be moved. The sun still
         responds to scrolling, because that is their own gesture rather than
         something happening at them. */
      gl.uniform1f(uTime, still.matches ? 0 : (performance.now() - start) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frame = requestAnimationFrame(draw)
    }
    draw()

    /* Only now does the CSS sky stand down.
     
       The two draw the same thing, so both at once is the glow twice over. The
       flag goes on after the first successful frame rather than on mount, which
       is what makes the fallback the default: every path that leaves this
       effect early, no context, no compile, no link, leaves the attribute unset
       and the gradient showing. */
    const sky = el.parentElement
    sky?.setAttribute('data-shader', '')

    return () => {
      sky?.removeAttribute('data-shader')
      cancelAnimationFrame(frame)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
    }
  }, [])

  /* No `aria-hidden` of its own: `.scSky` above it already carries one and it
     covers the whole subtree. On the canvas itself the linter is right to
     object, since an element that can take focus should not be hidden from the
     tree that would announce it. */
  return <canvas className="scCanvas" ref={canvas} />
}
