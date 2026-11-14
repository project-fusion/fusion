/**
 * Aura's drawing, as numbers and as a program: the shapes and interactions the
 * shader branches on, the shader itself, the palette read off the canvas's
 * colors, the axis, and the field's clock and pointer. The web element runs
 * the shader in WebGL, and a phone runs the same shader through its GPU
 * drawing, as `auraSkSL` gives it, so both draw one field.
 */
import { FRAGMENT } from './shader.js'

export * from './axis.js'
export * from './field.js'
export * from './palette.js'
export * from './shader.js'

/**
 * The fragment shader as a Skia runtime effect takes it.
 *
 * **One program, written once.** SkSL reads GLSL's types and functions, so
 * the web's program needs only its frame changed: no version or precision
 * line, no `in` or `out`, and a `main` that takes the pixel's coordinates and
 * returns its color. A runtime effect's coordinates start at the top, where
 * WebGL's `uv` starts at the bottom, so `uv` is flipped as it is made.
 */
export const auraSkSL = (): string =>
  FRAGMENT.replace('#version 300 es', '')
    .replace('precision highp float;', '')
    .replace('in vec2 uv;', '')
    .replace('out vec4 color;', '')
    .replace(
      'void main() {',
      'vec4 main(vec2 fragCoord) {\n    vec2 uv = vec2(fragCoord.x, uResolution.y - fragCoord.y) / uResolution;',
    )
    .replace('hash(gl_FragCoord.xy)', 'hash(fragCoord)')
    .replace('color = vec4(rgb + dither, 1.0);', 'return vec4(rgb + dither, 1.0);')
