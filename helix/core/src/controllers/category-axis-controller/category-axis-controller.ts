import type { ReactiveController, ReactiveControllerHost } from 'lit'
import {
  type AxisLengths,
  type Category,
  type PlacedLabel,
  placeLabels,
} from '../../utils/category-labels/category-labels.js'

/** What the controller needs of its host: a Lit element and where it drew itself. */
export interface CategoryAxisHost extends ReactiveControllerHost, HTMLElement {
  /**
   * Where the chart drew itself, which is where the `labels` part is looked for.
   */
  readonly renderRoot: DocumentFragment | HTMLElement
}

/** The canvas every chart measures its names on, made on the first measure. */
let pen: CanvasRenderingContext2D | null | undefined

/** The pen, or null where there is no canvas to draw text on, as in a DOM without layout. */
const penOf = (): CanvasRenderingContext2D | null => {
  if (pen === undefined) {
    try {
      pen =
        typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
    } catch {
      pen = null
    }
  }
  return pen
}

/** How the names on an axis are set, read from one of them. */
interface Setting {
  /** The CSS `font` of a name, which the pen draws in. */
  font: string
  /** The space a name's letters carry, in pixels, which the pen does not add. */
  spacing: number
  /** How a name's case is set, which the pen does not apply either. */
  transform: string
  /** The least room between two names along a row: half the size of their type. */
  gap: number
  /** The size of a name's type, which is its length down an axis that runs down. */
  size: number
}

/** A name in the case `text-transform` sets it in, which is the case it is measured in. */
const cased = (text: string, transform: string): string =>
  transform === 'uppercase'
    ? text.toUpperCase()
    : transform === 'lowercase'
      ? text.toLowerCase()
      : transform === 'capitalize'
        ? text.replace(
            /(^|\s)(\S)/g,
            (_, space: string, letter: string) => space + letter.toUpperCase(),
          )
        : text

/**
 * Measures a chart's category axis and says which of its names fit.
 *
 * **A controller because the answer moves with the box.** `placeLabels` is
 * the arithmetic; what it needs is the axis' length and every name's length
 * on it, and both change without the chart changing: a card resized, a font
 * that finished loading. So the `labels` part is watched with a
 * `ResizeObserver`, a name's font is read from a drawn name, and the host is
 * asked to update when either moves.
 *
 * **Measured on a canvas in the name's own font**, so a name is measured
 * without being built: an axis of 10,000 readings measures the few dozen names
 * that are candidates to be drawn, and builds only the ones that are. The
 * widths are held by name until the font changes.
 *
 * **The first update is unmeasured**, the box not having been laid out yet,
 * and draws every name up to `UNMEASURED_LABELS`. The observer's first report
 * comes after that layout and before the frame is painted, so the frame shows
 * the measured axis.
 *
 * **The box it watches never changes size because of what it draws.** Along
 * the line of text that is the `labels` part, whose width is the plot's and
 * whose height is one line whichever names are in it. Down the side, as a
 * horizontal bar chart's names are, the names set the part's width, so the
 * host is watched there and the part's height is read when it reports.
 * Watching a box the update resizes is a loop the browser reports as an error.
 */
export class CategoryAxisController implements ReactiveController {
  private readonly host: CategoryAxisHost
  private readonly along: () => 'block' | 'inline'
  private sizes: ResizeObserver | undefined
  /** The `labels` part the observer last saw, so a new one is watched. */
  private labels: Element | null = null
  /** The axis' length in pixels, or 0 while it has not been measured. */
  private length = 0
  private setting: Setting | undefined
  /** Each name's length in the current font, by its text. */
  private widths = new Map<string, number>()
  private held:
    | {
        categories: readonly Category[]
        length: number
        setting: Setting | undefined
        placed: PlacedLabel[]
      }
    | undefined

  constructor(host: CategoryAxisHost, along: () => 'block' | 'inline' = () => 'inline') {
    this.host = host
    this.along = along
    host.addController(this)
  }

  /**
   * The axis' length in pixels, or 0 before it is measured, which is the
   * plot's length along it: a chart draws a line of more readings than it has
   * pixels with only the points those pixels show. See `columnPoints`.
   */
  get measured(): number {
    return this.length
  }

  /**
   * The names to draw for these readings, placed along the axis.
   *
   * Held while the readings, the axis and the font are the ones it was worked
   * out for, so a render the pointer asks for costs nothing here. The
   * readings are compared by identity, which is how a chart holds its rows
   * between edits.
   */
  place(categories: readonly Category[]): PlacedLabel[] {
    const held = this.held
    if (
      held &&
      held.categories === categories &&
      held.length === this.length &&
      held.setting === this.setting
    ) {
      return held.placed
    }
    /* The widths are of these readings' names, so new readings start a new
       set, and the set never holds more than the names of one table. */
    if (held?.categories !== categories) {
      this.widths.clear()
    }
    const placed = placeLabels(categories, this.lengths(categories))
    this.held = { categories, length: this.length, placed, setting: this.setting }
    return placed
  }

  /** The axis and its names in pixels, or nothing while either cannot be measured. */
  private lengths(categories: readonly Category[]): AxisLengths | undefined {
    const setting = this.setting
    const pen = penOf()
    if (this.length <= 0 || !setting || !pen) {
      return undefined
    }
    /* Down the side a name is as tall as its type, and names a line apart
       are read as lines of text, so they need only a line's leading between
       them, an eighth of the type. Measured, twelve bars in the default block
       size keep a name each, as they had before any were left out. */
    if (this.along() === 'block') {
      return { gap: setting.size / 8, length: this.length, name: () => setting.size }
    }
    return {
      gap: setting.gap,
      length: this.length,
      name: (at) => {
        const text = categories[at]?.label ?? ''
        let width = this.widths.get(text)
        if (width === undefined) {
          pen.font = setting.font
          width =
            pen.measureText(cased(text, setting.transform)).width + setting.spacing * text.length
          this.widths.set(text, width)
        }
        return width
      },
    }
  }

  hostConnected(): void {
    globalThis.document?.fonts?.addEventListener?.('loadingdone', this.refont)
  }

  hostDisconnected(): void {
    globalThis.document?.fonts?.removeEventListener?.('loadingdone', this.refont)
    this.sizes?.disconnect()
    this.sizes = undefined
    this.labels = null
  }

  /** Watches the `labels` part the update drew, where it is a new one. */
  hostUpdated(): void {
    const labels = this.host.renderRoot.querySelector('[part="labels"]')
    if (labels === this.labels) {
      return
    }
    this.labels = labels
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    this.sizes ??= new ResizeObserver(this.measure)
    this.sizes.disconnect()
    if (labels) {
      this.sizes.observe(this.along() === 'block' ? this.host : labels)
    }
  }

  /** Reads the axis' length and its names' font, and asks for an update where either moved. */
  private readonly measure = (): void => {
    const labels = this.labels as HTMLElement | null
    const name = labels?.querySelector('[part~="label"]')
    if (!labels || !name) {
      return
    }
    const box = labels.getBoundingClientRect()
    const length = this.along() === 'block' ? box.height : box.width
    const style = getComputedStyle(name)
    const size = Number.parseFloat(style.fontSize) || 0
    const spacing = Number.parseFloat(style.letterSpacing) || 0
    /* From the longhands. Measured in Chromium, the shorthand of a name set
       with `font-variant-numeric` reads as an empty string, which a canvas
       ignores, measuring in whatever font it had before. */
    const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const setting = this.setting
    const same =
      setting?.font === font &&
      setting.spacing === spacing &&
      setting.transform === style.textTransform
    if (!same) {
      this.setting = { font, gap: size / 2, size, spacing, transform: style.textTransform }
      this.widths.clear()
    }
    if (!same || length !== this.length) {
      this.length = length
      this.host.requestUpdate()
    }
  }

  /** A font finished loading, so every name is measured again in it. */
  private readonly refont = (): void => {
    this.widths.clear()
    this.setting = this.setting && { ...this.setting }
    this.host.requestUpdate()
  }
}
