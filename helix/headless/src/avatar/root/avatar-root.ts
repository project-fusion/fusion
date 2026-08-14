import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/** Initials for a name: first letter of the first and last words. */
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
    this.internals.role = 'img'
    this.internals.ariaLabel = this.name || null
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
