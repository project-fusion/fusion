import type { GraphStencil } from '@fusion.dev/helix-graph'

/**
 * The shape an example fits its notes into, drawn as an SVG inside the frame
 * and marked `data-preview-graph-stencil`: its `viewBox` is the stencil's box
 * and its path the shape. `connectGraph`'s `stencil` option written as markup,
 * which is what an example can carry.
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
  return path && width > 0 && height > 0 ? { height, path, width } : undefined
}
