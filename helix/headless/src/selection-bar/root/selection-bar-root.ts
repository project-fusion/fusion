import { customElement, formatWords, HelixElement, words } from '@fusion.dev/helix-core'
import { html, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { TableBinding, type ToolTable } from '../../data-table/binding.js'

/**
 * @summary A bar that says how many of a Data Table's rows are selected, with what you can do to them and a way to clear them.
 *
 * @description
 * Put it in a `DataTable`'s `selection` slot, and it takes the toolbar's
 * place while rows are selected. Slot your actions into it, such as Archive
 * and Export, and Clear unselects every row.
 *
 * ```html
 * <helix-data-table selectable row-key="id">
 *   <helix-selection-bar slot="selection">
 *     <helix-button>Archive</helix-button>
 *   </helix-selection-bar>
 * </helix-data-table>
 * ```
 *
 * Written inside the table, it finds the table. Written anywhere else, set
 * `for` to the table's id. Clear asks the table with `helix-before-select`,
 * as a reader's own choice does.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Bulk actions, Action bar
 * @documentation https://fusion.dev/helix/components/selection-bar
 *
 * @slot - What you can do to the selected rows, such as buttons.
 *
 * @csspart actions - The region that holds the slotted actions.
 * @csspart clear - The button that clears the selection.
 * @csspart count - Says how many rows are selected.
 */
@customElement('helix-headless-selection-bar')
export class HelixHeadlessSelectionBar extends HelixElement {
  /**
   * The key this family's words are registered under, its styled tag:
   * `registerWords('de', { 'helix-selection-bar': { clearLabel: 'Auswahl aufheben' } })`.
   */
  static words = 'helix-selection-bar'

  /** The words on the button that clears the selection. */
  @words
  @property({ attribute: 'clear-label' })
  clearLabel = 'Clear'

  /** What the bar says. `{count}` is how many rows are selected. */
  @words
  @property({ attribute: 'count-label' })
  countLabel = '{count} selected'

  /**
   * The id of the `DataTable` whose selection the bar shows, in the same
   * document or shadow root. Left empty, the bar takes the table it is written
   * in.
   */
  @property()
  for = ''

  protected readonly binding = new TableBinding(this)

  /** The bound table, once it is in the tree. */
  get table(): ToolTable | null {
    return this.binding.table
  }

  /** How many rows are selected. */
  get count(): number {
    return this.table?.selected.split(',').filter(Boolean).length ?? 0
  }

  /** Unselects every row, as Clear does. Returns whether the selection changed. */
  clear(): boolean {
    return this.table?.selectRows([]) ?? false
  }

  protected override render(): TemplateResult {
    return html`<span part="count">${formatWords(this, 'countLabel', { count: this.count })}</span>
      <div part="actions"><slot></slot></div>
      <button part="clear" type="button" @click=${() => this.clear()}>${this.clearLabel}</button>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-selection-bar': HelixHeadlessSelectionBar
  }
}
