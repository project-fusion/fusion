import { customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary Shows how far along a task is, when that is known.
 *
 * @description
 * Determinate only. `Spinner` is what says something is happening without
 * saying how much of it is done, and a bar that fills at a made-up rate to
 * cover the same case is a bar that lies: a reader takes a position along a
 * track as a proportion, and it is the one thing the component is for. A task
 * whose total is unknown wants the spinner.
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
 */
@customElement('helix-base-progress')
export class HelixBaseProgress extends HelixElement {
  /** Accessible name for what is in progress. */
  @property()
  label = 'Progress'

  /** The total the work is measured against. */
  @property({ type: Number })
  max = 100

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
    return Math.min(Math.max(this.value / max, 0), 1)
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
    this.internals.ariaValueNow = String(this.fraction * (this.max > 0 ? this.max : 100))
    this.internals.ariaValueText = this.valueText || null
  }

  protected override render(): TemplateResult {
    /* A custom property rather than a width, so the styled tier decides what
       the number means: a bar fills along it, and a ring would sweep. */
    return html`<div part="track">
      <div part="indicator" style="--_progress-fraction: ${this.fraction}"></div>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-progress': HelixBaseProgress
  }
}
