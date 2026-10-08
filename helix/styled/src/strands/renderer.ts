import type { StrandsPalette } from './palette.js'
import {
  BLUR_FRAGMENT,
  COMPOSITE_FRAGMENT,
  DOWN_FRAGMENT,
  DUST_FRAGMENT,
  DUST_VERTEX,
  LINE_FRAGMENT,
  LINE_VERTEX,
  QUAD_VERTEX,
} from './shader.js'

/** The most strands a ribbon draws, at `density` 1. */
export const MAX_STRANDS = 340

/** The fewest, at `density` 0. Fewer stops reading as a ribbon at all. */
export const MIN_STRANDS = 60

/** Segments along each strand, across whatever stretch of the path is on screen. */
const SEGMENTS = 320

/** Specks of dust around the strands. */
const DUST = 600

/** What one frame needs, all of it already resolved by the element. */
export interface StrandsFrame {
  /** How much the glow around the strands adds, as a multiplier. */
  bloom: number
  /** How far apart the brightest and dimmest strands are, from `0` to `1`. */
  contrast: number
  /** How many of the path's points are in use. */
  count: number
  /** How much nearness shows, from `0`, flat, to `1`. */
  depth: number
  /** How differently each strand moves, from `0`, as one, to `1`. */
  drift: number
  /** The device pixels per CSS pixel the buffer was sized at. */
  dpr: number
  /** Overall brightness. */
  gain: number
  /** The path, four floats a point, padded to the uniform array's length. */
  points: Float32Array
  /** The stretch of the path on screen, as a range of its parameter. */
  range: readonly [number, number]
  /** How far the page is scrolled, in CSS pixels, or `0` inside a box. */
  scroll: number
  /** The share of strands drawn soft, and how soft. */
  softness: number
  /** A multiplier on the ribbon's width. */
  spread: number
  /** How many strands to draw. */
  strands: number
  /** Seconds of motion so far. */
  time: number
  /** The box drawn into, in CSS pixels. */
  view: readonly [number, number]
}

interface Program {
  program: WebGLProgram
  uniforms: Map<string, WebGLUniformLocation>
}

interface Target {
  buffer: WebGLFramebuffer
  height: number
  texture: WebGLTexture
  width: number
}

/**
 * The pipeline, on one context: strands and dust added into a float buffer,
 * two levels of bloom, and the composite over the page color.
 *
 * **Created whole or not at all.** `create` answers `null` when any program
 * fails to link, so the element has one question to ask and one fallback to
 * take, and never draws half a pipeline.
 *
 * **Float buffers where the GPU offers them, and eight bits where it does not.**
 * Light is added strand by strand, and a hot bend sums far past `1`; an eight
 * bit buffer clips it, so there the energy is scaled down on the way in and
 * back up in the composite, which keeps the bend hot at the cost of some
 * gradation in the dimmest strands.
 */
export class StrandsRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly line: Program
  private readonly dust: Program
  private readonly down: Program
  private readonly blur: Program
  private readonly composite: Program
  private readonly ribbon: WebGLVertexArrayObject
  private readonly empty: WebGLVertexArrayObject
  private readonly buffers: WebGLBuffer[]
  private readonly half: boolean
  private readonly scale: number
  private targets: {
    far: Target
    farSwap: Target
    near: Target
    nearSwap: Target
    scene: Target
  } | null = null

  private constructor(
    gl: WebGL2RenderingContext,
    programs: [Program, Program, Program, Program, Program],
  ) {
    this.gl = gl
    ;[this.line, this.dust, this.down, this.blur, this.composite] = programs
    this.half = !!gl.getExtension('EXT_color_buffer_float')
    this.scale = this.half ? 1 : 0.2

    const vertices = new Float32Array((SEGMENTS + 1) * 4)
    for (let s = 0; s <= SEGMENTS; s++) {
      vertices.set([s / SEGMENTS, -1, s / SEGMENTS, 1], s * 4)
    }
    const ids = new Float32Array(MAX_STRANDS)
    for (let i = 0; i < MAX_STRANDS; i++) {
      ids[i] = i
    }
    const vertexBuffer = gl.createBuffer()
    const idBuffer = gl.createBuffer()
    this.buffers = [vertexBuffer, idBuffer]
    this.ribbon = gl.createVertexArray()
    gl.bindVertexArray(this.ribbon)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, idBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, ids, gl.STATIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0)
    gl.vertexAttribDivisor(1, 1)
    this.empty = gl.createVertexArray()
    gl.bindVertexArray(null)
  }

  /**
   * The pipeline on `gl`, or `null` when a program does not link, which the
   * element answers with its gradient.
   */
  static create(gl: WebGL2RenderingContext): StrandsRenderer | null {
    const line = link(gl, LINE_VERTEX, LINE_FRAGMENT)
    const dust = link(gl, DUST_VERTEX, DUST_FRAGMENT)
    const down = link(gl, QUAD_VERTEX, DOWN_FRAGMENT)
    const blur = link(gl, QUAD_VERTEX, BLUR_FRAGMENT)
    const composite = link(gl, QUAD_VERTEX, COMPOSITE_FRAGMENT)
    if (!line || !dust || !down || !blur || !composite) {
      for (const one of [line, dust, down, blur, composite]) {
        if (one) {
          gl.deleteProgram(one.program)
        }
      }
      return null
    }
    return new StrandsRenderer(gl, [line, dust, down, blur, composite])
  }

  /**
   * Sizes the buffers to the drawing buffer. The bloom runs at a quarter and a
   * twelfth of it, which is where a glow's width lives and a twentieth of the
   * fill.
   */
  resize(width: number, height: number): boolean {
    this.release()
    const scene = this.target(width, height)
    const near = this.target(Math.ceil(width / 4), Math.ceil(height / 4))
    const nearSwap = this.target(Math.ceil(width / 4), Math.ceil(height / 4))
    const far = this.target(Math.ceil(width / 12), Math.ceil(height / 12))
    const farSwap = this.target(Math.ceil(width / 12), Math.ceil(height / 12))
    if (!scene || !near || !nearSwap || !far || !farSwap) {
      return false
    }
    this.targets = { far, farSwap, near, nearSwap, scene }
    return true
  }

  render(frame: StrandsFrame, palette: StrandsPalette): void {
    const { gl, targets } = this
    if (!targets) {
      return
    }
    const { scene } = targets
    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.buffer)
    gl.viewport(0, 0, scene.width, scene.height)
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)

    if (frame.range[1] > frame.range[0] && frame.count >= 2) {
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE)
      this.use(this.line, frame)
      this.vec3(this.line, 'uGlow', palette.glow)
      this.vec3(this.line, 'uTint', palette.tint)
      this.vec3(this.line, 'uPeak', palette.peak)
      this.float(this.line, 'uSoftness', frame.softness)
      this.float(this.line, 'uContrast', frame.contrast)
      gl.bindVertexArray(this.ribbon)
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, (SEGMENTS + 1) * 2, frame.strands)

      this.use(this.dust, frame)
      this.vec3(this.dust, 'uGlow', palette.glow)
      this.vec3(this.dust, 'uPeak', palette.peak)
      this.float(this.dust, 'uStrands', frame.strands)
      gl.bindVertexArray(this.empty)
      gl.drawArrays(gl.POINTS, 0, DUST)
      gl.disable(gl.BLEND)
    }

    const { far, farSwap, near, nearSwap } = targets
    this.shrink(scene, near)
    this.smear(near, nearSwap, 1)
    this.smear(near, nearSwap, 2)
    this.shrink(near, far)
    this.smear(far, farSwap, 1)
    this.smear(far, farSwap, 2)

    gl.useProgram(this.composite.program)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    this.texture(this.composite, 'uScene', 0, scene)
    this.texture(this.composite, 'uNear', 1, near)
    this.texture(this.composite, 'uFar', 2, far)
    this.vec3(this.composite, 'uGround', palette.ground)
    this.vec3(this.composite, 'uInk', palette.peak)
    this.float(this.composite, 'uLight', palette.light ? 1 : 0)
    this.float(this.composite, 'uGain', (1.7 * frame.gain) / this.scale)
    this.float(this.composite, 'uBloom', frame.bloom)
    gl.bindVertexArray(this.empty)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  /** Deletes everything made on the context, ahead of losing it. */
  dispose(): void {
    const { gl } = this
    this.release()
    for (const one of [this.line, this.dust, this.down, this.blur, this.composite]) {
      gl.deleteProgram(one.program)
    }
    for (const buffer of this.buffers) {
      gl.deleteBuffer(buffer)
    }
    gl.deleteVertexArray(this.ribbon)
    gl.deleteVertexArray(this.empty)
  }

  private release(): void {
    if (!this.targets) {
      return
    }
    for (const one of Object.values(this.targets)) {
      this.gl.deleteTexture(one.texture)
      this.gl.deleteFramebuffer(one.buffer)
    }
    this.targets = null
  }

  private target(width: number, height: number): Target | null {
    const { gl } = this
    const texture = gl.createTexture()
    const buffer = gl.createFramebuffer()
    gl.bindTexture(gl.TEXTURE_2D, texture)
    if (this.half) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)
    const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    if (!complete) {
      gl.deleteTexture(texture)
      gl.deleteFramebuffer(buffer)
      return null
    }
    return { buffer, height, texture, width }
  }

  /** The uniforms every strand and speck reads. */
  private use(program: Program, frame: StrandsFrame): void {
    const { gl } = this
    gl.useProgram(program.program)
    gl.uniform4fv(program.uniforms.get('uPts') ?? null, frame.points)
    gl.uniform1i(program.uniforms.get('uCount') ?? null, frame.count)
    gl.uniform2f(program.uniforms.get('uView') ?? null, frame.view[0], frame.view[1])
    gl.uniform1f(program.uniforms.get('uScroll') ?? null, frame.scroll)
    gl.uniform2f(program.uniforms.get('uT') ?? null, frame.range[0], frame.range[1])
    gl.uniform1f(program.uniforms.get('uTime') ?? null, frame.time)
    gl.uniform1f(program.uniforms.get('uSpread') ?? null, frame.spread)
    gl.uniform1f(program.uniforms.get('uDepth') ?? null, frame.depth)
    gl.uniform1f(program.uniforms.get('uDrift') ?? null, frame.drift)
    gl.uniform1f(program.uniforms.get('uDpr') ?? null, frame.dpr)
    gl.uniform1f(program.uniforms.get('uScale') ?? null, this.scale)
  }

  private shrink(from: Target, into: Target): void {
    this.pass(this.down, into, () => {
      this.texture(this.down, 'uSource', 0, from)
      this.gl.uniform2f(this.down.uniforms.get('uTexel') ?? null, 1 / from.width, 1 / from.height)
    })
  }

  /** A separable blur of `target`, through `swap` and back. */
  private smear(target: Target, swap: Target, radius: number): void {
    this.pass(this.blur, swap, () => {
      this.texture(this.blur, 'uSource', 0, target)
      this.gl.uniform2f(this.blur.uniforms.get('uStep') ?? null, radius / target.width, 0)
    })
    this.pass(this.blur, target, () => {
      this.texture(this.blur, 'uSource', 0, swap)
      this.gl.uniform2f(this.blur.uniforms.get('uStep') ?? null, 0, radius / swap.height)
    })
  }

  private pass(program: Program, into: Target, bind: () => void): void {
    const { gl } = this
    gl.useProgram(program.program)
    gl.bindFramebuffer(gl.FRAMEBUFFER, into.buffer)
    gl.viewport(0, 0, into.width, into.height)
    bind()
    gl.bindVertexArray(this.empty)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  private texture(program: Program, name: string, unit: number, from: Target): void {
    const { gl } = this
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, from.texture)
    gl.uniform1i(program.uniforms.get(name) ?? null, unit)
  }

  private vec3(program: Program, name: string, value: readonly [number, number, number]): void {
    this.gl.uniform3f(program.uniforms.get(name) ?? null, value[0], value[1], value[2])
  }

  private float(program: Program, name: string, value: number): void {
    this.gl.uniform1f(program.uniforms.get(name) ?? null, value)
  }
}

/**
 * A linked program and where its active uniforms live, or `null`.
 *
 * Locations are read once here, so a frame looks them up in a map rather than
 * asking the driver. An array uniform is listed as `name[0]` and stored under
 * its bare name.
 */
function link(gl: WebGL2RenderingContext, vertex: string, fragment: string): Program | null {
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
    return null
  }
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  gl.deleteShader(vs)
  gl.deleteShader(fs)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
    return null
  }
  const uniforms = new Map<string, WebGLUniformLocation>()
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)
    const at = info ? gl.getUniformLocation(program, info.name) : null
    if (info && at) {
      uniforms.set(info.name.replace('[0]', ''), at)
    }
  }
  return { program, uniforms }
}
