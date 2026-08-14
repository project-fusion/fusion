import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * Initials for a name: first letter of the first and last words.
 *
 * A pure function of the name, so the server and the client agree without
 * either of them measuring anything.
 */
export const initialsOf = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return ''
  }
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/**
 * @summary Represents a person or entity with an image or their initials.
 *
 * @description
 * The fallback is the reason this is an element. An image that fails to load
 * leaves a broken icon and no name, so the avatar listens for the error and
 * falls back: to whatever was slotted, or to initials derived from `name`.
 *
 * **One element, not three.** A separate image and fallback would each need to
 * be written for every avatar and would have to coordinate through an event,
 * and the only thing that buys is trying several sources in turn. The fallback
 * carries no behavior at all, which by the rule here makes it a slot; the image
 * does own load state, but the root already owns it.
 *
 * `name` is required for the accessible name whether or not there is an image,
 * because an avatar with no name tells a screen-reader user nothing. Initials
 * are hidden from assistive technology: they are a visual shorthand for the
 * name that is already announced, and would otherwise be read out letter by
 * letter after it.
 *
 * The `<img>` keeps an empty `alt` for the same reason. The host carries the
 * accessible name through `ElementInternals`, so a populated `alt` would
 * announce the same person twice.
 *
 * The image's own `load` and `error` are relayed from the host. They are not
 * composed, so they stop at the shadow boundary otherwise, and relaying them
 * under their native names is what lets a consumer wait for an avatar the way
 * they would wait for any image.
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

  /**
   * Accessible name, when it should differ from `name`.
   *
   * `name` is what the initials are drawn from, so it has to be a person's
   * name. This is for the cases where what should be announced is not: an
   * avatar standing for a whole team, or one whose label carries a role.
   */
  @property()
  label = ''

  /**
   * Whether the image failed.
   *
   * State rather than a property: it is the element's own observation, not
   * something a consumer sets, and it starts false on the server because the
   * server cannot know whether an image will load.
   */
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
    // On the host through internals, so the avatar announces itself without
    // taking an attribute a consumer's server markup never had.
    this.internals.role = 'img'
    this.internals.ariaLabel = this.label || this.name || null
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

    // The slot is the fallback rather than a replacement for everything, so a
    // consumer can say "this image, and my icon if it fails" rather than having
    // to choose between an image and their own content. Its own fallback is the
    // initials, which is what an unfilled slot renders.
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
