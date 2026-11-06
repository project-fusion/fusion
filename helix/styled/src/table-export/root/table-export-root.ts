import { customElement, formatWords } from '@fusion.dev/helix-core'
import { HelixHeadlessTableExport } from '@fusion.dev/helix-headless/table-export'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit/static-html.js'
import { styles as liveStyles } from '../../shared/live/live.css.js'
import { styles } from './table-export-root.css.js'
import '../../button/index.js'

/**
 * @summary A panel that exports a Data Table's rows: which rows, which columns, which values, and the format.
 *
 * @description
 * The rows are a list of choices, and the columns, values, and format are
 * each a segmented row, the chosen segment raised out of its track. Export is
 * the solid button, with how many rows it saves.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Download, Export dialog
 * @documentation https://fusion.dev/helix/components/table-export
 *
 * @cssproperty --table-export-gap - The space between the groups.
 * @cssproperty --table-export-segment-background-color - The fill of the track a segmented group sits in.
 */
@customElement('helix-table-export')
export class HelixTableExport extends HelixHeadlessTableExport {
  static override styles: CSSResultGroup = [liveStyles, styles]

  static override tier = 'helix-'

  /** Export is the solid primary button, and Copy the resting one beside it. */
  protected override renderActions(count: number, found: boolean): TemplateResult {
    const button = this.tag('button')
    return html`<div part="actions">
      <${button} part="copy" exportparts="button: copy-button, live: copy-live, spinner: copy-spinner, text: copy-text" ?disabled=${!found} @click=${() => this.copy()}>${this.copyLabel}</${button}>
      <${button} part="export" exportparts="button: export-button, live: export-live, spinner: export-spinner, text: export-text" emphasis="solid" tone="primary" ?disabled=${!found || count === 0} @click=${() => this.export()}
        >${formatWords(this, 'exportLabel', { count })}</${button}
      >
    </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-table-export': HelixTableExport
  }
}
