import type { GraphStencil } from '@fusion.dev/helix-graph'
import { shapeFromModel } from '@fusion.dev/helix-graph/model'
import { inflate, shapeFromPath } from '@fusion.dev/helix-graph/shapes'

/**
 * The shape an example draws its notes in, drawn as an SVG inside the frame
 * and marked `data-preview-graph-stencil`: its `viewBox` is the stencil's box
 * and its path the shape. `connectGraph`'s `stencil` option written as markup,
 * which is what an example can carry.
 *
 * `data-preview-graph-depth` puffs the outline into a solid that deep, as
 * `inflate` does, and `data-preview-graph-place`, on the drawing or the frame,
 * is the stencil's `place`.
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
  const place = placeOf(drawing.dataset.previewGraphPlace ?? frame.dataset.previewGraphPlace)
  if (Number.isFinite(depth) && depth > 0) {
    return { ...inflate(shapeFromPath(path, width, height), { depth }), place }
  }
  return { height, path, place, width }
}

/** A stencil's `place`, from the attribute that names it: `fill` unless it says `surface`. */
const placeOf = (named: string | undefined): 'fill' | 'surface' =>
  named === 'surface' ? 'surface' : 'fill'

/**
 * Which part of the model each group's notes go to, from the frame's
 * `data-preview-graph-regions`: `Group: part` pairs, a comma between, as
 * `Vision: occipital, Balance: cerebellum`. A stencil's `regions`, written
 * where JSON would need quoting.
 */
const regionsOf = (frame: HTMLElement): Record<string, string> | undefined => {
  const pairs = (frame.dataset.previewGraphRegions ?? '')
    .split(',')
    .map((pair) => pair.split(':').map((side) => side.trim()))
    .filter((pair): pair is [string, string] => pair.length === 2 && !!pair[0] && !!pair[1])
  return pairs.length > 0 ? Object.fromEntries(pairs) : undefined
}

/**
 * The 3D model an example draws its notes on, named by the frame's
 * `data-preview-graph-model`, read once it has loaded, with
 * `data-preview-graph-place` as the stencil's `place` and
 * `data-preview-graph-regions` as its `regions`. Undefined where the
 * frame names none, or the model cannot be read.
 */
export const modelOf = async (frame: HTMLElement): Promise<GraphStencil | undefined> => {
  const url = frame.dataset.previewGraphModel
  if (!url) {
    return undefined
  }
  try {
    const field = await shapeFromModel(url)
    return {
      ...field,
      place: placeOf(frame.dataset.previewGraphPlace),
      regions: regionsOf(frame),
    }
  } catch (error) {
    console.error(error)
    return undefined
  }
}
