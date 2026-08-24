import { customElement, HelixElement, HelixErrorEvent, HelixLoadEvent } from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A picture that says whether it arrived.
 *
 * @description
 * **An element rather than a recipe, because of the part CSS cannot do.**
 * Reserving the box is `aspect-ratio` and needs nothing from anybody; `Link` and
 * the megamenu row are recipes in `base.css` for exactly that reason. What
 * cannot be written as a rule is *when the picture arrived*: a stylesheet has no
 * way to know, and no way to hear that it never will. So this owns three states
 * and the two events that move between them, and leaves the box to the
 * stylesheet.
 *
 * **The placeholder is a slot with nothing in it by default.** A default of
 * `Skeleton` would be right and is not written here: this tier renders no other
 * component, and reaching for one would make the headless package depend on the
 * styled one. The styled tier draws the resting placeholder instead, and a
 * consumer who wants a `Skeleton`, a blurred thumbnail or a solid color slots
 * it.
 *
 * **No source is a loading state, not a fourth one.** A picture whose `src` has
 * not arrived yet is the common case for anything drawn from data, and the
 * useful answer there is the same as for one still on the wire: stand something
 * in its place and keep the ground reserved. So an element with no `src` shows
 * its placeholder and waits, rather than resolving to an empty box that has to
 * be laid out twice.
 *
 * **`alt` is a property and not an afterthought.** An empty string is a real
 * answer, meaning the picture is decoration and a screen reader should skip it,
 * which is why the attribute is always written even when it is empty: omitting
 * it entirely makes a reader announce the file name instead.
 *
 * @since 0.1.0
 * @status experimental
 * @category content
 * @aliases Picture, Img, Figure
 * @documentation https://helix.fusion.dev/components/image
 *
 * @slot placeholder - Shown until the picture arrives.
 * @slot fallback - Shown instead of it, if it never does.
 *
 * @event {HelixLoadEvent} helix-load - The picture arrived.
 * @event {HelixErrorEvent} helix-error - It is not coming.
 *
 * @csspart image - The picture itself.
 * @csspart placeholder - What stands in until it arrives.
 * @csspart fallback - What stands in when it fails.
 */
@customElement('helix-base-image')
export class HelixBaseImage extends HelixElement {
  /** Where the picture is. */
  @property()
  src = ''

  /**
   * What it shows, for a reader who cannot see it.
   *
   * Empty is a real answer and means decoration. Omitting the attribute is not
   * the same thing: a reader with nothing to read announces the file name.
   */
  @property()
  alt = ''

  /**
   * Whether to wait until it is nearly on screen.
   *
   * `lazy` by default, which is the opposite of the platform's, because a
   * picture worth putting in a component is usually below the fold and the one
   * that is not is the exception worth writing down.
   */
  @property({ reflect: true })
  loading?: 'eager' | 'lazy'

  /** The candidate widths, passed through to the picture. */
  @property()
  srcset = ''

  /** How much of the line it will take, passed through to the picture. */
  @property()
  sizes = ''

  /**
   * How urgently to fetch it, for the one picture that is the page.
   *
   * The hero of a page is usually its largest contentful paint, and the fix is
   * two attributes rather than one: `loading="eager"` stops it waiting for the
   * viewport, and this stops it queueing behind everything else the parser
   * found first. Left alone the browser decides, which is right for the other
   * ninety-nine pictures.
   */
  @property({ attribute: 'fetch-priority' })
  fetchPriority: 'auto' | 'high' | 'low' = 'auto'

  /**
   * Whether the picture is on its way, here, or never coming.
   *
   * Read-only to a consumer: it is a report rather than a setting.
   *
   * **Mirrored to `data-status`, and not reflected as `status`.** It is element
   * state, so reflecting it puts the element's own bookkeeping into the markup
   * a consumer rendered: React reads the attribute appearing at upgrade as a
   * hydration mismatch, and a serialized `<helix-image status="loaded">` pasted
   * back declares that a picture has arrived which this element has never
   * fetched. The `data-` name is the library's answer to both, being a
   * different name a re-parse cannot mistake for a declaration, and it is what
   * `data-open` and `data-checked` already do.
   *
   * `loading` writes nothing, because it is where every image starts and the
   * resting state of a mirror is the attribute's absence.
   */
  @property({ attribute: false })
  status: 'error' | 'loaded' | 'loading' = 'loading'

  /** Which `src` the current status belongs to, so a new one starts over. */
  @state()
  private answered = ''

  /**
   * Says so, because the platform's own saying of it cannot be heard.
   *
   * `load` and `error` on an `<img>` neither bubble nor compose, so the ones
   * fired inside this shadow root reach nobody outside it. A consumer had a
   * reflected attribute and a `MutationObserver` and nothing else.
   */
  private announce(status: 'error' | 'loaded'): void {
    this.status = status
    const event =
      status === 'loaded'
        ? new HelixLoadEvent({ src: this.src })
        : new HelixErrorEvent({ src: this.src })
    this.dispatchEvent(event)
  }

  private readonly handleLoad = (): void => {
    this.announce('loaded')
  }

  private readonly handleError = (): void => {
    this.announce('error')
  }

  /**
   * Catches the picture that was already there.
   *
   * A cached image can finish loading before this element has a listener on it,
   * and then `load` never fires and the placeholder stays up over a picture that
   * is sitting right behind it. `complete` is the platform's own answer to that
   * question, and `naturalWidth` separates a decoded picture from one that
   * carries no pixels, which `complete` reports as finished either way.
   *
   * **It can only ever conclude success.** A picture that has not been attempted
   * looks exactly like one that failed: `complete` is true and `naturalWidth` is
   * zero for both, and a DOM that never fetches anything reports that for every
   * image it has. Deciding `error` here called every picture broken the moment
   * it rendered. Failure has an event of its own and that event is reliable, so
   * this is only here to catch the success that happened too early to hear.
   */
  private settle(): void {
    const image = this.renderRoot?.querySelector('img')
    if (this.src === '' || !image?.complete || image.naturalWidth === 0) {
      return
    }
    this.announce('loaded')
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A new picture is a new question, so the old answer goes. Without this a
       second `src` inherits the first one's `loaded` and never shows its own
       placeholder. */
    if (changed.has('src') && this.answered !== this.src) {
      this.answered = this.src
      this.status = 'loading'
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    if (changed.has('src')) {
      this.settle()
    }
    /* The mirror, written here rather than reflected. `loading` is the resting
       state and writes nothing, so a picture on its way carries no attribute
       and one that has arrived or failed says which. */
    if (changed.has('status')) {
      if (this.status === 'loading') {
        this.removeAttribute('data-status')
      } else {
        this.setAttribute('data-status', this.status)
      }
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.settle()
  }

  protected override render(): TemplateResult {
    return html`<img
        part="image"
        alt=${this.alt}
        loading=${this.loading ?? 'lazy'}
        decoding="async"
        fetchpriority=${this.fetchPriority}
        src=${this.src || nothing}
        srcset=${this.srcset || nothing}
        sizes=${this.sizes || nothing}
        @load=${this.handleLoad}
        @error=${this.handleError}
      />
      <span
        part="placeholder"
        aria-hidden="true"
        ?hidden=${this.status !== 'loading'}
        ><slot name="placeholder"></slot
      ></span>
      <span
        part="fallback"
        aria-hidden="true"
        ?hidden=${this.status !== 'error'}
        ><slot name="fallback"></slot
      ></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-image': HelixBaseImage
  }
}
