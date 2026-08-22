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
 * @category content
 * @aliases Slider, Gallery, Slideshow
 * @documentation https://helix.fusion.dev/components/carousel
 *
 * @slot - The slides.
 *
 * @event {HelixSelectEvent} helix-select - Fired when the slide in view changes, with its index.
 *
 * @csspart controls - The row of controls.
 * @csspart indicator - One of them, and a way to reach that slide.
 * @csspart indicators - The row of controls saying where the reader is.
 * @csspart next - The control that moves to the next slide.
 * @csspart next-mark - The glyph on the next control.
 * @csspart previous - The control that moves to the previous slide.
 * @csspart previous-mark - The glyph on the previous control.
 * @csspart rotation - The control that stops and starts rotation.
 * @csspart rotation-mark - The glyph on the play and pause control.
 * @csspart track - The scroller the slides sit in.
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
   *
   * @controlled helix-select
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
   * Behavior rather than presentation, which is why it is here: the scroll
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

  /**
   * How many slides are shown across the track at once. Absent shows one.
   *
   * **Here rather than on the styled tier, because it decides how many places
   * the track can stop.** It was declared above as a width, which is what it
   * looks like from the stylesheet: one rule per value setting a custom
   * property, and the slides divide the track by it. But a carousel showing
   * four of six slides has three positions, not six, and everything that counts
   * positions is in this file. Left up there, `goTo` clamped to the last
   * *slide*, so three of the six indicators pointed at a scroll offset the
   * track had already reached and could not pass: pressing next walked the dots
   * to the end while the slides stopped moving a third of the way through.
   *
   * No default, because it reflects. A reflected property with a value writes
   * its attribute on upgrade, and the host then carries something a consumer's
   * server markup never had, which React reports as a mismatch. The one-across
   * case is the absent attribute, and the styles read it that way.
   */
  @property({ attribute: 'per-view', reflect: true, type: Number })
  perView?: number

  /**
   * How many distinct views the track holds, which is what the indicators count.
   *
   * A window of `perView` slides sliding one at a time over `n` of them stops
   * `n - perView + 1` times, so six slides four across is three: 0 to 3, 1 to 4,
   * 2 to 5. One at minimum, since a carousel showing everything it has still
   * has the one place to be.
   */
  get positions(): number {
    const across = Math.max(1, Math.floor(this.perView ?? 1))
    return Math.max(1, this.slides.length - across + 1)
  }

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
       indicators are one per position and a position is counted from the
       children, which the server cannot see, so they
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
    if (this.slides.length === 0) {
      return
    }
    /* Positions, not slides. The last place a four-across track of six can stop
       is the third, and clamping to the sixth gave three indices that all
       scrolled to the same clamped offset. */
    const count = this.positions
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
    const vertical = this.orientation === 'vertical'
    const target = vertical
      ? slide.offsetTop - track.offsetTop
      : slide.offsetLeft - track.offsetLeft

    /* Already there, and saying so rather than asking anyway.
     *
     * This is every index change that came *from* the track: a drag settles,
     * the index follows it, and this would then send the scroller where it
     * already is. No scroll runs, so no `scrollend` arrives, and a claim staked
     * here would be cleared by the reader's *next* drag rather than by its own
     * scroll, swallowing it. A pixel of slack, because a snapped offset is
     * fractional and an exact comparison never holds. */
    if (Math.abs(target - (vertical ? track.scrollTop : track.scrollLeft)) < 1) {
      return
    }

    /* The preference is read here, because this is where the motion is.
     *
     * `scroll-behavior: auto` in a reduce block does nothing: it restates the
     * initial value, and the scroll that actually animates is this call, which
     * names `smooth` outright and overrides the property either way. A reader
     * who asked not to be moved was moved. */
    const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    /* The scroll about to run is ours, so the `scrollend` it produces is not a
       reader saying where they went. See `handleScroll`. */
    this.settling = true
    track.scrollTo({
      behavior: still ? 'instant' : 'smooth',
      ...(vertical ? { top: target } : { left: target }),
    })
  }

  /**
   * Whether the scroll now settling is one this component asked for.
   *
   * Cleared by the first `scrollend` after it is set, and by a reader taking
   * hold of the track. The second half is not belt and braces: a `scrollTo`
   * whose target is already the scroll position fires no `scrollend` at all,
   * and the clamped end of a `per-view` track is exactly that case. Measured:
   * clicking past the last reachable slide moves `index` and produces no
   * `scrollend`, so a flag that only a `scrollend` could clear would stay set
   * and swallow the reader's next drag.
   */
  private settling = false

  /* A reader's own input on the track ends our claim on the next `scrollend`,
     whatever became of the scroll we issued. */
  private readonly handleTake = (): void => {
    this.settling = false
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

  /**
   * Reads where a reader's drag settled, and only a reader's.
   *
   * **The scroll we issued ourselves ends with a `scrollend` too, and taking it
   * as a reading is what makes the dots jump back.** This ran on every one, so
   * the index a reader had just chosen was overwritten by whichever slide
   * happened to be nearest the leading edge at the moment the animation
   * finished. Any disagreement there is enough: a snap settling a pixel short of
   * a midpoint, a target clamped by the scroller's own maximum, a fractional
   * layout, or a smooth scroll cut off by the next click. The component asked
   * for slide four, the pixels said three, and the pixels won.
   *
   * Which is the wrong precedence in one direction only. A drag is the reader
   * moving the track and the index has to follow it; a click is the reader
   * moving the index and the track has to follow *that*. One `scrollend` cannot
   * tell those apart, so the flag does.
   */
  private readonly handleScroll = (): void => {
    if (this.settling) {
      this.settling = false
      return
    }
    const track = this.renderRoot.querySelector<HTMLElement>('[part="track"]')
    if (!track) {
      return
    }
    // The nearest slide to the scroller's leading edge, so a drag that settles
    // between two reports the one it settled on.
    /* Only the leading edges a window can actually rest on. Past the last
       position every remaining slide is on screen already, and taking the
       nearest of *those* to the scroller's edge reported a place the reader
       could not get back to: dragged fully right, a four-across six reported
       the sixth slide and the dots jumped to an indicator that no longer
       existed. */
    const nearest = this.slides.slice(0, this.positions).reduce(
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
    if (nearest.index === this.index) {
      return
    }
    /* Announced whoever owns the state, written only if we do. `goTo` has this
       guard and this did not, so a consumer who declared `index` had it
       overwritten by every drag: the one thing controlled mode promises is that
       nothing but them assigns it. */
    if (!this.indexIsControlled) {
      this.indexState = nearest.index
      this.requestUpdate('index')
    }
    this.dispatchEvent(new HelixSelectEvent({ value: String(nearest.index) }))
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
                <svg part="rotation-mark"
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
          <svg part="previous-mark" fill="currentColor" viewBox=${caretLeft.viewBox} aria-hidden="true">
            ${unsafeSVG(caretLeft.content)}
          </svg>
        </button>
        <button
          part="next"
          type="button"
          aria-label="Next slide"
          @click=${() => this.goTo(this.index + 1)}
        >
          <svg part="next-mark" fill="currentColor" viewBox=${caretRight.viewBox} aria-hidden="true">
            ${unsafeSVG(caretRight.content)}
          </svg>
        </button>
      </div>
      <div
        part="track"
        @scrollend=${this.handleScroll}
        @pointerdown=${this.handleTake}
        @touchstart=${this.handleTake}
        @wheel=${this.handleTake}
      >
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
              ${Array.from({ length: this.positions }).map(
                (_place, at) => html`<button
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
