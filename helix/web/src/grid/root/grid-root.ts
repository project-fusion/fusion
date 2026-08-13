import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './grid-root.css.js'

/**
 * @summary Lays children out on a grid.
 *
 * @description
 * Two ways to declare columns, and only two. `columns` is a fixed count;
 * `min` fills as many equal columns as fit above that width, which is a
 * responsive layout with no breakpoint to maintain. Setting `min` wins, because
 * a fixed count that also reflows is two intentions in one element.
 *
 * Presentation only, so there is no headless tier.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Layout, Columns
 * @documentation https://helix.fusion.dev/components/grid
 *
 * @slot - The items to lay out.
 *
 * @cssproperty --grid-min - Column width floor when `min` is set.
 */
@customElement('helix-grid')
export class HelixGrid extends HelixElement {
  /** Fixed number of equal columns. */
  @property({ reflect: true, type: Number })
  columns = 0

  /**
   * Minimum column width, filling as many as fit.
   *
   * Takes precedence over `columns`: a grid that both fixes a count and reflows
   * is two intentions in one element.
   */
  @property({ reflect: true })
  min = ''

  /** Space between cells, named on the space scale. */
  @property({ reflect: true })
  gap: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md'

  /** Alignment of each cell within its row. */
  @property({ reflect: true })
  align: 'start' | 'center' | 'end' | 'stretch' = 'stretch'

  protected override render(): TemplateResult {
    // Inline style rather than a class, because the value is a length or a
    // count the consumer chose and no fixed set of rules can enumerate it.
    const template = this.min
      ? `repeat(auto-fit, minmax(min(${this.min}, 100%), 1fr))`
      : this.columns > 0
        ? `repeat(${this.columns}, minmax(0, 1fr))`
        : 'minmax(0, 1fr)'
    return html`<style>
        :host { grid-template-columns: ${template}; }
      </style>
      <slot></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-grid': HelixGrid
  }
}
