import { customElement, HelixElement } from '@fusion.dev/helix-core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './flex-root.css.js'

/**
 * @summary A layout that places its children in a row or a column.
 *
 * @description
 * The host is the flex container and its only child is a slot, so
 * `<helix-flex>` adds no box beyond the `<div>` it replaces.
 *
 * There is no separate Stack component. For a stack, set `direction="column"`.
 *
 * `gap` takes a space token name, so spacing stays on the scale.
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
 */
@customElement('helix-flex')
export class HelixFlex extends HelixElement {
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
   * Whether items run across or down.
   */
  @property({ reflect: true })
  direction?: 'row' | 'column'

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
   * Whether items wrap onto more lines.
   */
  @property({ reflect: true, type: Boolean })
  wrap = false

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
