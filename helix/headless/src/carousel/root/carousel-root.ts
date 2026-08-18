import {
  customElement,
  HelixElement,
  HelixSelectEvent,
  hostAria,
  requestControlledChange,
} from '@helix-io/core'
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
 * @csspart indicators - The row of controls saying where the reader is.
 * @csspart indicator - One of them, and a way to reach that slide.
 */
@customElement('helix-base-carousel')
export class HelixBaseCarousel extends HelixElement {
  /** Accessible name for the carousel. */
  @property()
  label = 'Carousel'

  /**
   * The slide in view, counted from zero.
   *
   * Reading gives the real slide, in either mode. Writing sets it, the way a
   * script assigning to a native control does. Which mode the carousel is in is
   * read once, at the first update, from whether anything had declared an
   * `index` by then: declared, and the consumer owns it and the carousel only
   * announces where it would have gone; not declared, and the carousel owns it
   * and `default-index` says where it starts.
   *
   * The same contract the four mixins carry, written out here rather than
   * extracted, because a slide is addressed by position and every one of those
   * mixins is keyed by a name. One consumer is not a mixin: if a second numeric
   * state turns up, this is what it is extracted from.
   */
  @property({ type: Number })
  get index(): number {
    return this.indexState ?? this.defaultIndex
  }

  set index(next: number) {
    const previous = this.index
    this.indexState = next
    this.requestUpdate('index', previous)
  }

  /**
   * Which way the track runs.
   *
   * Behaviour rather than presentation, which is why it is here: the scroll
   * position and the nearest-slide arithmetic are both single-axis, and a
   * styled-tier attribute cannot change which one they read. Two sites branch
   * on it, `scrollTo` and the drag settle, and nothing else in the component
   * knows about the axis at all.
   *
   * A vertical track needs a height, which a horizontal one does not: width
   * comes from the page and height does not, so the styled tier gives it
   * `--carousel-block-size` and a consumer sets that to whatever the slides
   * want.
   */
  @property({ reflect: true })
  orientation?: 'horizontal' | 'vertical'

  /** Slide to start on, where nothing declared one. */
  @property({ attribute: 'default-index', type: Number })
  defaultIndex = 0

  /** The slide in view, whoever set it, and `undefined` until somebody has. */
  private indexState: number | undefined = undefined

  /** Whether the consumer owns the slide, decided once and then fixed. */
  private indexMode: boolean | undefined = undefined

  private get indexIsControlled(): boolean {
    return this.indexMode === true
  }

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

  /** The slides, in light-DOM order. Empty on the server, which has no tree. */
  get slides(): HTMLElement[] {
    /* `?? []` is the server, and the comment above it was already right and
       still did not save it: this said "client only" while `render` read it to
       count the indicators, so every carousel SSR spec died on an unhandled
       spread of `undefined`. Third time in this library, after the menu item
       and the table, and the only one of the three the note was written on.
       Knowing where a getter must not be reached is not the same as it not
       being reached, which is what the guard is for.

       Empty is also the honest answer rather than damage control. The
       indicators are one per slide, the server cannot count children, so they
       arrive with the upgrade. Nothing moves when they do: the tags are hidden
       until they are defined. */
    return [...(this.children ?? [])].filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    )
  }

  /**
   * The arrows move between indicators, which is the tablist pattern.
   *
   * One tab stop for the set and the arrows within it, so a reader does not
   * have to press Tab once per slide to get past a carousel of twelve. Moving
   * changes the slide, because an indicator that could be focused without
   * selecting would leave the highlight and the slide disagreeing with nothing
   * on screen saying which is which.
   */
  private readonly handleIndicatorKeydown = (event: KeyboardEvent): void => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (step === 0) {
      return
    }
    event.preventDefault()
    this.goTo(this.index + step)
    this.updateComplete.then(() => {
      this.renderRoot.querySelector<HTMLElement>('[part="indicator"][data-current]')?.focus()
    })
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
    /* Announced before it moves, which it was not: this set `index`, scrolled,
       and then dispatched, so a listener calling `preventDefault()` was
       refusing a decision already taken and the carousel moved anyway.
       `requestControlledChange` is the audited path its own documentation says
       every stateful change in the system goes through, and three components
       were not on it. */
    requestControlledChange({
      apply: (value) => {
        /* Nothing in controlled mode: the carousel has said where it would go
           and the consumer decides whether it goes. */
        if (this.indexIsControlled) {
          return
        }
        const previous = this.index
        this.indexState = value
        this.requestUpdate('index', previous)
      },
      controlled: this.indexIsControlled,
      event: (value) => new HelixSelectEvent({ value: String(value) }),
      host: this,
      label: 'index',
      next,
      read: () => this.index,
    })
  }

  private scrollToIndex(): void {
    const slide = this.slides[this.index]
    const track = this.renderRoot.querySelector<HTMLElement>('[part="track"]')
    if (!slide || !track) {
      return
    }
    /* The preference is read here, because this is where the motion is.
     *
     * `scroll-behavior: auto` in a reduce block does nothing: it restates the
     * initial value, and the scroll that actually animates is this call, which
     * names `smooth` outright and overrides the property either way. A reader
     * who asked not to be moved was moved. */
    const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    track.scrollTo({
      behavior: still ? 'instant' : 'smooth',
      ...(this.orientation === 'vertical'
        ? { top: slide.offsetTop - track.offsetTop }
        : { left: slide.offsetLeft - track.offsetLeft }),
    })
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
    this.stopped = true
    this.rotating = false
  }

  private start(): void {
    this.stopped = false
    this.rotating = true
  }

  /**
   * Owns the timer, from the state rather than from the call site.
   *
   * `start()` and `stop()` each held the interval and `connectedCallback`
   * started one, which the rules forbid: a DOM move re-ran connect and restarted
   * rotation the reader had stopped, and the server, which never runs connect at
   * all, rendered the control saying the opposite of what it would do. The
   * state is what is declared and the timer follows it, which also means one
   * place clears it.
   */
  private runTimer(): void {
    clearInterval(this.timer)
    this.timer = undefined
    if (!this.rotating || this.slides.length < 2) {
      return
    }
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
        const distance =
          this.orientation === 'vertical'
            ? Math.abs(slide.offsetTop - track.offsetTop - track.scrollTop)
            : Math.abs(slide.offsetLeft - track.offsetLeft - track.scrollLeft)
        return distance < best.distance ? { distance, index } : best
      },
      { distance: Number.POSITIVE_INFINITY, index: this.index },
    )
    /* Announced after the fact, and deliberately, where `goTo` announces
       before. The reader has already dragged the track here: there is nothing
       to refuse, and `preventDefault()` could not un-drag it. This is the case
       the controlled-change helper's own documentation distinguishes, a native
       control that has already moved, and putting it on that path would offer a
       refusal that cannot be honoured. */
    if (nearest.index !== this.index) {
      this.indexState = nearest.index
      this.requestUpdate('index')
      this.dispatchEvent(new HelixSelectEvent({ value: String(nearest.index) }))
    }
  }

  /**
   * Whether the reader has stopped it, as opposed to something pausing it.
   *
   * The two were one flag and the difference matters: `focusin` bubbles, so
   * every focus move inside the carousel re-ran `stop()`, and a reader who
   * pressed Start had it undone by their very next Tab. Pausing on hover and on
   * focus is right; forgetting that the reader asked it to stop is not, and the
   * APG is explicit that rotation resumes only when the reader asks.
   */
  private stopped = false

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('focusin', this.pause)
    this.addEventListener('pointerenter', this.pause)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('focusin', this.pause)
    this.removeEventListener('pointerenter', this.pause)
    clearInterval(this.timer)
    this.timer = undefined
  }

  /** Pauses without forgetting that the reader wanted it running. */
  private readonly pause = (): void => {
    if (!this.stopped) {
      this.rotating = false
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // Only the first time, before anything reads it. See `MixinControllerOpen`.
    if (this.indexMode === undefined) {
      this.indexMode = this.indexState !== undefined
    }
    /* Seeded from the markup rather than started on connect, so the server and
       the client agree about whether it is running. A reader's stop survives a
       reconnection because `stopped` outlives it. */
    if (!this.hasUpdated) {
      this.rotating = this.autoplay
    }
    hostAria(this.internals, { label: this.label, role: 'group' })
    // Announced as a carousel rather than as a bare group, so a reader knows
    // what the controls beside it are for.
    this.internals.ariaRoleDescription = 'carousel'
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* The track follows `index`, whoever moved it.
     *
     * This was called from inside `goTo`'s apply callback, which returns early
     * in controlled mode, so a controlled carousel announced where it would go,
     * the consumer assigned `index`, and the track never moved: the dots
     * updated and the slides sat still. Every other path in was equally
     * stranded, a plain `carousel.index = 2` included, apply being the only
     * caller. Here it is one place and it covers all of them. */
    if (changed.has('index')) {
      this.scrollToIndex()
    }
    this.runTimer()
    /* Back inside the set when the set shrinks.
     *
     * Nothing re-clamped `index`, and the indicators carry a roving tab stop
     * keyed on it, so a carousel whose slides were removed under it was left
     * with no tab stop, no current dot and a focus restore pointing at nothing.
     * In `updated` rather than `willUpdate` because `slides` is empty on the
     * server, and through `goTo` so a controlled consumer is told rather than
     * overwritten. */
    const count = this.slides.length
    if (count > 0 && this.index > count - 1) {
      this.goTo(count - 1)
    }
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
      <div part="track" @scrollend=${this.handleScroll}>
        <slot @slotchange=${() => this.requestUpdate()}></slot>
      </div>
      ${
        this.slides.length > 1
          ? html`<div part="indicators" role="group" aria-label=${`${this.label} slides`}>
              ${
                /* Plain buttons, not a half-built tablist.
                 *
                 * They were `role="tab"` inside `role="tablist"` with no
                 * `aria-controls`, while the slides were `role="group"` rather
                 * than tabpanels: the APG has two carousel patterns and this
                 * was the announcement of one over the structure of the other,
                 * so a reader was told to expect panels that do not exist.
                 *
                 * The basic pattern is what this is: buttons that move the
                 * carousel, with the current one marked. `aria-current` is the
                 * right word for "the one you are on" where nothing is being
                 * selected. */
                ''
              }
              ${this.slides.map(
                (_slide, at) => html`<button
                  part="indicator"
                  type="button"
                  aria-label=${`Slide ${at + 1}`}
                  aria-current=${at === this.index ? 'true' : nothing}
                  tabindex=${at === this.index ? '0' : '-1'}
                  ?data-current=${at === this.index}
                  @keydown=${this.handleIndicatorKeydown}
                  @click=${() => this.goTo(at)}
                ></button>`,
              )}
            </div>`
          : nothing
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-carousel': HelixBaseCarousel
  }
}
