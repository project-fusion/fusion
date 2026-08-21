'use client'

import { useEffect, useRef } from 'react'

/**
 * The plates, moving.
 *
 * A raymarched sea blew the Watch piece to white. This draws the photographs
 * themselves and only disturbs them: water travels, the sun breathes, the
 * underside of the surface shifts. No second picture is invented on top.
 *
 * **It is an enhancement.** The still behind the canvas stays if the context
 * fails to start.
 */

/** Length of the Watch piece, in seconds. */
export const FILM_DURATION = 48

/** Frames per second used when the piece is captured to a file. */
export const FILM_FPS = 24

export type OceanShot = 'sea' | 'sun' | 'under'

interface OceanWorldProps {
  /**
   * When set, the clock is frozen and `window.__fusionFilm` is published.
   */
  capture?: boolean
  /**
   * Called each frame with the clock, so the theater can time captions.
   */
  onTime?: (time: number) => void
  /**
   * Which plate to hold. Theater ignores this and cuts on its own clock.
   */
  shot?: OceanShot
  /**
   * When set, the piece is a cut sequence on a 48 second clock.
   */
  theater?: boolean
}

const VERTEX = `#version 300 es
in vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }`

const FRAGMENT = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform sampler2D uSea;
uniform float uShot;
uniform sampler2D uSun;
uniform float uTime;
uniform sampler2D uUnder;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float fbm(vec2 p) {
  float a = 0.5;
  float s = 0.0;
  for (int i = 0; i < 5; i++) {
    s += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return s;
}

vec2 warp(vec2 uv, float t, float amount, vec2 speed) {
  float n = fbm(uv * vec2(14.0, 8.0) + speed * t);
  float m = fbm(uv * vec2(9.0, 12.0) - speed.yx * t);
  return uv + (vec2(n, m) - 0.5) * amount;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec3 col;
  if (uShot < 0.5) {
    float water = smoothstep(0.62, 0.44, uv.y);
    vec2 wuv = warp(uv, uTime, mix(0.003, 0.016, water), vec2(0.12, 0.55));
    col = texture(uSea, clamp(wuv, 0.0, 1.0)).rgb;
  } else if (uShot < 1.5) {
    vec2 wuv = warp(uv, uTime, 0.006, vec2(0.07, 0.05));
    col = texture(uSun, clamp(wuv, 0.0, 1.0)).rgb;
  } else {
    vec2 wuv = warp(uv, uTime, 0.018, vec2(0.18, 0.38));
    col = texture(uUnder, clamp(wuv, 0.0, 1.0)).rgb;
  }
  float g = hash(gl_FragCoord.xy + vec2(uTime * 11.0, 0.0));
  col += (g - 0.5) * 0.018;
  outColor = vec4(col, 1.0);
}
`

const shotIndex = (shot: OceanShot) => {
  if (shot === 'sun') {
    return 1
  }
  if (shot === 'under') {
    return 2
  }
  return 0
}

const theaterAt = (time: number): OceanShot => {
  if (time < 16) {
    return 'sea'
  }
  if (time < 32) {
    return 'sun'
  }
  return 'under'
}

const compile = (
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) => {
  const shader = gl.createShader(type)
  if (!shader) {
    return null
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    canvas.dataset.shaderError = gl.getShaderInfoLog(shader) ?? 'compile'
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/**
 * Full-bleed live plate. The photograph stays the photograph.
 */
export function OceanWorld({
  capture = false,
  onTime,
  shot = 'sea',
  theater = false,
}: OceanWorldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onTimeRef = useRef(onTime)
  const shotRef = useRef(shot)
  onTimeRef.current = onTime
  shotRef.current = shot

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
    })
    if (!gl) {
      return
    }

    const vert = compile(canvas, gl, gl.VERTEX_SHADER, VERTEX)
    const frag = compile(canvas, gl, gl.FRAGMENT_SHADER, FRAGMENT)
    if (!vert || !frag) {
      return
    }
    const program = gl.createProgram()
    if (!program) {
      return
    }
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.bindAttribLocation(program, 0, 'pos')
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.shaderError = gl.getProgramInfoLog(program) ?? 'link'
      return
    }
    const applyProgram = gl.useProgram.bind(gl)
    applyProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

    const loc = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      sea: gl.getUniformLocation(program, 'uSea'),
      shot: gl.getUniformLocation(program, 'uShot'),
      sun: gl.getUniformLocation(program, 'uSun'),
      time: gl.getUniformLocation(program, 'uTime'),
      under: gl.getUniformLocation(program, 'uUnder'),
    }

    const makeTexture = () => {
      const texture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([8, 8, 12, 255]),
      )
      return texture
    }

    const seaTex = makeTexture()
    const sunTex = makeTexture()
    const underTex = makeTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, seaTex)
    gl.uniform1i(loc.sea, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, sunTex)
    gl.uniform1i(loc.sun, 1)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, underTex)
    gl.uniform1i(loc.under, 2)

    let time = 0
    let frame = 0
    let last = performance.now()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const fit = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      const width = Math.max(1, Math.round(rect.width * ratio))
      const height = Math.max(1, Math.round(rect.height * ratio))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    const paint = () => {
      fit()
      const nextShot = theater ? theaterAt(time) : shotRef.current
      gl.uniform2f(loc.resolution, canvas.width, canvas.height)
      gl.uniform1f(loc.shot, shotIndex(nextShot))
      gl.uniform1f(loc.time, time)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      onTimeRef.current?.(time)
    }

    const markReady = () => {
      if (!theater) {
        return
      }
      window.__fusionFilm = {
        duration: FILM_DURATION,
        fps: FILM_FPS,
        ready: true,
        seek: async (stamp: number) => {
          time = Math.min(FILM_DURATION, Math.max(0, stamp))
          paint()
          await new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve())
          })
        },
      }
    }

    const units = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2]
    const loadTex = (unit: number, texture: WebGLTexture | null, src: string, done: () => void) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => {
        gl.activeTexture(units[unit] ?? gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
        done()
      }
      image.onerror = () => done()
      image.src = src
    }

    let loaded = 0
    const oneLoaded = () => {
      loaded += 1
      if (loaded >= 3) {
        markReady()
      }
    }
    loadTex(0, seaTex, '/media/scale/ocean-sun.jpg', oneLoaded)
    loadTex(1, sunTex, '/media/scale/sun.jpg', oneLoaded)
    loadTex(2, underTex, '/media/scale/seawater.jpg', oneLoaded)

    let visible = true
    const tick = (now: number) => {
      if (!visible && !capture) {
        frame = 0
        return
      }
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!capture && !reduced) {
        if (theater) {
          time = (time + delta) % FILM_DURATION
        } else {
          time += delta
        }
      }
      paint()
      frame = window.requestAnimationFrame(tick)
    }

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries.some((entry) => entry.isIntersecting)
        if (visible && frame === 0 && !capture) {
          last = performance.now()
          frame = window.requestAnimationFrame(tick)
        }
      },
      { threshold: 0.08 },
    )
    io.observe(canvas)

    paint()
    if (!capture) {
      frame = window.requestAnimationFrame(tick)
    }

    return () => {
      io.disconnect()
      window.cancelAnimationFrame(frame)
      if (theater && window.__fusionFilm) {
        delete window.__fusionFilm
      }
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteBuffer(buffer)
      gl.deleteTexture(seaTex)
      gl.deleteTexture(sunTex)
      gl.deleteTexture(underTex)
    }
  }, [capture, theater])

  return (
    <canvas className="scLive" data-film={theater ? '' : undefined} data-shader ref={canvasRef} />
  )
}

declare global {
  interface Window {
    __fusionFilm?: {
      duration: number
      fps: number
      ready: boolean
      seek: (time: number) => Promise<void>
    }
  }
}
