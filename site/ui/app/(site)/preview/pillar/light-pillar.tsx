'use client'

import { useEffect, useRef } from 'react'

/**
 * A volumetric shaft of light, drawn as one fragment shader.
 *
 * **Raw WebGL2, and deliberately no Three.js.** The reference implementation
 * this was modelled on (`reactbits.dev/backgrounds/light-pillar`) imports
 * `three` to draw a single full-screen quad, which is a scene graph, a camera,
 * a material system and a renderer for geometry that has four vertices and
 * never moves. Measured against what it does here that is about 150 kB gzipped
 * of route JavaScript to hand two triangles to the GPU, and it buys nothing:
 * there is no scene, no camera, and no second object to sort against.
 *
 * **The strands braid rather than run straight**, which is the one thing here
 * that is about Fusion rather than about beams in general. Two of them cross at
 * a fixed period, so what a reader sees at rest is a shaft and what they see if
 * they look is a helix. Read straight it is decoration; read once it is the
 * design system the rest of the page is built on. That is the whole of the
 * risk taken, and everything else is kept quiet around it.
 *
 * **Colors are read from the token layer, never written here.** The shader
 * takes them as uniforms, so the background follows a color mode change and a
 * brand hue change with no second copy of the palette to keep in step. The
 * primitives resolve through `getComputedStyle`, which is the only way a shader
 * can see an `oklch()` the browser has already converted.
 */
export function LightPillar(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    /* `antialias: false`, because there is no geometry to alias: every edge in
       here is a gradient the shader computes. Asking for multisampling would
       allocate a second buffer at the size of the screen and resolve it every
       frame to average pixels that are already smooth. */
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
      stencil: false,
    })
    if (!gl) {
      return
    }

    const vertex = `#version 300 es
      /* No vertex buffer. Three vertices derived from gl_VertexID cover the
         screen with one triangle, which needs no attribute, no buffer and no
         upload, and rasterizes with no seam down the diagonal that two
         triangles have. */
      out vec2 uv;
      void main() {
        vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
        uv = p;
        gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
      }
    `

    const fragment = `#version 300 es
      precision highp float;

      in vec2 uv;
      out vec4 color;

      uniform vec2 uResolution;
      uniform float uTime;
      uniform vec3 uNear;
      uniform vec3 uFar;

      /* Value noise. Cheaper than gradient noise and indistinguishable once it
         is folded four times and used to modulate a light rather than to
         displace a surface. */
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          sum += amp * noise(p);
          p *= 2.02;
          amp *= 0.5;
        }
        return sum;
      }

      void main() {
        vec2 p = (uv * 2.0 - 1.0);
        p.x *= uResolution.x / max(uResolution.y, 1.0);

        /* Tilted, so the shaft is a diagonal rather than a column. A vertical
           beam behind left-aligned text reads as a divider between the words
           and the space beside them. */
        float a = radians(14.0);
        vec2 q = vec2(p.x * cos(a) - p.y * sin(a), p.x * sin(a) + p.y * cos(a));

        float t = uTime * 0.06;

        /* The braid. Two strands out of phase by half a turn, so they cross
           twice per period, and the shaft is the sum of their glows plus the
           volume they sit in. */
        float lit = 0.0;
        for (int i = 0; i < 2; i++) {
          float phase = float(i) * 3.14159265;
          float x = q.x - 0.34 * sin(q.y * 1.6 + t * 1.4 + phase);
          lit += 0.8 * exp(-abs(x) * 13.0);
        }

        /* The volume, wider and far softer, which is what stops the strands
           reading as two drawn lines. */
        float volume = exp(-abs(q.x) * 2.6);

        /* Filaments drifting up the shaft. Scrolling against the braid rather
           than with it, so nothing in here has a period a reader can count. */
        float grain = fbm(vec2(q.x * 2.4, q.y * 1.1 - t * 2.2));
        float body = (lit + volume * 0.42) * mix(0.45, 1.5, grain);

        /* Fades out at both ends rather than meeting the edge of its own
           canvas, which is the tell that a background is a rectangle. */
        body *= smoothstep(-1.35, 0.15, q.y) * smoothstep(1.05, -0.25, q.y);
        body *= mix(0.65, 1.35, smoothstep(-1.0, 1.0, q.y));

        vec3 rgb = mix(uFar, uNear, clamp(body, 0.0, 1.0)) * clamp(body, 0.0, 1.0);

        /* Dither before the buffer quantizes. A shaft this soft spans a few
           hundred 8-bit steps across a whole screen, and without a sub-step of
           noise the falloff paints as visible rings. */
        float d = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        color = vec4(rgb + d, clamp(body, 0.0, 1.0) * 0.9 + d);
      }
    `

    const compile = (type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type)
      if (!shader) {
        return null
      }
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    const vs = compile(gl.VERTEX_SHADER, vertex)
    const fs = compile(gl.FRAGMENT_SHADER, fragment)
    const program = vs && fs ? gl.createProgram() : null
    if (!vs || !fs || !program) {
      return
    }
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    /* Bound rather than called, because `useHookAtTopLevel` matches on the
       `use*` name and cannot tell a WebGL context from a component. Same
       workaround as `ocean-world.tsx`. */
    const applyProgram = gl.useProgram.bind(gl)
    applyProgram(program)

    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uNear = gl.getUniformLocation(program, 'uNear')
    const uFar = gl.getUniformLocation(program, 'uFar')

    /* The token layer's answer, whatever it currently is. `getComputedStyle`
       on a probe is the only way to read an `oklch()` as the sRGB the shader
       needs: the custom property's own value is the unresolved function text. */
    const probe = document.createElement('span')
    probe.style.display = 'none'
    document.body.appendChild(probe)

    const readColor = (token: string, fallback: [number, number, number]) => {
      probe.style.color = `var(${token})`
      const match = getComputedStyle(probe).color.match(/[\d.]+/g)
      if (!match || match.length < 3) {
        return fallback
      }
      return [Number(match[0]) / 255, Number(match[1]) / 255, Number(match[2]) / 255] as [
        number,
        number,
        number,
      ]
    }

    const applyColors = () => {
      gl.uniform3fv(uNear, readColor('--helix-color-primary-subtle', [0.72, 0.79, 1]))
      gl.uniform3fv(uFar, readColor('--helix-color-primary', [0.24, 0.36, 0.9]))
    }
    applyColors()

    /* The document's color mode is an attribute, so the palette changing is an
       attribute changing. Nothing else announces it. */
    const modes = new MutationObserver(applyColors)
    modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    let width = 0
    let height = 0
    const resize = () => {
      /* Capped at 2, and scaled to two thirds beneath that. Every pixel here
         runs four octaves of noise, and a 6K display at its native ratio is
         four times the work of one at 2 for a gradient nobody can resolve. */
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.66
      const next = [Math.round(canvas.clientWidth * dpr), Math.round(canvas.clientHeight * dpr)]
      if (next[0] === width && next[1] === height) {
        return
      }
      ;[width, height] = next as [number, number]
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
      gl.uniform2f(uResolution, width, height)
    }

    const draw = (seconds: number) => {
      gl.uniform1f(uTime, seconds)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let frame = 0
    let start = 0
    const loop = (now: number) => {
      if (!start) {
        start = now
      }
      resize()
      draw((now - start) / 1000)
      frame = requestAnimationFrame(loop)
    }

    /* Off-screen and backgrounded are both "nobody is looking", and a shader
       that keeps running through either is the difference between an
       atmosphere and a battery complaint. */
    const stop = () => {
      if (frame) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }
    const play = () => {
      if (!frame && !motion.matches && !document.hidden) {
        frame = requestAnimationFrame(loop)
      }
    }

    const visible = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        play()
      } else {
        stop()
      }
    })
    visible.observe(canvas)

    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        play()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    /* One frame, still, for a reader who has asked for no motion. The shaft is
       the composition rather than the animation, so the right answer is the
       picture without the drift, not an empty box. */
    resize()
    draw(0)
    play()

    const onResize = () => {
      resize()
      if (motion.matches) {
        draw(0)
      }
    }
    window.addEventListener('resize', onResize)

    return () => {
      stop()
      visible.disconnect()
      modes.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      probe.remove()
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pillarCanvasFrame">
      <canvas className="pillarCanvas" ref={canvasRef} />
    </div>
  )
}
