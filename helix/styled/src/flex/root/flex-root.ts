import { customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './flex-root.css.js'

/**
 * Reads `wrap` as a switch with one named value: present is `true`,
 * `wrap="reverse"` is `'reverse'`, and absent is `false`. Written back the same
 * way, so a `true` set from script serves `wrap=""`, as it always has.
 */
const wrapConverter = {
  fromAttribute: (value: string | null): boolean | 'reverse' =>
    value === null ? false : value === 'reverse' ? 'reverse' : true,
  toAttribute: (value: boolean | 'reverse'): string | null =>
    value === 'reverse' ? 'reverse' : value ? '' : null,
}

/**
 * @summary A layout that places its children in a row or a column.
 *
 * @description
 * The host is the flex container and its only child is a slot, so
 * `<helix-flex>` adds no box beyond the `<div>` it replaces.
 *
 * There is no separate Stack component. For a stack, set `direction="column"`.
 *
 * `gap` takes a space token name, so spacing stays on the scale. `row-gap`
 * and `column-gap` set one axis each and win over `gap` on theirs.
 *
 * `layout` sets up one of three common patterns, and any attribute you also
 * write wins over the pattern's own value:
 *
 * - `cluster`: items in a wrapping row, centered on one line, such as tags.
 * - `split`: the first item at the start and the rest pushed to the end, such
 *   as a title and its actions. Wraps when there is no room.
 * - `flank` and `flank-end`: a fixed item beside one that takes the rest, such
 *   as an icon and its text, or a field and its button. The item that takes
 *   the rest stays at least `--flex-flank-min` wide, and the pair stacks once
 *   it cannot.
 *
 * Flex is presentation only, so it has no headless tier.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Stack, Row, Column, HStack, VStack
 * @documentation https://fusion.dev/helix/components/flex
 *
 * @slot - The items to lay out.
 *
 * @cssproperty --flex-flank-min - The narrowest the growing item of a `flank` layout gets before the two stack, as a share of the row. Defaults to `50%`.
 * @cssproperty --flex-flank-size - The width of the fixed item of a `flank` layout. Defaults to its own width.
 */
@customElement('helix-flex')
export class HelixFlex extends HelixElement {
  /**
   * How the lines of a wrapping row share the space across it, set as
   * `align-content`.
   *
   * Named for the CSS property it sets, the way `alignItems` is. It moves
   * nothing in a row that does not wrap, which has one line.
   */
  @property({ attribute: 'align-content', reflect: true })
  alignContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'stretch'

  /**
   * How items align across the direction, set as `align-items`.
   *
   * **Named for the CSS property it sets, because it is that property.** A flex
   * container is the one place where the box-alignment words are already the
   * reader's, so a shorter name would be a second vocabulary for something they
   * can already say, and `align` alone is the word four other families use for
   * four other questions: `Dialog` and `Table.Column` mean `text-align` by it.
   *
   * **It also keeps the name out of the browser's way.** `align` is a legacy
   * HTML presentational attribute mapped to `text-align` on any element that
   * carries one, this one included: measured, an invented tag with
   * `align="center"` computes centered text too, so it is nothing to do with
   * being a known element. A row that carried it therefore centered the text
   * inside every field in it, through a hint no rule here declares and none can
   * see, and the fix is a name the platform has no opinion about rather than a
   * guard against the hint.
   */
  @property({ attribute: 'align-items', reflect: true })
  alignItems?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'

  /**
   * Space between the items of a row, named on the space scale. Wins over
   * `gap` across the row.
   */
  @property({ attribute: 'column-gap', reflect: true })
  columnGap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * Whether items run across or down, and from which end.
   *
   * `row-reverse` and `column-reverse` change only where the items are drawn.
   * Focus and a screen reader still follow the order of the markup, so use
   * them for a visual order that reads the same either way.
   */
  @property({ reflect: true })
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse'

  /**
   * Space between items, named on the space scale.
   */
  @property({ reflect: true })
  gap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * Flows with the surrounding text, taking only the width of its items.
   */
  @property({ reflect: true, type: Boolean })
  inline = false

  /**
   * How items are spread along the direction, set as `justify-content`.
   *
   * Named for the property it sets, the way `alignItems` is. `between` and
   * `around` drop the `space-` prefix and nothing else does, because those two
   * are the only values whose CSS spelling is two words.
   */
  @property({ attribute: 'justify-content', reflect: true })
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around'

  /**
   * A common layout pattern: `cluster`, `split`, `flank` or `flank-end`.
   *
   * Each sets the wrapping, alignment and spread it needs, and an attribute
   * you write as well wins over it. `flank` holds the first item at its own
   * width and gives the last one the rest, and `flank-end` does the reverse.
   */
  @property({ reflect: true })
  layout?: 'cluster' | 'flank' | 'flank-end' | 'split'

  /**
   * Space between the lines of a wrapping row, or between the items of a
   * column, named on the space scale. Wins over `gap` down the column.
   */
  @property({ attribute: 'row-gap', reflect: true })
  rowGap?: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

  /**
   * Whether items wrap onto more lines. `wrap="reverse"` wraps them upward,
   * each new line above the one before.
   */
  @property({ converter: wrapConverter, reflect: true })
  wrap: boolean | 'reverse' = false

  protected override render(): TemplateResult {
    return html`<slot></slot>`
  }

  static override styles: CSSResultGroup = styles
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-flex': HelixFlex
  }
}
