import { customElement, HelixElement } from '@helix-io/core'
import type { CSSResultGroup, TemplateResult } from 'lit'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { styles } from './flex-root.css.js'

/**
 * @summary Lays children out in a row or a column.
 *
 * @description
 * The host is the flex container itself and the only child is a slot, so the
 * element adds no box of its own: `<helix-flex>` costs exactly the `<div>` it
 * replaces.
 *
 * There is no separate Stack. A stack is this with `direction="column"`, and a
 * second element whose whole definition is one default of the first is a name
 * to learn rather than a capability to gain.
 *
 * Gap takes a space token name rather than a length, so spacing stays on the
 * scale. A layout that can say `gap="13px"` is one that will.
 *
 * Presentation only, so there is no headless tier: the split exists to keep
 * behavior separate from styling, and this is entirely styling.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases Stack, Row, Column, HStack, VStack
 * @documentation https://helix.fusion.dev/components/flex
 *
 * @slot - The items to lay out.
 */
@customElement('helix-flex')
export class HelixFlex extends HelixElement {
  /** Whether items run across or down. */
  @property({ reflect: true })
  direction: 'row' | 'column' = 'row'

  /** Space between items, named on the space scale. */
  @property({ reflect: true })
  gap: 'none' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'none'

  /** Alignment across the direction. */
  @property({ reflect: true })
  align: 'start' | 'center' | 'end' | 'stretch' | 'baseline' = 'stretch'

  /** Distribution along the direction. */
  @property({ reflect: true })
  justify: 'start' | 'center' | 'end' | 'between' | 'around' = 'start'

  /** Whether items wrap onto more lines. */
  @property({ reflect: true, type: Boolean })
  wrap = false

  /** Flows with surrounding text instead of taking the full width. */
  @property({ reflect: true, type: Boolean })
  inline = false

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
