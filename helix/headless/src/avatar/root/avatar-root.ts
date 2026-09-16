import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** Initials for a name: first letter of the first and last words. */
export const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return ''
  }
  /* By code point, not by code unit.
   *
   * `word[0]` indexes UTF-16, so a name beginning with anything outside the
   * basic plane, an emoji or most of the world's less common scripts, yields a
   * lone surrogate and the avatar paints U+FFFD. Spreading a string iterates
   * code points, which is what a first letter means. */
  const initial = (word: string | undefined): string => [...(word ?? '')][0] ?? ''
  const first = initial(words[0])
  const last = words.length > 1 ? initial(words[words.length - 1]) : ''
  return (first + last).toUpperCase()
}

/**
 * @summary Represents a person or entity with an image or their initials.
 *
 * @description
 * Shows `src` until it fails to load. Without an image, or after a failure,
 * the default slot is shown; its own fallback is the initials.
 *
 * The host carries the accessible name, taken from `name`, so the `<img>` has an
 * empty `alt` and the initials are hidden from assistive technology. Announcing
 * either would repeat the name. An `aria-label` on the host overrides `name`,
 * for an avatar standing for something a person's name does not describe.
 *
 * `load` and `error` are relayed from the host. They are not composed, so they
 * stop at the shadow boundary otherwise.
 *
 * @since 0.1.0
 * @status stable
 * @category media
 * @aliases Profile picture, Gravatar
 * @documentation https://fusion.dev/helix/components/avatar
 *
 * @slot - Shown when there is no usable image, in place of the initials.
 *
 * @event {Event} error - Relayed from the image when it fails.
 * @event {Event} load - Relayed from the image once it has loaded.
 *
 * @csspart image - The image, when one is loading or loaded.
 * @csspart initials - The initials shown when there is no usable image.
 */
@customElement('helix-headless-avatar')
export class HelixHeadlessAvatar extends HelixElement {
  /**
   * Name of the person or entity.
   *
   * Used for the label and the initials.
   */
  @property()
  name = ''

  /**
   * Image to show.
   *
   * Falls back to the slot, or to initials, if it fails.
   */
  @property()
  src = ''

  /**
   * Where the image stands: still on its way, arrived, or failed and replaced
   * by the initials.
   *
   * Read-only to a consumer: it is a report rather than a setting, and the same
   * report `Image` gives, for the same reason. `load` and `error` fire once, so
   * a listener bound after the picture settled hears neither, which is the
   * platform on an `<img>` too, and this is what that listener asks instead.
   * Mirrored to `data-status` rather than reflected, as `Image` explains.
   */
  @property({ attribute: false })
  status: 'error' | 'loaded' | 'loading' = 'loading'

  /**
   * Whether the picture failed, which is what the fallback draws from.
   *
   * **Separate from `status`, because the two move at different moments** for
   * a picture a server sent: the fallback belongs on screen at once, while the
   * report waits for the event it reports, below.
   */
  @state()
  private broken = false

  private readonly handleError = (event: Event): void => {
    this.broken = true
    this.status = 'error'
    this.relayNativeEvent(event)
  }

  private readonly handleLoad = (event: Event): void => {
    this.status = 'loaded'
    this.relayNativeEvent(event)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A new source is a new attempt.
     *
     * `status` is an observation about the image that was loading, so it has to
     * be cleared with the source. Latched, an avatar that failed once falls back
     * to initials for the life of the element, and a consumer swapping a broken
     * URL for a good one, or a list reusing an avatar for the next person, gets
     * the initials forever with no error to say why. */
    if (changed.has('src')) {
      this.broken = false
      this.status = 'loading'
    }
    /* A role only where there is a name to carry.
     *
     * An unconditional `role="img"` makes an avatar with no `name` an unnamed
     * image: a screen reader announces "image" and stops, which is worse than
     * announcing nothing, because nothing is what a decorative mark should be.
     * With a name it is content and needs the role to hold it. */
    hostAria(this.internals, {
      label: this.name,
      role: this.name === '' ? '' : 'img',
    })
  }

  /* **An image a server sent was fetched while the page was parsed**, and its
     `load` or `error` fired before anything here could listen: a broken one
     never fell back to initials and nothing was relayed. So it is asked what
     already happened, once: the fallback is now, and the relay a task later,
     so a page's scripts, which run once the definitions have hydrated what the
     server sent, are listening when it arrives, as they are for a real one. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    const image = this.serverRendered ? this.renderRoot.querySelector('img') : null
    if (image?.complete) {
      const broken = image.naturalWidth === 0
      this.broken = broken
      /* **The report moves with the event, never before it.** A script that
         asks `status` once it is listening, and then hears the event, would
         otherwise count this picture twice: measured by `check:spec:dsd`, where
         the events example hydrated with its error logged two times. */
      setTimeout(() => {
        this.status = broken ? 'error' : 'loaded'
        this.relayNativeEvent(new Event(broken ? 'error' : 'load'))
      })
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* The mirror, written here rather than reflected, the way `Image` writes
       it: `loading` is the resting state and writes nothing. */
    if (changed.has('status')) {
      if (this.status === 'loading') {
        this.removeAttribute('data-status')
      } else {
        this.setAttribute('data-status', this.status)
      }
    }
  }

  protected override render(): TemplateResult {
    if (this.src !== '' && !this.broken) {
      return html`<img
        part="image"
        src=${this.src}
        alt=""
        @error=${this.handleError}
        @load=${this.handleLoad}
      />`
    }

    return this.renderInitials()
  }

  /**
   * The mark shown where no image loaded, behind a seam a tier can move.
   *
   * A consumer replaces it by slotting something; a tier above replaces it by
   * overriding this, and those answer different people. Written inline it
   * answers only the first, and a styled tier wanting initials drawn its own way
   * has to reimplement the whole template to reach three elements.
   */
  protected renderInitials(): TemplateResult {
    return html`<slot>
      <span part="initials" aria-hidden="true">${initialsOf(this.name)}</span>
    </slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-avatar': HelixHeadlessAvatar
  }
}
