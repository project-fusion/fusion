'use client'

import { useEffect, useRef } from 'react'
import { createTokenReader } from '../../../../lib/token-color'

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
      /* `preserveDrawingBuffer` is deliberately absent, and is also how this
         gets inspected. Without it the buffer is cleared once the frame is
         presented, so `readPixels` and `drawImage` both answer black and the
         only instrument left is a screenshot, which is exactly the instrument
         that lies about a soft gradient. Turn it on to sample the canvas, take
         the reading, and turn it back off: a full-screen buffer copied every
         frame is real bandwidth to pay forever for a measurement taken once. */
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
      uniform vec3 uGround;
      uniform vec3 uHaze;
      uniform vec3 uGlow;
      uniform vec3 uDeep;
      uniform vec3 uInk;

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
        vec2 p = uv * 2.0 - 1.0;
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

        /* Streaks rather than clouds, and the aspect is the whole of it. The
           same four octaves compressed hard across the shaft and stretched
           along it read as filaments; sampled square they read as haze, which
           is what this was and why it looked like a smear. */
        float streak = fbm(vec2(q.x * 9.0, q.y * 0.55 - t * 2.4));
        float haze = fbm(vec2(q.x * 1.6 + 4.0, q.y * 0.9 - t * 1.1));

        /* The core is what the shaft is seen by: a thin bright axis the streaks
           cut into, sitting inside a much wider bloom. Without it the braid is
           two soft ribbons and reads as a gradient. */
        float core = lit * mix(0.35, 1.65, streak);
        float body = core + volume * 0.5 * mix(0.6, 1.25, haze);

        /* Fades out at both ends rather than meeting the edge of its own
           canvas, which is the tell that a background is a rectangle. */
        body *= smoothstep(-1.35, 0.15, q.y) * smoothstep(1.05, -0.25, q.y);
        body *= mix(0.65, 1.35, smoothstep(-1.0, 1.0, q.y));

        float lift = clamp(body, 0.0, 1.0);

        /* The shader composites against the page rather than blending with it.
         *
         * The CSS blend mode screen was here, and it is why nothing appeared in
         * light mode: screen adds light, and a near-white ground already sits
         * at the top of every channel, so every value it could contribute is a
         * no-op. Branching the blend mode by color mode is not available
         * either, since the mode is a primitive this package may not read and
         * light-dark() takes colors alone.
         *
         * So the ramp is four token stops and the token layer inverts every one
         * of them. Ground is the page, white or black. Haze is
         * primary-subtle, which is brand-50 against white and brand-900
         * against black, so the first thing off the page is already brand
         * rather than a grey. Glow is primary itself. Ink is the foreground,
         * and it lands only on the core.
         *
         * Read down, that is white to pale blue to brand to black in light mode
         * and black to deep blue to brand to white in dark, which is
         * monotonic in lightness both ways and never asks the palette which
         * mode it is in.
         *
         * The ramps overlap and saturate early, which is the fix for a shaft
         * that came out grey. One straight mix from ground to glow leaves most
         * of the bloom near the ground, since most of it sits at a lift of a
         * tenth or two: technically brand-tinted, and read as dark grey. Full
         * brand by a third of the way up means the large soft area is the brand
         * color and only the thin core departs from it. */
        vec3 rgb = mix(uGround, uHaze, smoothstep(0.0, 0.16, lift));
        rgb = mix(rgb, uGlow, smoothstep(0.10, 0.46, lift));
        /* Measured: lift peaks near 0.6, so a ramp starting at 0.6 never fired
           and the brightest pixel on the canvas was the glow token exactly. The
           core has to reach the foreground for the shaft to read as a source
           rather than as a shape, so the ramp starts where the shaft actually
           gets to. */
        /* Where the core goes depends on which way the page runs, and the
           ground is already here to answer it.
           
           Both ends were the foreground token, which is white on black and
           near-black on white. The dark half is right: a light source has a hot
           white axis. The light half is not. Mixing a saturated blue toward
           black takes the chroma out of exactly the pixels that carry the most
           of it, so the strongest part of the shaft came out the greyest, which
           is backwards.
           
           So light mode peaks on primary-active instead, a deep brand blue, and
           the shaft gets more saturated as it intensifies rather than less. No
           new channel is needed to know which mode it is in: the mode is a fact
           about the ground, and the ground is a uniform. Relative luminance
           over a half is a light page. */
        float lightGround = step(0.5, dot(uGround, vec3(0.2126, 0.7152, 0.0722)));
        vec3 peak = mix(uInk, uDeep, lightGround);
        rgb = mix(rgb, peak, smoothstep(0.40, 0.62, lift) * 0.6);

        /* Dither before the buffer quantizes. A shaft this soft spans a few
           hundred 8-bit steps across a whole screen, and without a sub-step of
           noise the falloff paints as visible rings. */
        float d = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        color = vec4(rgb + d, 1.0);
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
    const uGround = gl.getUniformLocation(program, 'uGround')
    const uHaze = gl.getUniformLocation(program, 'uHaze')
    const uGlow = gl.getUniformLocation(program, 'uGlow')
    const uDeep = gl.getUniformLocation(program, 'uDeep')
    const uInk = gl.getUniformLocation(program, 'uInk')

    /* Extracted to `lib/token-color`, because the `lab()` trap it closes is not
       a fact about this shader. Two shaders read the palette now and a third
       will, and a copy of that reasoning in each is a copy that can rot. */
    const tokens = createTokenReader()

    const applyColors = () => {
      gl.uniform3fv(uGround, tokens.read('--helix-color-background', [0, 0, 0]))
      gl.uniform3fv(uHaze, tokens.read('--helix-color-primary-subtle', [0.05, 0.09, 0.28]))
      gl.uniform3fv(uGlow, tokens.read('--helix-color-primary', [0.24, 0.36, 0.9]))
      gl.uniform3fv(uDeep, tokens.read('--helix-color-primary-active', [0.1, 0.2, 0.55]))
      gl.uniform3fv(uInk, tokens.read('--helix-color-foreground', [1, 1, 1]))
    }
    applyColors()

    /* The document's color mode is an attribute, so the palette changing is an
       attribute changing. Nothing else announces it. */
    /* A palette change has to reach the screen even when the loop is not
       running, which is every reader who asked for no motion. */
    const repaint = () => {
      applyColors()
      if (!frame) {
        draw(elapsed)
      }
    }

    const modes = new MutationObserver(repaint)
    modes.observe(document.documentElement, {
      attributeFilter: ['data-color-mode'],
      attributes: true,
    })

    const scheme = window.matchMedia('(prefers-color-scheme: light)')
    scheme.addEventListener('change', repaint)

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
    let elapsed = 0
    let last = 0
    /* Elapsed time accumulates across pauses rather than being measured from a
       start stamp. `start` was reset on every stop, so a reader who switched
       tabs and came back found the shaft snapped to its opening frame, which is
       the one thing a background must never do. */
    const loop = (now: number) => {
      if (!last) {
        last = now
      }
      elapsed += Math.min((now - last) / 1000, 0.05)
      last = now
      resize()
      draw(elapsed)
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
      /* `last` alone is cleared, so the next frame measures no delta against a
         stale stamp. `elapsed` is deliberately kept. */
      last = 0
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
    draw(elapsed)
    play()

    const onResize = () => {
      resize()
      if (motion.matches) {
        draw(elapsed)
      }
    }
    window.addEventListener('resize', onResize)

    return () => {
      stop()
      visible.disconnect()
      modes.disconnect()
      scheme.removeEventListener('change', repaint)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      tokens.dispose()
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
