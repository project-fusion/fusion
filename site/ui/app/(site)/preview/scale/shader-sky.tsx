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

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uResolution;

  /* Where the light is. Low at rest, rising and widening as the page moves. */
  vec2 sun = vec2(0.5, -0.14 + uScroll * 0.62);
  float spread = mix(0.52, 0.88, uScroll);

  /* Aspect-corrected so the glow is a circle on a wide screen rather than an
     ellipse stretched with the window. */
  vec2 d = (uv - sun) * vec2(uResolution.x / uResolution.y, 1.0);
  float r = length(d) / spread;
  float glow = exp(-r * r * 1.55);

  /* The lattice, at four times the spacing pitch, drifting slowly. */
  float pitch = 64.0;
  vec2 cell = fract((px + vec2(uTime * 4.0, uTime * -2.0)) / pitch) - 0.5;
  float dot = 1.0 - smoothstep(0.035, 0.075, length(cell));

  /* A dot is lit by how close it is to the sun, so the field reads as one
     light source rather than as a texture with a gradient laid over it. */
  float lit = dot * (0.16 + glow * 2.0);

  float alpha = clamp(glow * 0.8 + lit, 0.0, 1.0);
  outColor = vec4(uColor * (0.42 + glow * 0.85), alpha);
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
    const start = performance.now()

    const draw = () => {
      size()
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      gl.uniform1f(uScroll, max > 0 ? Math.min(window.scrollY / max, 1) : 0)
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
