import { customElement, HelixElement, hostAria } from '@helix-io/core'
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
 * @status experimental
 * @aliases Profile picture, Gravatar
 * @documentation https://helix.fusion.dev/components/avatar
 *
 * @slot - Shown when there is no usable image, in place of the initials.
 *
 * @csspart image - The image, when one is loading or loaded.
 * @csspart initials - The initials shown when there is no usable image.
 *
 * @event {Event} load - Relayed from the image once it has loaded.
 * @event {Event} error - Relayed from the image when it fails.
 */
@customElement('helix-base-avatar')
export class HelixBaseAvatar extends HelixElement {
  /** Image to show. Falls back to the slot, or to initials, if it fails. */
  @property()
  src = ''

  /** Name of the person or entity. Used for the label and the initials. */
  @property()
  name = ''

  /** Whether the image failed. The element's own observation, never set. */
  @state()
  private failed = false

  private readonly handleError = (event: Event): void => {
    this.failed = true
    this.relayNativeEvent(event)
  }

  private readonly handleLoad = (event: Event): void => {
    this.relayNativeEvent(event)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* A new source is a new attempt.
     *
     * `failed` is an observation about the image that was loading, and it
     * outlived the image: it latched on the first error and nothing ever
     * cleared it, so an avatar that failed once fell back to initials for the
     * life of the element. A consumer swapping a broken URL for a good one, or
     * a list reusing an avatar for the next person, got the initials forever
     * and no error to say why. */
    if (changed.has('src')) {
      this.failed = false
    }
    /* A role only where there is a name to carry.
     *
     * `role="img"` was asserted unconditionally, so an avatar with no `name`
     * was an unnamed image: a screen reader announces "image" and stops, which
     * is worse than announcing nothing, because nothing is what a decorative
     * mark should be. With a name it is content and needs the role to hold it. */
    hostAria(this.internals, {
      label: this.name,
      role: this.name === '' ? '' : 'img',
    })
  }

  protected override render(): TemplateResult {
    if (this.src !== '' && !this.failed) {
      return html`<img
        part="image"
        src=${this.src}
        alt=""
        @error=${this.handleError}
        @load=${this.handleLoad}
      />`
    }

    return html`<slot>
      <span part="initials" aria-hidden="true">${initialsOf(this.name)}</span>
    </slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-avatar': HelixBaseAvatar
  }
}
