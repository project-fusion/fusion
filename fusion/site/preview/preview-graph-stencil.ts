import type { GraphStencil } from '@fusion.dev/helix-graph'
import { inflate, shapeFromModel, shapeFromPath } from '@fusion.dev/helix-graph/shapes'

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

/**
 * The 3D model an example draws its notes on, named by the frame's
 * `data-preview-graph-model`, read once it has loaded, with
 * `data-preview-graph-place` as the stencil's `place`. Undefined where the
 * frame names none, or the model cannot be read.
 */
export const modelOf = async (frame: HTMLElement): Promise<GraphStencil | undefined> => {
  const url = frame.dataset.previewGraphModel
  if (!url) {
    return undefined
  }
  try {
    const field = await shapeFromModel(url)
    return { ...field, place: frame.dataset.previewGraphPlace === 'surface' ? 'surface' : 'fill' }
  } catch (error) {
    console.error(`The model ${url} could not be read: ${String(error)}`)
    return undefined
  }
}
