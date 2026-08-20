import { customElement, HelixElement } from '@helix-io/core'
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
 * consumer who wants a `Skeleton`, a blurred thumbnail or a solid colour slots
 * it.
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
  loading: 'eager' | 'lazy' = 'lazy'

  /** The candidate widths, passed through to the picture. */
  @property()
  srcset = ''

  /** How much of the line it will take, passed through to the picture. */
  @property()
  sizes = ''

  /**
   * Whether the picture is on its way, here, or never coming.
   *
   * Reflected, so a stylesheet can answer all three without a rule per part,
   * and read-only to a consumer: it is a report rather than a setting.
   */
  @property({ reflect: true })
  status: 'error' | 'loaded' | 'loading' = 'loading'

  /** Which `src` the current status belongs to, so a new one starts over. */
  @state()
  private answered = ''

  private readonly handleLoad = (): void => {
    this.status = 'loaded'
  }

  private readonly handleError = (): void => {
    this.status = 'error'
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
    this.status = 'loaded'
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
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.settle()
  }

  protected override render(): TemplateResult {
    return html`<img
        part="image"
        alt=${this.alt}
        loading=${this.loading}
        decoding="async"
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
