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
 * **Why the light is blue.** A sunset is warm because a low sun sends its beam
 * through a long slant of atmosphere and Rayleigh scattering takes the short
 * wavelengths out. Blue hour is the opposite case: with the sun a few degrees
 * under the horizon the direct beam is gone and what is left is high-atmosphere
 * scattered light, which is almost entirely blue. It is the one condition where
 * this palette is the physically honest one.
 *
 * **Why the disc is flattened and cut.** Refraction near the horizon lifts the
 * lower limb further than the upper, so a rising sun is measurably wider than
 * tall. And the ground is in front of it: it rises from behind the line.
 *
 * **What stops it looking cheap**, which was four separate things:
 *
 * - **Banding.** Wide smooth gradients quantised to eight bits step visibly.
 *   Every output gets a sub-LSB dither, which trades a step for noise the eye
 *   does not resolve.
 * - **Aliasing.** A rail a fraction of a pixel wide either lands on the pixel
 *   or misses it, and crawls as the camera moves. Coverage is computed against
 *   the derivative and the line is allowed to go dim rather than thin once it
 *   is under a pixel, which is what film does and what a hard threshold cannot.
 * - **Flat tone.** One colour scaled by a number reads as plastic. The ground,
 *   the air and the limb of the sun are three different tones now.
 * - **No grain.** A perfectly clean render looks synthetic at exactly this kind
 *   of low light. A little runs under everything.
 */

float hash(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
float hash2(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv - 0.5;
  p.x *= uResolution.x / uResolution.y;

  float horizon = -0.13;
  float height = 0.030 * pow(0.20 / 0.030, uScroll);

  float sunY = horizon - mix(0.030, 0.004, uScroll);
  vec2 toSun = vec2(p.x, (p.y - sunY) * 1.45);
  float sd = length(toSun);

  /* A softer limb. A hard cut reads as a sticker; a real disc at this altitude
     is eaten into by the air around it. */
  float disc = 1.0 - smoothstep(0.070, 0.085, sd);
  float halo = exp(-sd * sd * 18.0);
  float glare = exp(-sd * sd * 90.0);

  vec3 col = vec3(0.0);
  float alpha = 0.0;

  if (p.y > horizon) {
    /* The sky is not black. Scattered light thins with height, which is a
       falloff rather than a cut, and it is what the plain fades into. */
    float above = p.y - horizon;
    float sky = exp(-above * 6.5);
    float lift = halo * 0.85 + sky * 0.20;

    /* Three tones: the air, the halo, and the limb. The limb is the only warm
       thing and it goes toward white rather than to a hue of its own. */
    vec3 air = uColor * 0.72;
    vec3 lit = mix(uColor * 1.1, vec3(1.0, 0.95, 0.88), disc * 0.6 + glare * 0.35);
    col = mix(air, lit, clamp(disc + glare * 0.7, 0.0, 1.0));
    alpha = clamp(lift + disc, 0.0, 1.0);
  } else {
    float depth = height / (horizon - p.y);

    /* Rails bow outward with distance rather than running dead straight at the
       vanishing point. Dividing the across coordinate by a term that grows with
       depth spreads the lanes apart the further out they go, so the plain reads
       as a landscape sweeping away instead of as a road. */
    float across = p.x * depth * 1.7 / (1.0 + 0.62 * depth);

    const float GRID = 9.0;
    float lane = across * GRID;
    float id = floor(lane);

    /* Coverage, not a threshold. Under a pixel wide a rail is allowed to dim
       instead of thinning, which is what stops it crawling between pixels. */
    float w = fwidth(lane);
    float rail = (1.0 - smoothstep(0.0, w * 1.4 + 0.010, abs(fract(lane) - 0.5)))
      * clamp(1.0 / max(w * 3.4, 1.0), 0.10, 1.0);

    float phase = hash(id);
    float speed = 0.55 + hash(id + 5.0) * 0.75;
    float t = fract(depth * 1.15 - uTime * speed * 0.28 + phase);
    float streak = pow(t, 3.5);

    /* Two terms. Near haze lifts the foreground off pure black; extinction
       takes the distance. One exponential cannot do both. */
    float extinction = exp(-depth * 0.78);
    float haze = 1.0 - exp(-depth * 2.4);
    float toward = exp(-abs(p.x) * 1.05);

    float ink = rail * (0.14 + streak * 2.1) * extinction * (0.7 + toward * 0.7);

    /* The same value the sky carries at the line, so the two meet instead of
       stepping. Before, the ground's haze was scaled by distance from centre
       and the sky's was not, which left a bright band running along the horizon
       out to both edges: the sky sat near 0.2 and the ground under 0.03. */
    float airGlow = halo * 0.85 + 0.20;
    float air = haze * airGlow;

    /* The ground is cooler than the sky and the streaks are warmer than the
       ground, so the plain has a range rather than one value times a scalar. */
    vec3 ground = uColor * vec3(0.82, 0.92, 1.06);
    col = mix(ground * (0.6 + toward * 0.4), mix(uColor, vec3(1.0), 0.35), streak * 0.75);
    alpha = clamp(ink + air, 0.0, 1.0);
  }

  /* A little fall-off at the corners, so the frame has a centre. */
  alpha *= 1.0 - 0.30 * dot(p, p);

  /* Grain under everything, and a sub-LSB dither over it. The first stops the
     render looking synthetic at this light level; the second is what keeps a
     wide gradient from stepping. */
  float grain = (hash2(gl_FragCoord.xy + fract(uTime) * 91.7) - 0.5) * 0.030;
  float dither = (hash2(gl_FragCoord.xy * 1.7) - 0.5) * (1.0 / 255.0);
  alpha = clamp(alpha + grain * alpha + dither, 0.0, 1.0);
  col += dither;

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
    /* Undefined until the first frame reads the real position, because the page
       can load already scrolled: starting this at zero makes the camera sweep
       up from the ground to wherever the reader actually is, which is a jump
       nobody asked for and the most visible one on the page. */
    let eased: number | undefined
    let last = performance.now()
    const start = last

    const draw = () => {
      size()
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      /* Eased toward the scroll rather than pinned to it. A camera driven
         one to one with the wheel steps as fast as the wheel does, which is
         what made the climb feel like jumps rather than a move. */
      const target = max > 0 ? Math.min(window.scrollY / max, 1) : 0
      const now = performance.now()
      /* Frame-rate independent: a fixed fraction per frame runs twice as fast
         on a 120 Hz panel as on a 60 Hz one. This is a time constant instead,
         so the camera takes the same quarter second everywhere. */
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      eased = eased === undefined ? target : eased + (target - eased) * (1 - Math.exp(-dt / 0.25))
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
