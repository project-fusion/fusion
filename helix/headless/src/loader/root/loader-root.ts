import { customElement, elementById, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { claimBusy, releaseBusy } from '../busy.js'

/**
 * @summary Shows that work of unknown length is in progress.
 *
 * @description
 * Draws two concentric circles: a track and a moving arc. The track shows the
 * arc as a proportion of a whole, and costs one element.
 *
 * **The center is a slot, empty by default.** Put your logo there once, where
 * your app wraps the loader. When nothing is slotted, nothing extra is
 * rendered.
 *
 * Slotted content does not rotate. Only the arc moves, so a logo stays
 * readable.
 *
 * The role is set on the host through `ElementInternals`. A `role` in the
 * shadow root would leave the host itself without a role in the light DOM, and
 * a `role` attribute on the host would be missing from React server-rendered
 * markup.
 *
 * **`for` names the region being loaded**, and the loader sets
 * `aria-busy="true"` on it for as long as the loader is on the page, so a
 * screen reader waits for the region rather than reading it half filled. Two
 * loaders in one region hold it busy until the last one leaves.
 *
 * **`delay` keeps a quick load from flashing a loader.** The loader stays
 * hidden, and silent, for that many milliseconds, and appears only if the work
 * is still going.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Spinner, Busy, Activity
 * @documentation https://fusion.dev/helix/components/loader
 *
 * @slot - An icon or logo that stays still at the center. Empty by default.
 *
 * @csspart indicator - The arc that turns.
 * @csspart mark - The region that holds the slotted content at the center.
 * @csspart svg - The rotating circle pair.
 * @csspart track - The full circle behind the indicator.
 */
@customElement('helix-headless-loader')
export class HelixHeadlessLoader extends HelixElement {
  /**
   * How long the loader waits before it shows, in milliseconds, so work that
   * finishes quickly never flashes one.
   *
   * Absent shows it at once. Hidden in the served markup too, so a page that
   * loads quickly never draws it.
   */
  @property({ type: Number })
  delay = 0

  /**
   * The id of the region being loaded, which is marked `aria-busy` while the
   * loader is on the page.
   *
   * Names an element in the same tree. In React it arrives as a property, the
   * way `Tooltip.for` does.
   */
  @property()
  for = ''

  /**
   * The loader's name, announced by screen readers while the work is in
   * progress.
   */
  @property()
  label = 'Loading'

  /** Whether `delay` has run out, or there was none. */
  @state()
  private due = false

  private timer: ReturnType<typeof setTimeout> | undefined

  /** The region this loader marked busy, so it is the one released. */
  private region: Element | null = null

  /** Whether the loader is still waiting out its `delay`. */
  private get waiting(): boolean {
    return this.delay > 0 && !this.due
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.delay > 0 && !this.due) {
      this.timer = setTimeout(() => {
        this.due = true
      }, this.delay)
    }
    /* A frame after connecting, which is after a framework has hydrated the
       region: an attribute it never rendered, arriving while it compares, is
       one it reports. */
    requestAnimationFrame(() => this.mark())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    clearTimeout(this.timer)
    this.timer = undefined
    this.release()
  }

  /** Marks the region `for` names busy, releasing one it named before. */
  private mark(): void {
    const region = this.isConnected && this.for !== '' ? elementById(this, this.for) : null
    if (region === this.region) {
      return
    }
    this.release()
    if (region) {
      claimBusy(region)
      this.region = region
    }
  }

  private release(): void {
    if (this.region) {
      releaseBusy(this.region)
      this.region = null
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    if (changed.has('for') && changed.get('for') !== undefined) {
      this.mark()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'progressbar' })
    this.internals.ariaBusy = 'true'
    /* Silent while it waits, as well as unseen. */
    this.internals.ariaHidden = this.waiting ? 'true' : null
  }

  protected override render(): TemplateResult {
    /* `hidden` on the drawing while it waits, which is the state on every tier,
       a sheet or none. */
    return html`<svg part="svg" viewBox="0 0 24 24" aria-hidden="true" ?hidden=${this.waiting}>
        <circle part="track" cx="12" cy="12" r="10" fill="none" />
        <circle part="indicator" cx="12" cy="12" r="10" fill="none" />
      </svg>
      <span part="mark" aria-hidden="true" ?hidden=${this.waiting}><slot></slot></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-loader': HelixHeadlessLoader
  }
}
