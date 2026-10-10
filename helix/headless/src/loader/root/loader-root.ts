import {
  customElement,
  DelayController,
  elementById,
  HelixElement,
  hostAria,
  reportRuntime,
  timeConverter,
  words,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { awaitRegion, claimBusy, releaseBusy } from '../busy.js'

/**
 * @summary Shows that work of unknown length is in progress.
 *
 * @description
 * Draws two concentric circles: a track and a moving arc. The track shows the
 * arc as a proportion of a whole, and costs one element.
 *
 * **For work whose length is known, use `Progress` with `shape="ring"`.** It
 * draws the same ring filled to the value, says the value as a progress bar
 * does, and says when the work is complete. A loader claims no proportion, so
 * it takes no value.
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
 * loaders in one region hold it busy until the last one leaves. A region drawn
 * after the loader is marked when it arrives.
 *
 * **`delay` keeps a quick load from flashing a loader.** The loader stays
 * hidden, and silent, for that many milliseconds, and appears only if the work
 * is still going. While it waits it carries `:state(waiting)`.
 *
 * **The loader can stand in for what it wraps.** Put the content in the
 * `content` slot, such as a button or a card, and set `idle` while no work is
 * in progress. While the work runs, the content keeps its size and is hidden
 * and inert, and the ring draws over it. While `idle` is set, the loader draws
 * nothing of its own, has no role, and marks no region busy, so only the
 * content shows. Clearing `idle` starts `delay` again.
 *
 * @since 0.1.0
 * @status stable
 * @category feedback
 * @aliases Spinner, Busy, Activity
 * @documentation https://fusion.dev/helix/components/loader
 *
 * @slot - An icon or logo that stays still at the center. Empty by default.
 * @slot content - What the loader stands in for while the work runs, such as a button. It keeps its size, hidden and inert, until `idle` is set.
 *
 * @csspart content - The box that holds the `content` slot. Hidden while the work runs, and shown while `idle` is set.
 * @csspart indicator - The arc that turns.
 * @csspart mark - The region that holds the slotted content at the center.
 * @csspart svg - The rotating circle pair.
 * @csspart track - The full circle behind the indicator.
 *
 * @cssstate waiting - The loader is waiting out its `delay`, hidden and silent.
 */
@customElement('helix-headless-loader')
export class HelixHeadlessLoader extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-loader': { label: 'Wird geladen' } })`.
   */
  static words = 'helix-loader'

  /**
   * How long the loader waits before it shows, in milliseconds, so work that
   * finishes quickly never flashes one. The attribute also takes a CSS time,
   * such as `300ms`.
   *
   * Absent shows it at once. Hidden in the served markup too, so a page that
   * loads quickly never draws it.
   */
  @property({ converter: timeConverter('delay', 0) })
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
   * Whether no work is in progress. The loader draws nothing of its own, has
   * no role, and marks no region busy, and what is in the `content` slot
   * shows. Clearing it starts `delay` again.
   */
  @property({ type: Boolean })
  idle = false

  /**
   * The loader's name, announced by screen readers while the work is in
   * progress.
   */
  @words
  @property()
  label = 'Loading'

  /** The wait `delay` asks for, and whether it has run out. */
  private readonly due = new DelayController(this)

  /** The region this loader marked busy, so it is the one released. */
  private region: Element | null = null

  /** Stops waiting for a region `for` names that is not on the page yet. */
  private stopAwaiting: (() => void) | undefined

  /** Whether `for` has named an element while the loader was on the page. */
  private found = false

  /** Whether the loader is still waiting out its `delay`. */
  private get waiting(): boolean {
    return !this.idle && this.delay > 0 && !this.due.elapsed
  }

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.delay > 0 && !this.due.elapsed) {
      this.due.start(this.delay)
    }
    /* A frame after connecting, which is after a framework has hydrated the
       region: an attribute it never rendered, arriving while it compares, is
       one it reports. */
    requestAnimationFrame(() => this.mark())
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    /* Said as the loader leaves, when a region drawn late can no longer be the
       reason: a `for` that never named anything marked nothing busy, which no
       reader of the page would notice. */
    if (this.stopAwaiting && !this.found) {
      reportRuntime({
        kind: 'missing-target',
        message:
          `<${this.localName} for="${this.for}"> named no element in its tree while it was on ` +
          'the page, so no region was marked busy. Give the region that id.',
        tag: this.localName,
      })
    }
    this.stopAwaiting?.()
    this.stopAwaiting = undefined
    this.release()
  }

  /** Marks the region `for` names busy, releasing one it named before. */
  private mark(): void {
    this.stopAwaiting?.()
    this.stopAwaiting = undefined
    const named = this.isConnected && this.for !== '' && !this.idle
    const region = named ? elementById(this, this.for) : null
    if (named && !region) {
      /* Not drawn yet: marked when it arrives. */
      this.stopAwaiting = awaitRegion(
        this.getRootNode(),
        () => elementById(this, this.for),
        () => this.mark(),
      )
    }
    if (region === this.region) {
      return
    }
    this.release()
    if (region) {
      claimBusy(region)
      this.region = region
      this.found = true
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
      this.found = false
      this.mark()
    }
    /* Busy again: the region is marked again, and a quick spell of work still
       draws nothing. */
    if (changed.has('idle') && changed.get('idle') !== undefined) {
      if (!this.idle && this.delay > 0) {
        this.due.start(this.delay)
      }
      this.mark()
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, {
      label: this.idle ? '' : this.label,
      role: this.idle ? '' : 'progressbar',
    })
    this.internals.ariaBusy = this.idle ? null : 'true'
    /* Silent while it waits, as well as unseen. */
    this.internals.ariaHidden = this.waiting ? 'true' : null
    this.toggleState('waiting', this.waiting)
  }

  protected override render(): TemplateResult {
    /* What the loader stands in for keeps its box while the work runs, hidden
       and inert in the markup itself, so it holds on every tier, a sheet or
       none. */
    const content = html`<span
      part="content"
      ?inert=${!this.idle}
      style=${this.idle ? nothing : 'visibility: hidden'}
      ><slot name="content"></slot
    ></span>`
    if (this.idle) {
      return content
    }
    /* `hidden` on the drawing while it waits, which is the state on every tier,
       a sheet or none. */
    return html`${content}<svg part="svg" viewBox="0 0 24 24" aria-hidden="true" ?hidden=${this.waiting}>
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
