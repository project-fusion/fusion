import { customElement, HelixElement, reportRuntime } from '@fusion.dev/helix-core'
import type { CSSResultGroup, PropertyValues, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { html, unsafeStatic } from 'lit/static-html.js'
import { styles } from './grid-root.css.js'

/**
 * **The track lists every grid sets for itself, set back so none is taken from
 * a grid around it.** Custom properties inherit, so a `columns={3}` grid inside
 * a `min` grid took the outer grid's template and came out one column, and a
 * `--grid-columns` written on an outer grid reached every grid inside it. A
 * page's own `--grid-columns` on the element still wins: it is declared on the
 * element, and a declaration there outranks this `:host` rule.
 *
 * In the template's `<style>` element, and so also written as its text in
 * `render`, where the server renders it: the adopted sheet cascades after that
 * element, and a reset there would undo every `min`.
 */
const UNINHERITED =
  '--grid-areas: initial; --grid-columns: initial; --grid-rows: initial; --_grid-template: initial;'

/** A number with a length unit, or a bare number inside a function. */
const NUMBER =
  /^-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|r?ex|r?ch|r?lh|r?ic|r?cap|%|[sdl]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max)|cm|mm|in|pt|pc|q)?$/i

/** What `min` may be built from, one token at a time. */
const TOKEN = /\s+|(?:calc|clamp|min|max)\(|var\(--[\w-]+|-?(?:\d+\.?\d*|\.\d+)[a-z%]*|[(),+*/-]/giy

/**
 * `min` as a length the rule may hold, or `undefined` where it is not one.
 *
 * **Checked against a grammar before it reaches a stylesheet, and that is a
 * security fix rather than tidiness.** It is a public attribute written into a
 * `<style>` element's text, so an unchecked
 * `min="1px,1fr)} :host{background:url(//elsewhere/?stolen)} @media all{"`
 * closed the rule and wrote arbitrary CSS into this component's shadow root,
 * enough to exfiltrate through `url()` and to lay an invisible plate over the
 * page. `createSheet` says in its own documentation that consumer input must
 * not be interpolated into CSS. A grammar rather than an escape: a length is
 * numbers, units, four math functions, `var()`, operators and balanced
 * parentheses, and nothing in it can end a declaration.
 */
const lengthOf = (value: string | undefined): string | undefined => {
  const min = value?.trim() ?? ''
  if (min === '' || min.includes('/*')) {
    return undefined
  }
  if (!min.includes('(')) {
    return NUMBER.test(min) && /[a-z%]$/i.test(min) ? min : undefined
  }
  let depth = 0
  TOKEN.lastIndex = 0
  while (TOKEN.lastIndex < min.length) {
    const at = TOKEN.lastIndex
    const token = TOKEN.exec(min)?.[0]
    if (token === undefined || TOKEN.lastIndex === at) {
      return undefined
    }
    if (/\d/.test(token) && /^-?[\d.]/.test(token) && !NUMBER.test(token)) {
      return undefined
    }
    depth += token.endsWith('(') || token.startsWith('var(') ? 1 : token === ')' ? -1 : 0
    if (depth < 0) {
      return undefined
    }
  }
  return depth === 0 ? min : undefined
}

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
 * `row-gap` and `column-gap` set one axis each and win over `gap` on theirs.
 * `--grid-rows` and `--grid-areas` set the rows and named areas, and a child
 * takes its place with `grid-area` in your own stylesheet.
 *
 * **A child can span columns with `data-grid-span`.** `data-grid-span="full"`
 * runs from the first column to the last, such as a heading across a set of
 * cards, and a number from `2` to `6` spans that many columns.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Layout, Columns
 * @documentation https://fusion.dev/helix/components/grid
 *
 * @slot - The items to lay out.
 *
 * @cssproperty --grid-areas - The named areas, as `grid-template-areas` takes them, such as `"rail main"`. A child takes its area with `grid-area`.
 * @cssproperty --grid-columns - An explicit track list. It overrides `min` and `columns`. Use it for tracks of unequal widths, which neither attribute can set.
 * @cssproperty --grid-rows - An explicit row track list, such as `auto minmax(0, 1fr) auto`. Rows are sized by their content when it is unset.
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
   * How cells fill the grid when no child places itself, set as
   * `grid-auto-flow`.
   *
   * `column` fills each column before the next. `dense` and `column-dense`
   * also move a later small cell back into an earlier gap. Moving them changes
   * only where they are drawn, so focus and a screen reader still follow the
   * markup.
   */
  @property({ attribute: 'auto-flow', reflect: true })
  autoFlow?: 'row' | 'column' | 'dense' | 'column-dense'

  /**
   * The space between columns, as a step on the space scale. Wins over `gap`
   * across the row.
   */
  @property({ attribute: 'column-gap', reflect: true })
  columnGap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * A fixed number of equal columns.
   *
   * Two to six are plain CSS. Any other count is written into the shadow
   * root's rule, which the server renders too.
   */
  @property({ reflect: true, type: Number })
  columns?: number

  /**
   * The space between cells, as a step on the space scale.
   */
  @property({ reflect: true })
  gap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * How each cell aligns within its column. Sets `justify-items`.
   *
   * Named for the CSS property it sets, the way `alignItems` is. Absent, every
   * cell stretches to the width of its column.
   */
  @property({ attribute: 'justify-items', reflect: true })
  justifyItems?: 'start' | 'center' | 'end' | 'stretch'

  /**
   * The minimum column width. The grid fits as many columns as the width allows.
   *
   * A length, such as `12rem`, or `calc()`, `clamp()`, `min()`, `max()` and
   * `var()` over lengths. Anything else is refused with a warning, and the grid
   * lays out by `columns`.
   *
   * Takes precedence over `columns`: a grid that both fixes a count and reflows
   * is two intentions in one element.
   */
  @property()
  min = ''

  /**
   * The space between rows, as a step on the space scale. Wins over `gap` down
   * the column.
   */
  @property({ attribute: 'row-gap', reflect: true })
  rowGap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * The rule the shadow root's own `<style>` holds: the reset, and the track
   * list `min` or an unlisted `columns` asks for.
   *
   * Into a `<style>` rather than onto `this.style`, and the difference is
   * hydration. An inline style on the host is an attribute the element gives
   * itself once it upgrades, so a React consumer's server markup does not have
   * it and hydration reports a mismatch it will not patch up. The shadow root
   * is not part of the tree React hydrates, so a rule written there is free.
   *
   * **Static text, so the server renders it.** Lit refuses an expression inside
   * `<style>`, and a rule filled in after upgrade left a server-rendered `min`
   * grid in one column until then. `unsafeStatic` joins the text into the
   * template itself, so it is safe only because `min` passed `lengthOf` and a
   * count is an integer.
   *
   * It sets a custom property rather than the track list itself. A shadow
   * root's adopted stylesheets cascade *after* its own `<style>` elements, and
   * `static styles` is adopted, so a `grid-template-columns` here lost to the
   * one in the stylesheet and every `min` grid came out a single column. The
   * stylesheet only ever reads `--_grid-template`, so there is nothing to
   * lose against.
   */
  private templateRule(): string {
    const min = lengthOf(this.min)
    if (min !== undefined) {
      return `:host { ${UNINHERITED} --_grid-template: repeat(auto-fit, minmax(min(${min}, 100%), 1fr)); }`
    }
    const count = Number(this.columns)
    if (Number.isInteger(count) && count > 6) {
      return `:host { ${UNINHERITED} --_grid-template: repeat(${count}, minmax(0, 1fr)); }`
    }
    return `:host { ${UNINHERITED} }`
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const min = this.min?.trim() ?? ''
    if (changed.has('min') && min !== '' && lengthOf(min) === undefined) {
      reportRuntime({
        kind: 'refused-length',
        message:
          `<helix-grid min="${min}"> is not a length the grid can write, so it lays out by ` +
          '`columns`. Write a length such as `12rem`, or `calc()`, `clamp()`, `min()`, `max()` ' +
          'or `var()` over lengths.',
        tag: this.localName,
      })
    }
  }

  protected override render(): TemplateResult {
    return html`<style id="template">${unsafeStatic(this.templateRule())}</style>
      <slot></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-grid': HelixGrid
  }
}
