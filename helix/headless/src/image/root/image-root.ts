import { customElement, DelayController, HelixElement, reportRuntime } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary An image that shows a placeholder while it loads and a fallback if it fails.
 *
 * @description
 * Image handles the part CSS cannot: when the picture has loaded, or that it
 * failed. `aspect-ratio` in your stylesheet reserves the box. The element
 * tracks three states and relays the two events that move between them, and
 * leaves the box to the stylesheet.
 *
 * The `placeholder` slot is empty by default, so the headless tier does not
 * depend on `Skeleton`, which it does not ship.
 *
 * The placeholder is hidden from screen readers, the picture having a name of
 * its own. The fallback is read once the picture fails, after the picture's
 * `alt`, so a reader hears that it did not load, as a sighted reader sees.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Picture, Img, Figure
 * @documentation https://fusion.dev/helix/components/image
 *
 * @slot fallback - Shown in place of the image if it fails to load, and read by screen readers then, such as "Photo unavailable".
 * @slot placeholder - Shown until the image loads.
 *
 * @event {Event} error - The image failed to load. Relayed from the inner image, whose own event stays inside the shadow root.
 * @event {Event} load - The image loaded. Relayed from the inner image, whose own event stays inside the shadow root.
 *
 * @csspart fallback - The fallback, shown when the image fails to load.
 * @csspart image - The image itself.
 * @csspart placeholder - The placeholder, shown until the image loads.
 *
 * @cssstate error - The image failed to load, and the fallback shows.
 * @cssstate loaded - The image loaded.
 */
@customElement('helix-headless-image')
export class HelixHeadlessImage extends HelixElement {
  /**
   * A text description of the image, read by screen readers.
   *
   * Empty is a real answer and means decoration. Omitting the attribute is not
   * the same thing: the inner image is then written with no `alt` either, as a
   * native one would be, so a screen reader announces the file name and an
   * accessibility checker reports the missing description.
   */
  @property()
  alt?: string

  /**
   * How the image is fetched across origins. It decides whether a canvas can
   * read the image.
   */
  @property({ attribute: 'crossorigin' })
  crossOrigin: 'anonymous' | 'use-credentials' | null = null

  /**
   * Whether the browser may decode the image off the main thread.
   *
   * `async` is the resting value and right for a picture in a page. `sync` is
   * what a consumer reaches for when the picture is about to be composited with
   * something else and a tear would show.
   */
  @property()
  decoding: 'async' | 'auto' | 'sync' = 'async'

  /**
   * How urgently the browser fetches the image. Set `high` on the main image
   * of a page.
   *
   * The hero of a page is usually its largest contentful paint, and the fix is
   * two attributes rather than one: `loading="eager"` stops it waiting for the
   * viewport, and this stops it queueing behind everything else the parser
   * found first. Left alone the browser decides, which is right for the other
   * ninety-nine pictures.
   */
  @property({ attribute: 'fetchpriority' })
  fetchPriority: 'auto' | 'high' | 'low' = 'auto'

  /**
   * Whether the image waits to load until it is nearly on screen. Defaults to
   * `lazy`.
   *
   * `lazy` by default, which is the opposite of the platform's, because a
   * picture worth putting in a component is usually below the fold and the one
   * that is not is the exception worth writing down.
   */
  @property({ reflect: true })
  loading?: 'eager' | 'lazy'

  /**
   * How long, in milliseconds, the placeholder waits before it shows.
   *
   * Absent or `0` shows it at once. A picture that arrives inside
   * the wait never shows a placeholder at all, so a cached or fast image does
   * not flash one. Radix's `delayMs` on its avatar fallback is the same idea.
   */
  @property({ attribute: 'placeholder-delay', type: Number })
  placeholderDelay = 0

  /**
   * How much of the referring URL to send with the request.
   */
  @property({ attribute: 'referrerpolicy' })
  referrerPolicy = ''

  /**
   * The width the image takes in the layout, passed through to the inner image.
   */
  @property()
  sizes = ''

  /**
   * The URL of the image.
   */
  @property()
  src = ''

  /**
   * The candidate files and their widths, passed through to the inner image.
   */
  @property()
  srcset = ''

  /**
   * The loading state: `loading`, `loaded`, or `error`.
   *
   * Read-only to a consumer: it is a report rather than a setting.
   *
   * **Mirrored to `data-status`, and not reflected as `status`.** It is element
   * state, so reflecting it puts the element's own bookkeeping into the markup
   * a consumer rendered: React reads the attribute appearing at upgrade as a
   * hydration mismatch, and a host pasted back carrying `status="loaded"`
   * declares that a picture has arrived which this element has never fetched.
   * The `data-` name is the library's answer to both, being a name a re-parse
   * cannot mistake for a declaration, and it is what `data-closed` on
   * `Toast.Item` already does. A picture arrives after somebody fetched it,
   * which puts this on the safe side of hydration: a fact that can be true on
   * the *first* update mirrors to a custom state instead, which is what
   * `:state(open)` and `:state(checked)` are.
   *
   * `loading` writes nothing, because it is where every image starts and the
   * resting state of a mirror is the attribute's absence.
   */
  @property({ attribute: false })
  status: 'error' | 'loaded' | 'loading' = 'loading'

  /**
   * Which `src` the current status belongs to, so a new one starts over.
   */
  @state()
  private answered = ''

  /** The placeholder's wait for this `src`, and whether it is over. */
  private readonly wait = new DelayController(this)

  /**
   * Whether this picture's answer has been given, or is on its way.
   *
   * `status` cannot say so for a picture a server sent, since it waits a task
   * for the event it reports, and `settle` runs twice in the first update.
   */
  private reported = false

  /**
   * The event `settle` sent for a picture that finished before anything
   * listened, so the platform's own, still on its way, is not sent again.
   */
  private synthesized: 'error' | 'load' | undefined = undefined

  /**
   * Says so under the platform's own name, because the platform's cannot escape.
   *
   * `load` and `error` on an `<img>` neither bubble nor compose, so the ones
   * fired inside this shadow root reach nobody outside it. Re-emitting from the
   * host is what `relayNativeEvent` is for, and it is what `Avatar` already does
   * for the same pair on the same element.
   *
   * **Unprefixed, unlike every other event here.** The prefix exists to stop a
   * collision with a native name, and there is none to collide with: the native
   * events cannot reach a consumer at all.
   *
   * **Not bubbling, and that is not a small point.** A bubbling relay of `load`
   * would be the tempting one, letting a gallery count its pictures with one
   * listener, and it reaches nothing in React: `load` is in react-dom's
   * `nonDelegatedEvents`, so there is no root
   * listener to catch it, and React attaches a direct one for `<img>` and never
   * for a custom element. `bindReactHandler` binds exactly the non-bubbling
   * ones, so matching the native propagation is what makes `onLoad` work at
   * all. A gallery does here what it already does for `<img>`, which is listen
   * in the capture phase or listen per picture.
   */
  private announce(status: 'error' | 'loaded', event?: Event): void {
    this.reported = true
    const name = status === 'loaded' ? 'load' : 'error'
    if (event) {
      /* The platform's own event for a picture `settle` already answered for.
         A cached picture is complete before anything listens, and its `load`
         is still queued: relayed as well, a page heard it twice. */
      if (this.synthesized === name) {
        this.synthesized = undefined
        return
      }
      this.status = status
      this.relayNativeEvent(event)
      return
    }
    this.synthesized = name
    /* No original to relay: `settle` catches a picture that was already
       complete when the listener attached, which is the cached case, and the
       platform fired its `load` before anyone was listening. The synthesized
       one carries the native propagation rather than defaults, so a consumer
       cannot tell the two paths apart.

       A task later where a server sent the picture, so a page's scripts, which
       run once the definitions have hydrated what was sent, are listening when
       it arrives, as they would be for the real one. */
    /* **The report moves with the event, never before it**, so a script that
       asks `status` once it is listening and then hears the event cannot count
       one picture twice. */
    const send = (): void => {
      this.status = status
      this.dispatchEvent(new Event(name, { bubbles: false, cancelable: false, composed: false }))
    }
    if (this.serverRendered) {
      setTimeout(send)
    } else {
      send()
    }
  }

  private readonly handleLoad = (event: Event): void => {
    this.announce('loaded', event)
  }

  private readonly handleError = (event: Event): void => {
    this.announce('error', event)
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
   * image it has, so deciding `error` here calls every picture broken the moment
   * it renders. Failure has an event of its own and that event is reliable, so
   * this is only here to catch the success that happened too early to hear.
   *
   * **Except for a picture a server sent**, which a real browser's parser has
   * already fetched: finished with no pixels there is a failure, and its `error`
   * fired before anything could listen, so the placeholder stayed up over a
   * picture that was never coming.
   *
   * **Once per picture.** The first update asks from `firstUpdated` and from
   * `updated`, and a picture already finished answered both, so a page heard
   * every cached `load`, and every `error` a server's page had, twice.
   */
  private settle(): void {
    const image = this.renderRoot?.querySelector('img')
    if (this.src === '' || this.reported || !image?.complete) {
      return
    }
    if (image.naturalWidth > 0) {
      this.announce('loaded')
    } else if (this.serverRendered) {
      this.announce('error')
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A new picture is a new question, so the old answer goes. Without this a
       second `src` inherits the first one's `loaded` and never shows its own
       placeholder. */
    if (changed.has('src') && this.answered !== this.src) {
      this.answered = this.src
      this.reported = false
      this.synthesized = undefined
      this.status = 'loading'
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    if (changed.has('src')) {
      this.settle()
    }
    if (changed.has('src') || changed.has('placeholderDelay')) {
      this.startWait()
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
      /* And as custom states, which a stylesheet reaches without an attribute
         on the consumer's markup: `:state(loaded)`, `:state(error)`. */
      this.toggleState('loaded', this.status === 'loaded')
      this.toggleState('error', this.status === 'error')
    }
  }

  /* Client only, from `updated`, so a server serves the placeholder hidden
     while there is a wait and shown when there is none. */
  private startWait(): void {
    this.wait.start(this.placeholderDelay > 0 ? this.placeholderDelay : undefined)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated?.(changed)
    this.settle()
    /* Once, at the first render: an image with no `alt` is announced by its
       file name, and empty is how a page says it is decoration. Hidden from
       the reader, it needs neither. */
    if (this.alt === undefined && this.getAttribute('aria-hidden') !== 'true') {
      reportRuntime({
        kind: 'missing-alt',
        message:
          `<${this.localName}> has no \`alt\`, so a screen reader announces its file name. ` +
          'Describe the picture in `alt`, or write `alt=""` for one that is decoration.',
        tag: this.localName,
      })
    }
  }

  /**
   * The picture's own state, under the platform's own names.
   *
   * The `<img>` is inside this shadow root and `querySelector` does not cross a
   * shadow boundary, so a consumer asking how big the picture turned out to be,
   * or whether it is already there, has nowhere else to ask. `status` answers a
   * narrower question in this library's words and is no substitute for the
   * numbers.
   *
   * `naturalWidth` and `naturalHeight` are the case worth having: they are how
   * a consumer sizes a lightbox or works out an aspect ratio, and they exist
   * nowhere else on the page.
   */
  private get image(): HTMLImageElement | null {
    return this.renderRoot?.querySelector('img') ?? null
  }

  /** Whether the image has finished loading, successfully or not. */
  get complete(): boolean {
    return this.image?.complete ?? false
  }

  /** The candidate the browser chose from `srcset`. */
  get currentSrc(): string {
    return this.image?.currentSrc ?? ''
  }

  /** The image's intrinsic height in pixels. Zero until the image loads. */
  get naturalHeight(): number {
    return this.image?.naturalHeight ?? 0
  }

  /** The image's intrinsic width in pixels. Zero until the image loads. */
  get naturalWidth(): number {
    return this.image?.naturalWidth ?? 0
  }

  protected override render(): TemplateResult {
    return html`<img
        part="image"
        alt=${this.alt ?? nothing}
        loading=${this.loading ?? 'lazy'}
        decoding=${this.decoding}
        crossorigin=${this.crossOrigin ?? nothing}
        referrerpolicy=${this.referrerPolicy || nothing}
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
        ?hidden=${this.status !== 'loading' || (this.placeholderDelay > 0 && !this.wait.elapsed)}
        ><slot name="placeholder"></slot
      ></span>
      <span
        part="fallback"
        aria-hidden=${this.status === 'error' ? nothing : 'true'}
        ?hidden=${this.status !== 'error'}
        ><slot name="fallback"></slot
      ></span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-image': HelixHeadlessImage
  }
}
