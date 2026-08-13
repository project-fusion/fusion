/**
 * An icon is data: the inner markup of an SVG, plus the box it is drawn in.
 *
 * `content` rather than a single `path`, because an icon is often several
 * elements at once and each carries its own stroke and fill. A one-path model
 * fits the simplest glyphs and silently loses the rest.
 */
export interface HelixIcon {
  /** Inner SVG markup, drawn inside the component's own `<svg>`. */
  content: string
  /** Name used to look the icon up. */
  name: string
  /** Coordinate system the markup is drawn in. */
  viewBox: string
}
