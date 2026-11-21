import { customElement, formatWords } from '@fusion.dev/helix-core'
import { HelixHeadlessViewPanel } from '@fusion.dev/helix-headless/view-panel'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit/static-html.js'
import { styles } from './view-panel-root.css.js'
import '../../button/index.js'
import '../../radio/index.js'

/**
 * @summary A panel that changes a Data Table's whole view on a phone: its presets, filters, sort, columns, and export.
 *
 * @description
 * Each section is a row a thumb can reach, its name at the start and what it
 * holds muted at the end, before a caret. Show is the full-width solid
 * button at the foot of the panel.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases View drawer, View sheet, Mobile filters
 * @use Every part of a Data Table's view in one panel, such as a drawer on a phone.
 * @instead drawer - A panel of any content that slides in from an edge.
 * @instead column-manager - The columns alone, beside the table on a wide screen.
 * @instead quick-filters - Presets in a row above the table.
 * @anatomy header
 * @anatomy presets?
 * @anatomy section
 * @anatomy summary
 * @anatomy show
 * @practice Put View Panel in a Drawer opened by one View button. - On a phone a table has no room above it for a filter field, a Columns button, and an Export button.
 * @practice Show the View button at the widths that need it, and the tools above the table at the rest. - The panel takes no width of its own.
 * @practice Show `active` in a badge on the View button. - It counts the search and the filters the view holds.
 * @documentation https://fusion.dev/design/components/view-panel
 *
 * @cssproperty --view-panel-rule-color - The line between the sections.
 */
@customElement('helix-view-panel')
export class HelixViewPanel extends HelixHeadlessViewPanel {
  static override styles: CSSResultGroup = styles

  static override tier = 'helix-'

  /** Show is the solid primary button, the panel's width. */
  protected override renderShow(count: number): TemplateResult {
    const button = this.tag('button')
    return html`<${button}
      part="show"
      emphasis="solid"
      tone="primary"
      width="full"
      exportparts="button: show-button, live: show-live, spinner: show-spinner, text: show-text"
      @click=${() => this.show()}
      >${formatWords(this, 'showLabel', { count })}</${button}
    >`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-view-panel': HelixViewPanel
  }
}
