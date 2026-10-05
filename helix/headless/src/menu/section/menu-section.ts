import { customElement, HelixElement } from '@fusion.dev/helix-core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'

/**
 * @summary A group of rows in a menu, under a heading.
 *
 * @description
 * The rows inside it are the menu's rows: the arrow keys and typed letters move
 * through them with the rest, and a set of `exclusive` rows is still the run
 * of them next to each other. The section is a `group` named by its heading,
 * as React Aria's menu section is, so a screen reader says which group a row
 * is in as it arrives.
 *
 * A section goes on the menu's first page. A submenu's page takes rows and
 * dividers.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Menu group, Menu heading
 * @documentation https://fusion.dev/helix/components/menu
 *
 * @slot - The rows.
 * @slot heading - The heading, for content richer than `label`.
 *
 * @csspart heading - The words that name the section.
 * @csspart section - The group that holds the heading and the rows.
 */
@customElement('helix-headless-menu-section')
export class HelixHeadlessMenuSection extends HelixElement {
  /**
   * The heading's words, when they are plain text. Content in the `heading`
   * slot replaces it.
   */
  @property()
  label = ''

  /**
   * @internal Set by the menu: whether the section is on the page showing. A
   * property, because the menu writes it after the section upgrades.
   */
  @property({ attribute: false })
  onPage = true

  /** @internal What a menu reads to tell a section from a row. */
  readonly isMenuSection = true

  /**
   * Whether anything is slotted as the heading, read from the children before
   * each render and from the slot after. A section with neither this nor a
   * `label` draws no heading.
   */
  @state()
  private heading = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    if (this.childrenKnown) {
      this.heading = this.knownChildren.some((child) => child.slot === 'heading')
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  private readonly readHeading = (event: Event): void => {
    this.heading = (event.target as HTMLSlotElement).assignedNodes().length > 0
  }

  protected override render(): TemplateResult | typeof nothing {
    /* Off the page showing, nothing: the rows inside draw nothing either, so
       the heading would stand alone over another page's rows. */
    if (!this.onPage) {
      return nothing
    }
    /* The heading names the group from inside the same shadow root, where the
       reference resolves, and it is no heading of its own: a reader hears it
       as the group's name. */
    return html`<div part="section" role="group" aria-labelledby="heading">
      <div
        id="heading"
        part="heading"
        role="presentation"
        ?hidden=${this.label === '' && !this.heading}
      >
        <slot name="heading" @slotchange=${this.readHeading}>${this.label}</slot>
      </div>
      <slot></slot>
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-menu-section': HelixHeadlessMenuSection
  }
}
