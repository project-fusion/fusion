import { customElement, HelixElement } from '@helix-io/core'
import { html, nothing, type TemplateResult } from 'lit'
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
 * falls back to initials derived from `name`.
 *
 * `name` is required for the accessible name whether or not there is an image,
 * because an avatar with no name tells a screen-reader user nothing. Initials
 * are hidden from assistive technology: they are a visual shorthand for the
 * name that is already announced, and would otherwise be read out letter by
 * letter after it.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Profile picture, Gravatar
 * @documentation https://helix.fusion.dev/components/avatar
 *
 * @slot - Replaces the image and initials entirely, for an icon.
 *
 * @csspart avatar - The avatar body.
 * @csspart image - The image, when one is loading or loaded.
 * @csspart initials - The initials shown when there is no usable image.
 */
@customElement('helix-base-avatar')
export class HelixBaseAvatar extends HelixElement {
  /** Image to show. Falls back to initials if it fails to load. */
  @property()
  src = ''

  /** Name of the person or entity. Used for the label and the initials. */
  @property()
  name = ''

  /**
   * Whether the image failed.
   *
   * State rather than a property: it is the element's own observation, not
   * something a consumer sets, and it starts false on the server because the
   * server cannot know whether an image will load.
   */
  @state()
  private failed = false

  private readonly handleError = (): void => {
    this.failed = true
  }

  protected override render(): TemplateResult {
    const showImage = this.src !== '' && !this.failed
    const initials = initialsOf(this.name)

    return html`<span part="avatar" role="img" aria-label=${this.name || nothing}>
      <slot>
        ${
          showImage
            ? html`<img part="image" src=${this.src} alt="" @error=${this.handleError} />`
            : html`<span part="initials" aria-hidden="true">${initials}</span>`
        }
      </slot>
    </span>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-avatar': HelixBaseAvatar
  }
}
