import { customElement, HelixElement, hostAria } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One cell of a table.
 *
 * @description
 * Sets its own role, because a grid of elements has no table structure for
 * assistive technology otherwise. `header` makes the cell a header, so a screen
 * reader announces it with the values it heads:
 *
 * - In a row that holds a cell without `header`, it is a `rowheader` and names
 *   its row, for example "web-app" in a row of a service's values.
 * - In a row of `header` cells alone, it is a `columnheader`, which is what a
 *   table with no `TableColumn` heads its columns with.
 *
 * The role is on the host so the cell stays a child of its row in the flat
 * tree, which keeps the table structure intact.
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
   * Whether the cell is a header: of its row in a row of values, and of its
   * column in a row of headers alone.
   */
  @property({ reflect: true, type: Boolean })
  header = false

  /**
   * @internal Read by the row and by the cells beside it, to tell a header
   * cell from a value. Not a consumer's to read or set.
   */
  readonly isTableCell = true

  /**
   * Whether this cell, as a header, heads its row: true where the row also
   * holds a cell that is not a header.
   *
   * The rule a browser applies to a `<th>` with no `scope`. Read from the
   * siblings, which a server does not have, so a server render waits for the
   * client to say which.
   */
  private get headsRow(): boolean {
    const siblings = [...(this.parentElement?.children ?? [])]
    return siblings.some(
      (sibling) =>
        sibling !== this &&
        'isTableCell' in sibling &&
        !sibling.hasAttribute('header') &&
        (sibling as HelixHeadlessTableCell).header !== true,
    )
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // In `willUpdate`, which the server does call, unlike `connectedCallback`.
    const header = this.headsRow ? 'rowheader' : 'columnheader'
    hostAria(this.internals, { role: this.header ? header : 'cell' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* A cell that stops or starts being a header changes what the header cells
       beside it head, and nothing else tells them. */
    if (changed.has('header') && changed.get('header') !== undefined) {
      for (const sibling of this.parentElement?.children ?? []) {
        if (sibling !== this && 'isTableCell' in sibling) {
          ;(sibling as HelixHeadlessTableCell).requestUpdate()
        }
      }
    }
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
