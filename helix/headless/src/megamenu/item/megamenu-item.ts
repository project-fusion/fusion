import {
  customElement,
  HelixBeforeSelectEvent,
  HelixElement,
  HelixSelectEvent,
  plainClick,
  slotFilled,
} from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** The values `current` takes, which are `aria-current`'s. */
export type MegamenuItemCurrent = 'date' | 'location' | 'page' | 'step' | 'time' | 'true'

/**
 * @summary One destination of a megamenu's panel, a link with a name, a line about it, and an icon.
 *
 * @description
 * Draws a link to `href` in its shadow root, so a page that shares its code
 * with a phone app writes no anchor of its own. Its words are its name, an
 * icon passed into `icon` stands before them, and a sentence passed into
 * `description` stands under them. An item that holds its name alone is a
 * plain link of the panel.
 *
 * `current` is `aria-current` on the link, with its values: `page` for the
 * page the reader is on. While an item is the page, the megamenu around it
 * is in its `current` state, and a `Navigation` around that marks the
 * megamenu as its current destination.
 *
 * A router cannot reach an anchor inside a shadow root, so a plain press on
 * the link sends `helix-before-select` with the `href` as its value first, and
 * canceling it keeps the browser from following, so a client-side router
 * follows it instead, as a `Navigation Item` does. A press with a modifier
 * opens the link where the browser opens it and sends nothing. A plain
 * press closes the megamenu around it.
 *
 * Without `href`, the item draws its words with no link.
 *
 * **The item says which regions it holds**, as `:state(has-icon)` and
 * `:state(has-description)`, which the styled tier draws its two shapes by.
 * Read in the browser, so a served item carries neither until the script
 * runs.
 *
 * @since 0.224.0
 * @status experimental
 * @category navigation
 * @aliases Mega menu link, Flyout link
 * @documentation https://fusion.dev/helix/components/megamenu
 *
 * @slot - The destination's name.
 * @slot description - A line about the destination, drawn under its name.
 * @slot icon - An icon drawn before the name, such as a `helix-icon`.
 *
 * @event {HelixBeforeSelectEvent} helix-before-select - A plain press on the link, with its `href` as the value, before the browser follows it. Cancelable: cancel it to keep the browser from following, as a client-side router does.
 * @event {HelixSelectEvent} helix-select - Fired after a plain press on the link stood, with its `href` as the value, before the browser follows it.
 *
 * @csspart description - The slot the line about the destination arrives through.
 * @csspart icon - The slot the icon arrives through.
 * @csspart link - The destination, an `<a>` where `href` is set and a `<span>` where it is not.
 * @csspart name - The box the destination's name is drawn in.
 *
 * @cssstate has-description - Something is slotted into `description`.
 * @cssstate has-icon - Something is slotted into `icon`.
 */
@customElement('helix-headless-megamenu-item')
export class HelixHeadlessMegamenuItem extends HelixElement {
  /** Focus goes to the link inside, so the host is never the focus target. */
  static override shadowRootOptions: ShadowRootInit = {
    ...HelixElement.shadowRootOptions,
    delegatesFocus: true,
  }

  /**
   * Marks the destination the reader is on: `page` for the page they are
   * reading, and `location`, `step`, `date` or `time` for those. A bare
   * `current` is `true`, and `false` is not current. It is `aria-current` on
   * the link.
   *
   * Reflected, so the megamenu around the item hears the page move it.
   */
  @property({
    converter: {
      fromAttribute: (value: string | null): MegamenuItemCurrent | undefined =>
        value === null || value === 'false'
          ? undefined
          : ((value || 'true') as MegamenuItemCurrent),
    },
    reflect: true,
  })
  current?: MegamenuItemCurrent

  /**
   * The URL the destination links to. Leave it empty for an item that is no
   * link.
   */
  @property()
  href = ''

  /**
   * The link's `rel` value, which describes how the linked page relates to
   * this one.
   */
  @property()
  rel = ''

  /**
   * Where the link opens. Use it for a destination that leaves the site.
   */
  @property()
  target = ''

  /**
   * Sends `helix-before-select` for a plain press on the link, and keeps the
   * browser from following where it was canceled.
   */
  private readonly handleClick = (event: MouseEvent): void => {
    if (!plainClick(event)) {
      return
    }
    const detail = { value: this.href }
    if (!this.dispatchEvent(new HelixBeforeSelectEvent(detail))) {
      event.preventDefault()
      return
    }
    this.dispatchEvent(new HelixSelectEvent(detail))
  }

  /* Read after every render as well as on `slotchange`, because a hydrated
     slot was filled before any listener was bound and sends no change. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.readRegions()
  }

  /** Says which regions hold something, one call apiece so each pairs with its `@cssstate`. */
  private readonly readRegions = (): void => {
    const filled = (name: string): boolean =>
      slotFilled(this.renderRoot?.querySelector<HTMLSlotElement>(`slot[name="${name}"]`))
    this.toggleState('has-icon', filled('icon'))
    this.toggleState('has-description', filled('description'))
  }

  /** What the link holds: the icon, the name, and the line about it. */
  private renderContent(): TemplateResult {
    return html`<slot name="icon" part="icon" @slotchange=${this.readRegions}></slot
      ><span part="name"><slot></slot></span
      ><slot
        name="description"
        part="description"
        @slotchange=${this.readRegions}
      ></slot>`
  }

  protected override render(): TemplateResult {
    if (this.href === '') {
      return html`<span part="link" aria-current=${this.current ?? nothing}
        >${this.renderContent()}</span
      >`
    }
    return html`<a
      part="link"
      href=${this.href}
      aria-current=${this.current ?? nothing}
      rel=${this.rel || nothing}
      target=${this.target || nothing}
      @click=${this.handleClick}
      >${this.renderContent()}</a
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-megamenu-item': HelixHeadlessMegamenuItem
  }
}
