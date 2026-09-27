import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One cell of a table.
 *
 * @description
 * Carries its own role, because a grid of divs is not a table to anything
 * reading it. `header` makes the cell a `columnheader`, which is what lets a
 * screen reader announce "Attribute, appearance" rather than just the value.
 *
 * The role goes on the host rather than inside the shadow root, because the
 * cell has to be a child of its row in the flat tree for the table's structure
 * to hold together.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Cell, TableCell
 * @documentation https://fusion.dev/helix/components/table
 *
 * @slot - The cell's content.
 *
 * @cssproperty --table-cell-align - The text alignment of the column above the cell: `start`, `center`, or `end`, and unset when the column sets none. The table writes it, and the stylesheet that draws the cell reads it for `justify-content` and `text-align`, which both follow the writing direction.
 *
 * @cssstate text - The cell holds text of its own, beside or instead of elements, so the stylesheet lets its content flow as a line of text.
 */
@customElement('helix-headless-table-cell')
export class HelixHeadlessTableCell extends HelixElement {
  /**
   * Whether the cell is the header cell of its column.
   */
  @property({ reflect: true, type: Boolean })
  header = false

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // In `willUpdate`, which the server does call, unlike `connectedCallback`.
    hostAria(this.internals, { role: this.header ? 'columnheader' : 'cell' })
  }

  /**
   * Sets the `text` state from the cell's own content.
   *
   * Only text nodes count, and only ones with more than whitespace. A cell of
   * elements alone keeps its elements laid out as they were, which is what a
   * lone tag, button, or block of text wants.
   */
  private readonly handleSlotChange = (): void => {
    const text = [...this.childNodes].some(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
    )
    this.toggleState('text', text)
  }

  protected override render(): TemplateResult {
    return html`<slot @slotchange=${this.handleSlotChange}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-table-cell': HelixHeadlessTableCell
  }
}
