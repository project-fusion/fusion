'use client'

import { useEffect, useRef } from 'react'
import { createTokenReader } from '../../../../lib/token-color'

/** The shapes on the bench, in the order the switcher lists them. */
export const SHAPES = [
  {
    body: 'Two strands half a turn out of phase. A shaft at rest, a helix if you look.',
    name: 'Braid',
  },
  {
    body: 'A fan from a source above the frame, broken into filaments by the same noise.',
    name: 'Rays',
  },
  { body: 'Horizontal curtains, drifting. The one shape here that is a horizon.', name: 'Aurora' },
  { body: 'Concentric rings squashed into perspective, travelling outward.', name: 'Orbit' },
  {
    body: 'Two wave fields crossed, lit only where they agree. A lattice that breathes.',
    name: 'Weave',
  },
] as const

export interface ShapeFieldProps {
  /** Whether the pointer moves the field. */
  interactive: boolean

  /** Which shape to draw, as an index into `SHAPES`. */
  shape: number
}

/**
 * A bench for background shapes, all five in one program.
 *
 * **One shader with a branch, not five programs.** Switching would otherwise
 * mean compiling and linking on a click, which is the one moment a reader is
 * watching. A branch on a uniform is uniform across the whole draw, so every
 * lane takes the same path and the cost is a jump rather than divergence.
 *
 * **The pointer is smoothed, and the smoothing is frame-rate independent.** A
 * raw pointer makes the field snap, which reads as cheap however good the shape
 * is. Lerping toward the target with a fixed factor per frame instead ties the
 * feel to the refresh rate, so a 120Hz display gets a field twice as eager as a
 * 60Hz one. The exponent is what fixes that.
 *
 * **And it degrades to nothing.** With no pointer the target stays centred and
 * the shapes animate on their own, so a phone gets the same composition without
 * the parallax rather than a still frame. `prefers-reduced-motion` gets the
 * still frame and no pointer response at all.
 */
export function ShapeField({ interactive, shape }: ShapeFieldProps): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const shapeRef = useRef(shape)
  const interactiveRef = useRef(interactive)

  /* A still redraw, published by the effect that owns the context.
     
     The shape reaches the GPU inside `draw`, which only runs from the loop, so
     with the loop stopped a switch changed the heading and left the canvas on
     the previous shape. That is not only this pane: it is every reader who
     asked for no motion, for whom the bench would have exactly one shape. */
  const redrawRef = useRef<(() => void) | null>(null)

  /* Written to refs rather than listed as effect dependencies. A change of
     shape must not tear down a WebGL context and build another one: the whole
     point of one program with a branch is that switching costs a uniform. */
  shapeRef.current = shape
  interactiveRef.current = interactive

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
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
      uniform int uShape;
      uniform vec2 uPointer;
      uniform float uReach;
      uniform vec3 uGround;
      uniform vec3 uHaze;
      uniform vec3 uGlow;
      uniform vec3 uDeep;
      uniform vec3 uInk;

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

      /* Two strands, half a turn apart, inside a wider volume. */
      float braid(vec2 q, float t) {
        float lit = 0.0;
        for (int i = 0; i < 2; i++) {
          float phase = float(i) * 3.14159265;
          float x = q.x - 0.34 * sin(q.y * 1.6 + t * 1.4 + phase);
          lit += 0.8 * exp(-abs(x) * 13.0);
        }
        float volume = exp(-abs(q.x) * 2.6);
        float streak = fbm(vec2(q.x * 9.0, q.y * 0.55 - t * 2.4));
        float haze = fbm(vec2(q.x * 1.6 + 4.0, q.y * 0.9 - t * 1.1));
        float d = lit * mix(0.35, 1.65, streak) + volume * 0.5 * mix(0.6, 1.25, haze);
        return d * smoothstep(-1.35, 0.15, q.y) * smoothstep(1.05, -0.25, q.y);
      }

      /* A fan from a source above the frame, cut into filaments by angle. */
      float rays(vec2 q, float t) {
        vec2 o = vec2(0.0, 1.45);
        vec2 v = q - o;
        float dist = length(v);
        float ang = atan(v.x, -v.y);
        float fan = fbm(vec2(ang * 8.0, dist * 0.5 - t * 1.8));
        float spread = smoothstep(0.85, 0.05, abs(ang));
        return spread * mix(0.25, 1.5, fan) * exp(-dist * 0.75);
      }

      /* Curtains on a drifting horizon. */
      float aurora(vec2 q, float t) {
        float ridge = (fbm(vec2(q.x * 1.1, t * 0.9)) - 0.5) * 1.1;
        float band = exp(-abs(q.y - ridge) * 3.2);
        float fall = fbm(vec2(q.x * 7.0, q.y * 0.7 - t * 2.6));
        return band * mix(0.3, 1.6, fall);
      }

      /* Rings in perspective, travelling out. */
      float orbit(vec2 q, float t) {
        vec2 e = vec2(q.x, q.y * 2.3);
        float r = length(e);
        float rings = sin(r * 8.0 - t * 5.0) * 0.5 + 0.5;
        float grain = fbm(vec2(atan(e.y, e.x) * 3.0, r * 2.0 - t));
        return pow(rings, 4.0) * mix(0.5, 1.4, grain) * exp(-r * 1.05);
      }

      /* Two wave fields crossed, lit where they agree. */
      float weave(vec2 q, float t) {
        float a = 0.62;
        float u1 = q.x * cos(a) + q.y * sin(a);
        float u2 = q.x * cos(-a) + q.y * sin(-a);
        float w = sin(u1 * 9.0 + t * 2.2) * sin(u2 * 9.0 - t * 1.7);
        float grain = fbm(vec2(q.x * 3.0, q.y * 3.0 - t));
        return pow(max(w, 0.0), 2.2) * mix(0.5, 1.4, grain) * exp(-length(q) * 0.85);
      }

      void main() {
        vec2 p = uv * 2.0 - 1.0;
        p.x *= uResolution.x / max(uResolution.y, 1.0);

        /* Parallax first, so the whole field shifts against the pointer rather
           than the shape deforming toward it. A field that bends looks like it
           is being poked; one that slides looks like it has depth. */
        vec2 q = p - uPointer * 0.16 * uReach;

        float a = radians(14.0);
        q = vec2(q.x * cos(a) - q.y * sin(a), q.x * sin(a) + q.y * cos(a));

        float t = uTime * 0.06;

        float d = 0.0;
        if (uShape == 0) {
          d = braid(q, t);
        } else if (uShape == 1) {
          d = rays(q, t);
        } else if (uShape == 2) {
          d = aurora(q, t);
        } else if (uShape == 3) {
          d = orbit(q, t);
        } else {
          d = weave(q, t);
        }

        /* The pointer lifts what is already there rather than adding a blob of
           its own. A light that follows the cursor over an unlit field is a
           torch, which is a different and much cheaper idea. */
        float near = exp(-length(p - uPointer) * 1.8) * uReach;
        d *= 1.0 + near * 1.1;

        d *= mix(0.65, 1.35, smoothstep(-1.0, 1.0, q.y));
        float lift = clamp(d, 0.0, 1.0);

        vec3 rgb = mix(uGround, uHaze, smoothstep(0.0, 0.16, lift));
        rgb = mix(rgb, uGlow, smoothstep(0.10, 0.46, lift));

        /* Light pages peak on a deep brand blue and dark ones on the
           foreground, and the ground is what says which. Mixing a saturated
           blue toward near-black takes the chroma out of the pixels carrying
           most of it. */
        float lightGround = step(0.5, dot(uGround, vec3(0.2126, 0.7152, 0.0722)));
        vec3 peak = mix(uInk, uDeep, lightGround);
        rgb = mix(rgb, peak, smoothstep(0.40, 0.62, lift) * 0.6);

        float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
        color = vec4(rgb + dither, 1.0);
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
    /* Bound rather than called: `useHookAtTopLevel` matches on the `use*` name
       and cannot tell a WebGL context from a component. */
    const applyProgram = gl.useProgram.bind(gl)
    applyProgram(program)

    const at = (name: string) => gl.getUniformLocation(program, name)
    const uResolution = at('uResolution')
    const uTime = at('uTime')
    const uShape = at('uShape')
    const uPointer = at('uPointer')
    const uReach = at('uReach')

    const tokens = createTokenReader()
    const applyColors = () => {
      gl.uniform3fv(at('uGround'), tokens.read('--helix-color-background', [0, 0, 0]))
      gl.uniform3fv(at('uHaze'), tokens.read('--helix-color-primary-subtle', [0.02, 0.15, 0.34]))
      gl.uniform3fv(at('uGlow'), tokens.read('--helix-color-primary', [0.29, 0.61, 1]))
      gl.uniform3fv(at('uDeep'), tokens.read('--helix-color-primary-active', [0.1, 0.2, 0.55]))
      gl.uniform3fv(at('uInk'), tokens.read('--helix-color-foreground', [1, 1, 1]))
    }
    applyColors()

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

    /* Where the pointer is, and where the field has got to. The gap between
       them is the weight. */
    const target = { reach: 0, x: 0, y: 0 }
    const eased = { reach: 0, x: 0, y: 0 }

    const onPointer = (event: PointerEvent) => {
      if (motion.matches) {
        return
      }
      const box = canvas.getBoundingClientRect()
      const aspect = box.width / Math.max(box.height, 1)
      target.x = ((event.clientX - box.left) / box.width - 0.5) * 2 * aspect
      target.y = -((event.clientY - box.top) / box.height - 0.5) * 2
      target.reach = interactiveRef.current ? 1 : 0
    }
    const onLeave = () => {
      target.reach = 0
    }
    /* Bound to the stage, not to the canvas's own frame. The scrim and the
       words paint over that frame, so a pointer anywhere near the copy is over
       them rather than over it, and the field went dead across the half of the
       screen a reader's cursor actually occupies. */
    const stage = canvas.closest('.shapeStage') ?? canvas.parentElement
    stage?.addEventListener('pointermove', onPointer as EventListener)
    stage?.addEventListener('pointerleave', onLeave)

    let width = 0
    let height = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.66
      const nextWidth = Math.round(canvas.clientWidth * dpr)
      const nextHeight = Math.round(canvas.clientHeight * dpr)
      if (nextWidth === width && nextHeight === height) {
        return
      }
      width = nextWidth
      height = nextHeight
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
      gl.uniform2f(uResolution, width, height)
    }

    const draw = (seconds: number) => {
      gl.uniform1f(uTime, seconds)
      gl.uniform1i(uShape, shapeRef.current)
      gl.uniform2f(uPointer, eased.x, eased.y)
      gl.uniform1f(uReach, eased.reach)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let frame = 0
    let elapsed = 0
    let last = 0
    /* Elapsed time is accumulated across pauses, not measured from a start
       stamp, and that is a fix rather than a preference. `start` was reset on
       every stop, so a reader who switched tabs and came back found the field
       snapped to its opening frame: the shape jumps, which is the one thing a
       background must never do. Measured here as the only way to see it at
       all, since this pane reports `document.hidden` almost continuously and
       runs about four frames per capture. */
    const loop = (now: number) => {
      if (!last) {
        last = now
      }
      /* Clamped, because a tab returning from the background delivers one
         enormous delta and the field would teleport to the pointer. */
      const delta = Math.min((now - last) / 1000, 0.05)
      last = now
      elapsed += delta

      /* Frame-rate independent easing. A fixed factor per frame ties the feel
         to the refresh rate, so a 120Hz display would chase twice as fast. */
      const k = 1 - (1 - 0.12) ** (delta * 60)
      if (!interactiveRef.current) {
        target.reach = 0
      }
      eased.x += (target.x - eased.x) * k
      eased.y += (target.y - eased.y) * k
      eased.reach += (target.reach - eased.reach) * k

      resize()
      draw(elapsed)
      frame = requestAnimationFrame(loop)
    }

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

    redrawRef.current = () => {
      if (!frame) {
        resize()
        draw(elapsed)
      }
    }

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
      stage?.removeEventListener('pointermove', onPointer as EventListener)
      stage?.removeEventListener('pointerleave', onLeave)
      redrawRef.current = null
      tokens.dispose()
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: the ref is the channel, the shape is the trigger
  useEffect(() => {
    redrawRef.current?.()
  }, [shape])

  return (
    <div aria-hidden="true" className="shapeCanvasFrame">
      <canvas className="shapeCanvas" ref={canvasRef} />
    </div>
  )
}
