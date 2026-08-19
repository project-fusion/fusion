import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Shows how far along a task is, when that is known.
 *
 * @description
 * Determinate by default, and `indeterminate` for a task whose total is not
 * known yet. `Loader` is still the right answer where the wait is short or has
 * no place of its own on the page; a bar earns its width where the work is the
 * subject of the region it sits in.
 *
 * A bar that fills at a made-up rate would be a bar that lies, so the
 * indeterminate one does not fill: it runs a segment across the track, which
 * says work is happening and claims no proportion at all. `aria-valuenow` is
 * omitted with it, which is the platform's own signal for the same thing.
 *
 * **The fill is a percentage of the track, written as a custom property.** It
 * is derived from `value` and `max` rather than measured, so it renders on a
 * server with no layout and needs nothing after upgrade. That is what keeps it
 * out of the class of geometry this library writes only on the client.
 *
 * **`value` is clamped, and out-of-range input is not an error.** A count that
 * runs past its own total is ordinary in real applications, and a bar that
 * overflows its track or reports `aria-valuenow` above `aria-valuemax` is worse
 * than one that reads as finished.
 *
 * Semantics are on the host through `ElementInternals`, the same as everywhere
 * else: a `role` in the shadow root announces correctly and leaves the host
 * anonymous to anything walking the light DOM, and a `role` written onto the
 * host as an attribute is one a server's markup never had.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Progress bar, Loading bar
 * @documentation https://helix.fusion.dev/components/progress
 *
 * @csspart track - The full length the work is measured against.
 * @csspart indicator - The part of it that is done.
 * @csspart groove - The unfilled circle, under the ring's own sweep.
 * @csspart value - The reading beside the bar, under `show-value`.
 */
@customElement('helix-base-progress')
export class HelixBaseProgress extends HelixElement {
  /** Accessible name for what is in progress. */
  @property()
  label = 'Progress'

  /**
   * Whether the work has a knowable end.
   *
   * On the headless tier rather than as an `appearance`, because it is
   * semantics before it is a picture: a progressbar with no `aria-valuenow` is
   * how the platform says "running, and nobody knows how far", and a reader on
   * a screen reader is told that rather than being read a number that means
   * nothing. `value` and `max` are ignored while it is set.
   *
   * Not `Loader`, which is the other thing this could be. A loader says the
   * page is busy; a bar says a named piece of work is running, and keeps its
   * place in the layout when the answer arrives and it becomes determinate.
   */
  @property({ reflect: true, type: Boolean })
  indeterminate = false

  /** The total the work is measured against. */
  @property({ type: Number })
  max = 100

  /**
   * Whether the value is drawn as a bar or as a ring.
   *
   * **On this tier because it changes the markup**, which is the base tier's to
   * own. A bar is two boxes and a ring is an SVG with two circles in it, and no
   * stylesheet turns one into the other: the styled tier tried, with a conic
   * gradient and a mask, and the thing it could not do was the round end the
   * loader has, because a gradient has hard radial edges and no notion of a
   * cap. `Skeleton.shape` is the same word for the same kind of decision.
   *
   * The value, the ARIA and the form participation are untouched by it. What
   * changes is only which shape carries the fraction.
   */
  @property({ reflect: true })
  shape?: 'ring'

  /**
   * Whether the reading is shown beside the bar.
   *
   * The same name and shape `Slider` uses, because it is the same question:
   * a control that holds a number can either show it or leave it to whatever is
   * around it. Off by default, since most bars sit under a label that already
   * says what is happening and a second number is noise.
   *
   * Nothing under `indeterminate`, where there is no reading to show: a percent
   * that does not move is worse than none, and `valueText` is the property for
   * saying "uploading" while the bar runs.
   */
  @property({ attribute: 'show-value', reflect: true, type: Boolean })
  showValue = false

  /**
   * What has been done so far, in the same units as `max`.
   *
   * Clamped between zero and `max` for both the fill and the announcement, so
   * the two can never disagree about what is on screen.
   */
  @property({ type: Number })
  value = 0

  /**
   * A reading for the value, where the number alone does not say enough.
   *
   * "3 of 8 files" rather than "37". Announced instead of the percentage, and
   * never instead of the value itself: `aria-valuenow` still carries the
   * number, because assistive technology that ignores the text still has to
   * report progress.
   */
  @property({ attribute: 'value-text' })
  valueText = ''

  /** What is done, as a fraction of the whole, between 0 and 1. */
  get fraction(): number {
    const max = this.max > 0 ? this.max : 100
    /* `|| 0` catches the value that is not a number.
     *
     * `undefined / 100` is `NaN`, `Math.min(Math.max(NaN, 0), 1)` is `NaN`, and
     * `NaN` reached CSS as `scale: NaN`, which is an invalid value the
     * declaration is dropped for: the bar fell back to its unscaled width and
     * painted COMPLETE for a value nobody had given. `aria-valuenow` announced
     * the string "NaN" beside it. Empty means nothing done, which is the only
     * reading that is not a claim. */
    return Math.min(Math.max(this.value / max, 0), 1) || 0
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'progressbar' })
    /* The clamped value, not the given one, so what is announced is what is
       drawn. Written as strings because that is what `ElementInternals` takes;
       a number assigned here is stringified anyway and reads as though the
       type were checked. */
    this.internals.ariaValueMin = '0'
    this.internals.ariaValueMax = String(this.max > 0 ? this.max : 100)
    /* Absent, not zero. An omitted `aria-valuenow` is the platform's own signal
       for indeterminate, and it is the only one: `aria-busy` says the element
       is being updated, which is a different claim. Reporting 0 would announce
       "0 percent" for work that is running, which is worse than saying nothing
       because it is wrong rather than unknown. */
    /* The clamped value itself, not the fraction multiplied back up.
     *
     * Dividing by `max` and then multiplying by it is a round trip through a
     * float, and for roughly one integer pair in sixteen it does not come back:
     * `1/3*3` is `0.9999999999999998`, which is what the accessibility tree
     * carried and what a screen reader read out. Clamping the value directly
     * says the same thing without the detour. */
    const ceiling = this.max > 0 ? this.max : 100
    this.internals.ariaValueNow = this.indeterminate
      ? null
      : String(Math.min(Math.max(this.value || 0, 0), ceiling))
    this.internals.ariaValueText = this.valueText || null
  }

  protected override render(): TemplateResult {
    /* A custom property rather than a width, so the styled tier decides what
       the number means: a bar fills along it, and a ring would sweep. */
    const fraction = this.indeterminate ? 1 : this.fraction

    /* Two circles and `pathLength`, which is what makes the arithmetic go away.
     *
     * Declaring the path 100 units long lets `stroke-dasharray` be written as
     * the percentage itself, so nothing here or in the stylesheet needs the
     * circumference, the radius or pi. The geometry is CSS as well: `r` and the
     * stroke both read the ring's own custom properties, so a consumer changing
     * the thickness moves the circle that carries it without the component
     * recalculating anything.
     *
     * `aria-hidden`, because the host is the `progressbar` and carries the
     * value. The drawing is a picture of what it already says. */
    const ring = html`<svg part="track" aria-hidden="true">
      <circle part="groove" />
      <circle part="indicator" pathLength="100" style="--_progress-fraction: ${fraction}" />
    </svg>`

    return html`${
      this.shape === 'ring'
        ? ring
        : html`<div part="track">
            <div part="indicator" style="--_progress-fraction: ${fraction}"></div>
          </div>`
    }
      ${
        /* `aria-hidden`, because the bar already reports this. The host carries
           `role="progressbar"` with `aria-valuenow` and `aria-valuetext`, so a
           readable copy of the same number is a second announcement of one
           fact. It is here to be looked at, not to be read out. */
        this.showValue && !this.indeterminate
          ? html`<span part="value" aria-hidden="true"
              >${this.valueText || `${Math.round(this.fraction * 100)}%`}</span
            >`
          : ''
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-progress': HelixBaseProgress
  }
}
