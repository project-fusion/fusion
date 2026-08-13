import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
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

  /**
   * Writes the track list to the host.
   *
   * Set on `this.style` rather than rendered into a `<style>` element, because
   * Lit refuses expressions inside `<style>`: it is an invalid binding location
   * and throws while rendering rather than at build time. The guard is for the
   * server, whose element shim has no `style` at all.
   *
   * The consequence is that a server-rendered grid falls back to the
   * stylesheet's single column until it upgrades. That is why `columns` is also
   * expressed as plain CSS below: the fixed-count case, which can be enumerated,
   * needs no JavaScript at all, and only `min` depends on this.
   */
  private applyTemplate(): void {
    if (!this.style) {
      return
    }
    const template = this.min ? `repeat(auto-fit, minmax(min(${this.min}, 100%), 1fr))` : ''
    if (template) {
      this.style.setProperty('grid-template-columns', template)
    } else {
      this.style.removeProperty('grid-template-columns')
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('min')) {
      this.applyTemplate()
    }
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.applyTemplate()
  }

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-grid': HelixGrid
  }
}
