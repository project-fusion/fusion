/**
 * A vector's canvas, a layer of its own: `react-native-svg` draws a whole
 * canvas again when any shape in it changes, so the canvas is drawn again only
 * when its box or a shape it draws changes, and a mark laid over it moves with
 * no new canvas. Its gradients go in its `Defs`.
 */

import { memo, type ReactNode } from 'react'
import { svg } from './vector'

/** What a vector's canvas draws: its box and its shapes, drawn again only when either changes. */
interface CanvasProps {
  readonly aspect: string | undefined
  readonly height: number | string
  readonly shapes: readonly ReactNode[]
  readonly viewBox: string
}

/**
 * The words of what a canvas draws, which say whether it changed: each shape's
 * kind, key, and props, its stops among them.
 */
const signature = (shapes: readonly ReactNode[]): string =>
  JSON.stringify(shapes, (name, value) => (name.startsWith('_') ? undefined : value))

/**
 * A vector's canvas, which React draws again only when its box or a shape it
 * draws changes, so a mark laid over it can move with no new canvas.
 */
export const Canvas = memo(
  ({ aspect, height, shapes, viewBox }: CanvasProps) => {
    const { Defs, Svg: Drawing } = svg()
    const paints = shapes.filter((one) => isGradient(one))
    const rest = shapes.filter((one) => !isGradient(one))
    return (
      <Drawing height={height} preserveAspectRatio={aspect} viewBox={viewBox} width="100%">
        {paints.length === 0 ? null : <Defs>{paints}</Defs>}
        {rest}
      </Drawing>
    )
  },
  (before, after) =>
    before.aspect === after.aspect &&
    before.height === after.height &&
    before.viewBox === after.viewBox &&
    signature(before.shapes) === signature(after.shapes),
)

/** Whether a drawn shape is a gradient, a paint that goes in the canvas's `Defs`. */
const isGradient = (shape: ReactNode): boolean =>
  typeof shape === 'object' &&
  shape !== null &&
  'type' in shape &&
  shape.type === (svg().LinearGradient as unknown)
