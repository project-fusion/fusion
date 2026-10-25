import {
  customElement,
  drawIcon,
  HelixElement,
  motionPaused,
  onMotionChange,
  pauseMotion,
  words,
} from '@fusion.dev/helix-core'
import { pause, play } from '@fusion.dev/helix-icons'
import { html, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A button that pauses every motion on the page that starts by itself, and lets it run again.
 *
 * @description
 * WCAG 2.2.2 asks that motion which starts by itself and runs longer than
 * five seconds can be paused. **This is one control for the whole page**: a
 * press pauses every Helix component that moves by itself, and another lets
 * them run again.
 *
 * - `Carousel` stops rotating under `autoplay`.
 * - `Video` pauses a video that started itself under `autoplay`.
 * - `Aura`, `Orb`, and `Strands` hold the frame they show.
 * - A graph that `connectGraph` lays out stops where its notes stand, and its
 *   three.js view stops turning.
 * - A map layer's `frames` stop on the frame they show.
 *
 * **The choice is the page's**, held on the document element as
 * `data-helix-motion="paused"`, so two of these on one page agree, and a page
 * can set it in its markup or with `pauseMotion` from
 * `@fusion.dev/helix-core`. A stylesheet can select on the attribute to
 * pause motion of its own.
 *
 * It is a toggle button: a `<button>` that says whether motion is paused with
 * `aria-pressed`. It keeps one name, `label`, whichever way it stands, as a
 * toggle button does, and its icon shows what a press does next.
 *
 * Put it where a reader looks first, such as the page's header. Where the
 * reader asked for reduced motion, nothing moves by itself to begin with.
 *
 * @since 0.199.0
 * @status experimental
 * @category actions
 * @aliases Pause button, Pause animations, Stop motion, Motion control, Animation toggle
 * @documentation https://fusion.dev/helix/components/motion-toggle
 *
 * @slot - The button's text, where it shows more than its icon. Defaults to nothing, the icon alone, named by `label`.
 * @slot icon - Replaces the icon, which is pause while motion runs and play while it is paused.
 *
 * @event {Event} change - Fired after a press pauses the page's motion or lets it run.
 *
 * @csspart button - The toggle button, with `aria-pressed` while the page's motion is paused.
 * @csspart icon - The icon inside the button.
 *
 * @cssstate paused - The page's motion is paused.
 *
 * @interactive button
 */
@customElement('helix-headless-motion-toggle')
export class HelixHeadlessMotionToggle extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-motion-toggle': { fallbackLabel: 'Bewegung anhalten' } })`.
   */
  static words = 'helix-motion-toggle'

  /** The name the element gives itself where `label` is empty. */
  @words
  @property({ attribute: 'fallback-label' })
  fallbackLabel = 'Pause motion'

  /**
   * The button's name, which stays the same whichever way it stands.
   *
   * Empty by default, which leaves the name to `fallbackLabel`.
   */
  @property()
  label = ''

  /** Whether the page's motion is paused, kept with the document element's attribute. */
  @state()
  private paused = false

  /** What stops hearing the page's choice. */
  private unpaused: (() => void) | undefined

  override connectedCallback(): void {
    super.connectedCallback()
    this.paused = motionPaused()
    this.unpaused ??= onMotionChange((paused) => {
      this.paused = paused
    })
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.unpaused?.()
    this.unpaused = undefined
  }

  protected override updated(): void {
    this.toggleState('paused', this.paused)
  }

  /** Pauses the page's motion, or lets it run again. */
  private readonly toggle = (): void => {
    pauseMotion(!motionPaused())
    this.paused = motionPaused()
    this.dispatchEvent(new Event('change', { bubbles: true }))
  }

  protected override render(): TemplateResult {
    return html`<button
      aria-label=${this.label || this.fallbackLabel}
      aria-pressed=${this.paused ? 'true' : 'false'}
      part="button"
      type="button"
      @click=${this.toggle}
    ><span part="icon">${this.renderIcon()}</span><slot></slot></button>`
  }

  /**
   * The icon the `icon` slot falls back to: pause while motion runs, and play
   * while it is paused, which is what a press does next. A tier above draws
   * its own here.
   */
  protected renderIcon(): TemplateResult {
    return html`<slot name="icon">${drawIcon(this.paused ? play : pause)}</slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-motion-toggle': HelixHeadlessMotionToggle
  }
}
