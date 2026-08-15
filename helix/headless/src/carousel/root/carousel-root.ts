import { customElement, HelixElement, HelixSelectEvent, hostAria } from '@helix-io/core'
import { caretLeft, caretRight, play, stop } from '@helix-io/icons'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

/**
 * @summary Shows one slide of several, with controls to move between them.
 *
 * @description
 * The track is a scroller with scroll snapping, so a drag, a trackpad swipe,
 * and the browser's own momentum all work without being reimplemented. The
 * controls scroll it; they do not drive a transform.
 *
 * Slides are the consumer's own elements. Each is given
 * `aria-roledescription="slide"` and a name reading its position in the set,
 * which is what a screen-reader user needs to know where they are. Where a
 * slide carries its own `aria-label`, that one is left alone.
 *
 * **Rotation stops on focus and on hover, and once stopped it stays stopped.**
 * The APG is explicit: rotation must not resume unless the reader asks for it,
 * so hovering away does not start it again. The control names the action it
 * performs, and it is first in the tab order.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Slider, Gallery, Slideshow
 * @documentation https://helix.fusion.dev/components/carousel
 *
 * @slot - The slides.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the slide in view changes, with its index.
 *
 * @csspart controls - The row of controls.
 * @csspart rotation - The control that stops and starts rotation.
 * @csspart previous - The control that moves to the previous slide.
 * @csspart next - The control that moves to the next slide.
 * @csspart track - The scroller the slides sit in.
 */
@customElement('helix-base-carousel')
export class HelixBaseCarousel extends HelixElement {
  /** Accessible name for the carousel. */
  @property()
  label = 'Carousel'

  /** The slide in view, counted from zero. */
  @property({ type: Number })
  index = 0

  /** Whether moving past either end wraps to the other. */
  @property({ type: Boolean })
  loop = false

  /** Whether the carousel advances on its own. */
  @property({ type: Boolean })
  autoplay = false

  /** How long each slide is held, in milliseconds. */
  @property({ type: Number })
  interval = 5000

  /** Whether rotation is running. Absent until autoplay starts it. */
  @state()
  private rotating = false

  private timer: ReturnType<typeof setInterval> | undefined

  /** The slides, in light-DOM order. Client only: the server has no tree. */
  get slides(): HTMLElement[] {
    return [...this.children].filter((child): child is HTMLElement => child instanceof HTMLElement)
  }

  /** Moves to a slide, wrapping only where `loop` says to. */
  goTo(index: number): void {
    const count = this.slides.length
    if (count === 0) {
      return
    }
    const next = this.loop ? (index + count) % count : Math.min(Math.max(index, 0), count - 1)
    if (next === this.index) {
      return
    }
    this.index = next
    this.scrollToIndex()
    this.dispatchEvent(new HelixSelectEvent({ value: String(next) }))
  }

  private scrollToIndex(): void {
    const slide = this.slides[this.index]
    const track = this.renderRoot.querySelector<HTMLElement>('[part="track"]')
    if (!slide || !track) {
      return
    }
    track.scrollTo({ behavior: 'smooth', left: slide.offsetLeft - track.offsetLeft })
  }

  /**
   * Stops rotation for good.
   *
   * Hovering away or moving focus out does not start it again. The APG is
   * explicit that rotation resumes only when the reader asks for it, because a
   * carousel that starts moving again on its own is the thing the control
   * exists to escape.
   */
  private stop(): void {
    this.rotating = false
    clearInterval(this.timer)
    this.timer = undefined
  }

  private start(): void {
    this.stop()
    this.rotating = true
    this.timer = setInterval(() => this.goTo(this.index + 1), this.interval)
  }

  private readonly handleScroll = (): void => {
    const track = this.renderRoot.querySelector<HTMLElement>('[part="track"]')
    if (!track) {
      return
    }
    // The nearest slide to the scroller's leading edge, so a drag that settles
    // between two reports the one it settled on.
    const nearest = this.slides.reduce(
      (best, slide, index) => {
        const distance = Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft)
        return distance < best.distance ? { distance, index } : best
      },
      { distance: Number.POSITIVE_INFINITY, index: this.index },
    )
    if (nearest.index !== this.index) {
      this.index = nearest.index
      this.dispatchEvent(new HelixSelectEvent({ value: String(nearest.index) }))
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.stop)
    this.addEventListener('pointerenter', this.stop)
    if (this.autoplay) {
      this.start()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusin', this.stop)
    this.removeEventListener('pointerenter', this.stop)
    this.stop()
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
    // Announced as a carousel rather than as a bare group, so a reader knows
    // what the controls beside it are for.
    this.internals.ariaRoleDescription = 'carousel'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    // Named on the slides themselves rather than on wrappers, so each is the
    // consumer's own element and keeps whatever it already carried.
    const slides = this.slides
    slides.forEach((slide, index) => {
      slide.setAttribute('role', 'group')
      slide.setAttribute('aria-roledescription', 'slide')
      if (!slide.hasAttribute('aria-label')) {
        slide.setAttribute('aria-label', `${index + 1} of ${slides.length}`)
      }
    })
  }

  protected override render(): TemplateResult {
    const rotating = this.rotating

    return html`<div part="controls">
        ${
          this.autoplay
            ? html`<button
                part="rotation"
                type="button"
                aria-label=${rotating ? 'Stop slide rotation' : 'Start slide rotation'}
                @click=${() => (rotating ? this.stop() : this.start())}
              >
                <svg
                  fill="currentColor"
                  viewBox=${rotating ? stop.viewBox : play.viewBox}
                  aria-hidden="true"
                >
                  ${unsafeSVG(rotating ? stop.content : play.content)}
                </svg>
              </button>`
            : nothing
        }
        <button
          part="previous"
          type="button"
          aria-label="Previous slide"
          @click=${() => this.goTo(this.index - 1)}
        >
          <svg fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
            ${unsafeSVG(caretLeft.content)}
          </svg>
        </button>
        <button
          part="next"
          type="button"
          aria-label="Next slide"
          @click=${() => this.goTo(this.index + 1)}
        >
          <svg fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
            ${unsafeSVG(caretRight.content)}
          </svg>
        </button>
      </div>
      <div part="track" @scrollend=${this.handleScroll}><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-carousel': HelixBaseCarousel
  }
}
