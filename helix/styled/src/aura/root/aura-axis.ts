/**
 * Where the axis leaves the top edge, and the tilt that puts it there.
 *
 * **Two functions, and the pair is the point.** `exitOf` is a model of what the
 * shader does; `tiltFor` is the solve a consumer's `terminus` goes through. One
 * is the inverse of the other, so a spec can go round the loop and catch either
 * one moving without the other. Nothing else can: `bearing` is private, its
 * output is a uniform, and what that uniform does is a WebGL draw.
 *
 * That guard is the whole reason this file exists. `terminus` was wrong twice
 * while its docstring said otherwise, the arithmetic living inside a getter
 * beside a sentence describing different arithmetic with nothing comparing the
 * two. See (155).
 *
 * **`exitOf` mirrors the shader step by step rather than stating the closed
 * form**, which is deliberate and is what makes the round trip worth running.
 * A closed form checked against its own algebra proves only that the algebra
 * was inverted correctly. Written as the same three operations `main()`
 * performs, in the same order, it is a claim about `aura-shader.ts`, and the
 * day someone changes how that file handles the aspect this stops agreeing.
 */

/** Degrees to radians, which both directions need. */
const RADIANS = Math.PI / 180

/**
 * Where the shader's axis crosses the top edge, as a fraction of the width.
 *
 * Follows `main()` in `aura-shader.ts`:
 *
 * 1. `p.x *= aspect` stretches the frame before anything rotates, so the tilt
 *    the rotation takes is a slope in the stretched frame rather than on
 *    screen.
 * 2. `float a = atan(sin(want), cos(want) * aspect)` is the angle it actually
 *    turns by, which is the asked-for screen angle converted into that frame.
 * 3. `mat2 turn = mat2(cos(a), sin(a), -sin(a), cos(a))` rotates, and the axis
 *    is the line the rotated x is zero on: `cos(a) * x - sin(a) * y = 0`.
 *
 * At the top edge `y` is 1, so the crossing is at `x = tan(a)` in the stretched
 * frame, and dividing the stretch back out puts it on screen. The aspect is
 * therefore paid twice, once going into the rotation and once coming out, which
 * is why it appears squared when the three steps are collapsed.
 *
 * @param tilt - The angle handed to the shader, in degrees.
 * @param aspect - The box's width over its height.
 * @returns The crossing, `0` at the left edge and `1` at the right.
 */
export const exitOf = (tilt: number, aspect: number): number => {
  const want = tilt * RADIANS
  const turned = Math.atan2(Math.sin(want), Math.cos(want) * aspect)
  const stretched = Math.tan(turned)
  return (stretched / aspect + 1) / 2
}

/**
 * The tilt, in degrees, whose axis crosses the top edge at `terminus`.
 *
 * The inverse of `exitOf`, solved rather than fitted: collapsing its three
 * steps gives `terminus = 0.5 + tan(tilt) / (2 * aspect^2)`, and rearranging
 * for the tilt gives what is below.
 *
 * The contract `terminus` claims: `0` is the left edge, `0.5` the middle and
 * `1` the right edge, in every box.
 *
 * @param terminus - The crossing wanted, as a fraction of the width.
 * @param aspect - The box's width over its height.
 * @returns The tilt to hand the shader, in degrees.
 */
export const tiltFor = (terminus: number, aspect: number): number =>
  Math.atan(2 * (terminus - 0.5) * aspect * aspect) / RADIANS
