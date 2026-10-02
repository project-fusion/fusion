import type { GraphStencil } from '@fusion.dev/helix-graph'
import { inflate, shapeFromPath } from '@fusion.dev/helix-graph/shapes'

/**
 * The shape an example draws its notes in, drawn as an SVG inside the frame
 * and marked `data-preview-graph-stencil`: its `viewBox` is the stencil's box
 * and its path the shape. `connectGraph`'s `stencil` option written as markup,
 * which is what an example can carry.
 *
 * `data-preview-graph-depth` puffs the outline into a solid that deep, as
 * `inflate` does, and `data-preview-graph-place` is the stencil's `place`.
 */
export const stencilOf = (frame: HTMLElement): GraphStencil | undefined => {
  const drawing = frame.querySelector<SVGSVGElement>('svg[data-preview-graph-stencil]')
  const path = drawing?.querySelector('path')?.getAttribute('d')
  const [, , width = 0, height = 0] =
    drawing
      ?.getAttribute('viewBox')
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? []
  if (!drawing || !path || width <= 0 || height <= 0) {
    return undefined
  }
  const depth = Number(drawing.dataset.previewGraphDepth)
  const place = drawing.dataset.previewGraphPlace === 'surface' ? 'surface' : 'fill'
  if (Number.isFinite(depth) && depth > 0) {
    return { ...inflate(shapeFromPath(path, width, height), { depth }), place }
  }
  return { height, path, place, width }
}
