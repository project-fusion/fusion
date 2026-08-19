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
 * @category layout
 * @aliases Layout, Columns
 * @documentation https://helix.fusion.dev/components/grid
 *
 * @slot - The items to lay out.

 */
@customElement('helix-grid')
export class HelixGrid extends HelixElement {
  /** Fixed number of equal columns. */
  @property({ reflect: true, type: Number })
  columns?: number

  /**
   * Minimum column width, filling as many as fit.
   *
   * Takes precedence over `columns`: a grid that both fixes a count and reflows
   * is two intentions in one element.
   */
  @property()
  min = ''

  /** Space between cells, named on the space scale. */
  @property({ reflect: true })
  gap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

  /** Alignment of each cell within its row. */
  @property({ reflect: true })
  align?: 'start' | 'center' | 'end' | 'stretch'

  /**
   * Writes the track list into the shadow root's own stylesheet.
   *
   * Into a `<style>` rather than onto `this.style`, and the difference is
   * hydration. An inline style on the host is an attribute the element gives
   * itself once it upgrades, so a React consumer's server markup does not have
   * it and hydration reports a mismatch it will not patch up. The shadow root
   * is not part of the tree React hydrates, so a rule written there is free.
   *
   * The element is filled imperatively because Lit refuses expressions inside
   * `<style>`: it is an invalid binding location and throws while rendering
   * rather than at build time. Hence a static, empty element in the template
   * and its `textContent` set here.
   *
   * It sets a custom property rather than the track list itself. A shadow
   * root's adopted stylesheets cascade *after* its own `<style>` elements, and
   * `static styles` is adopted, so a `grid-template-columns` here lost to the
   * one in the stylesheet and every `min` grid came out a single column. The
   * stylesheet only ever reads `--_grid-template`, so there is nothing to
   * lose against.
   *
   * The consequence is that a server-rendered grid falls back to the
   * stylesheet's single column until it upgrades. That is why `columns` is also
   * expressed as plain CSS below: the fixed-count case, which can be enumerated,
   * needs no JavaScript at all, and only `min` depends on this.
   */
  private applyTemplate(): void {
    const sheet = this.renderRoot.querySelector<HTMLStyleElement>('#template')
    if (!sheet) {
      return
    }
    sheet.textContent = this.min
      ? `:host { --_grid-template: repeat(auto-fit, minmax(min(${this.min}, 100%), 1fr)); }`
      : ''
  }

  /* `updated` alone, where there was a `firstUpdated` beside it doing the same
     thing. Lit puts every initial property into the first `changed`, so a grid
     with a `min` ran `applyTemplate` twice on every mount, and one without it
     ran it once to write the empty string an empty `<style>` already held. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('min')) {
      this.applyTemplate()
    }
  }

  protected override render(): TemplateResult {
    return html`<style id="template"></style>
      <slot></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-grid': HelixGrid
  }
}
