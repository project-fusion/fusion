/**
 * What a layer decides the same way on the web and on a phone: whether an
 * anchored panel is a sheet or a popover, the side it landed on and the end
 * of that side it is aligned to, the states that say both, the lengths its
 * rules read, and where its arrow stands on the edge that faces its anchor.
 *
 * Pure, so `FloatingController`, `PresentationController`, the families that
 * set the placed states, and the native runtime's layer read one answer.
 */

/** A side of the anchor a panel lands on. */
export type LayerSide = 'bottom' | 'left' | 'right' | 'top'

/**
 * How an anchored panel is drawn: `popover`, placed against its anchor;
 * `sheet`, along the window's bottom edge; `auto`, a sheet in a window
 * narrower than 30rem and a popover in any other.
 */
export type Presentation = 'auto' | 'popover' | 'sheet'

/**
 * The window width below which an `auto` panel is a sheet, Dialog's own
 * breakpoint: above every phone in portrait, and below any tablet.
 */
export const SHEET_BELOW = '30rem'

/** The media query that holds in a window where an `auto` panel is a sheet. */
export const SHEET_QUERY = `(width < ${SHEET_BELOW})`

/**
 * How a panel that asks for `asked` is drawn in a window that is `narrow`,
 * narrower than {@link SHEET_BELOW}. Anything but `popover` or `sheet` is
 * `auto`.
 */
export const presentedAs = (asked: unknown, narrow: boolean): 'popover' | 'sheet' =>
  asked === 'popover' || asked === 'sheet' ? asked : narrow ? 'sheet' : 'popover'

/**
 * The end of its side a placement aligns a panel to: `bottom-start` is
 * `start`, `top-end` is `end`, and `bottom` is centered and neither.
 */
export const alignmentOf = (placement: string): 'end' | 'start' | undefined =>
  placement.endsWith('-end') ? 'end' : placement.endsWith('-start') ? 'start' : undefined

/** The panel's edge that faces its anchor, for each side of it the panel can land on. */
const FACING: Readonly<Record<LayerSide, LayerSide>> = {
  bottom: 'top',
  left: 'right',
  right: 'left',
  top: 'bottom',
}

/**
 * The side of its anchor a placement puts a panel on: `top-start` is `top`,
 * and a placement Floating UI does not know is `bottom`.
 */
export const sideOf = (placement: string): LayerSide => {
  const side = placement.split('-')[0]
  return side === 'top' || side === 'left' || side === 'right' ? side : 'bottom'
}

/**
 * The states an element is in while its panel stands at `placement`: one
 * `placed-` state for the side it landed on, and `aligned-start` or
 * `aligned-end` for the end of that side, neither where it is centered. Each
 * state is named, on or off, so a host sets them all at each placement.
 */
export const placedStates = (placement: string): Readonly<Record<string, boolean>> => {
  const side = sideOf(placement)
  const end = alignmentOf(placement)
  return {
    'aligned-end': end === 'end',
    'aligned-start': end === 'start',
    'placed-bottom': side === 'bottom',
    'placed-left': side === 'left',
    'placed-right': side === 'right',
    'placed-top': side === 'top',
  }
}

/**
 * How wide a panel that matches its anchor is drawn: the anchor's width, no
 * wider than the room the panel has inside the window's margins.
 *
 * **A trigger as wide as the window gave a list as wide as the window**, and
 * `shift` keeps a margin it then cannot keep: a Select spanning a phone with no
 * gutter opened its list 8 pixels past the end edge, on both sides of the
 * window at once. The room is Floating UI's `availableWidth` after the shift,
 * so a panel that fits is the anchor's width exactly, as before.
 */
export const matchedInlineSize = (anchor: number, room: number): number =>
  Math.round(Math.max(0, Math.min(anchor, room)))

/**
 * The lengths a placed panel tells its rules, by the name each custom
 * property has after its `--`: the room left on the side it landed on, its
 * anchor's width, never wider than the room across, and where its arrow is
 * centered along the axis it travels. The web's floating controller writes
 * them on the panel, and a phone's layer gives them to its rules.
 */
export const measuredOf = (
  room: { readonly height: number; readonly width: number },
  anchorWidth: number,
  arrow: ArrowPoint = {},
): Record<string, number> => ({
  'floating-anchor-inline-size': matchedInlineSize(anchorWidth, room.width),
  ...(arrow.x === undefined ? {} : { 'floating-arrow-x': arrow.x }),
  ...(arrow.y === undefined ? {} : { 'floating-arrow-y': arrow.y }),
  'floating-available-block-size': Math.round(room.height),
})

/** Where Floating UI's `arrow` middleware puts an arrow along the panel's edge, from its left and its top. */
export interface ArrowPoint {
  readonly x?: number | undefined
  readonly y?: number | undefined
}

/** An arrow's own box, as its sheet sizes it. */
export interface ArrowBox {
  readonly height: number
  readonly width: number
}

/**
 * Where an arrow stands in its panel, by each physical edge, in pixels or
 * points: the edge facing the anchor half the arrow's own box outward, which
 * centers it on that edge, the edge along it where Floating UI puts it, and
 * the other two absent, which the web writes as `auto`.
 */
export const arrowEdges = (
  placement: string,
  point: ArrowPoint,
  box: ArrowBox,
): Partial<Record<LayerSide, number>> => {
  const facing = FACING[sideOf(placement)]
  const reach = (facing === 'left' || facing === 'right' ? box.width : box.height) / 2
  return {
    ...(point.x === undefined ? {} : { left: point.x }),
    ...(point.y === undefined ? {} : { top: point.y }),
    [facing]: -reach,
  }
}

/**
 * The arrow's center along the edge it travels, from the panel's left and its
 * top, for a panel that grows out of its arrow: only the axis it moves along
 * is given, so a reader's fallback stands for the other.
 */
export const arrowCenter = (point: ArrowPoint, box: ArrowBox): ArrowPoint => ({
  ...(point.x === undefined ? {} : { x: Math.round(point.x + box.width / 2) }),
  ...(point.y === undefined ? {} : { y: Math.round(point.y + box.height / 2) }),
})

/**
 * How far an arrow of `width` reaches past the edge it sits on: a square
 * turned forty-five degrees about its center, which is what a panel's
 * offset adds so its gap is measured to the point.
 */
export const reachOf = (width: number): number => width / Math.SQRT2
