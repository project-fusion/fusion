import { customElement, reducedMotion } from '@fusion.dev/helix-core'
import { HelixHeadlessSelectionBar } from '@fusion.dev/helix-headless/selection-bar'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { styles } from './selection-bar-root.css.js'

/**
 * @summary A bar that says how many of a Data Table's rows are selected, with what you can do to them and a way to clear them.
 *
 * @description
 * A filled band the height of the toolbar it replaces, so the table does not
 * move as rows are selected. The count leads, the actions follow it, and
 * Clear sits at the end.
 *
 * **It rises in as the first rows are selected**, in place of the toolbar,
 * and its count takes a small beat each time it changes, so a reader checking
 * rows sees the number they are building. Under `prefers-reduced-motion` both
 * are still.
 *
 * @since 0.238.0
 * @status experimental
 * @category data
 * @aliases Bulk actions, Action bar
 * @use Actions on the rows selected in a Data Table, with how many are selected.
 * @instead toolbar - Controls that stay in place whatever is selected.
 * @anatomy count
 * @anatomy actions
 * @anatomy clear
 * @practice Put Selection Bar in the Data Table's selection slot. - It then takes the toolbar's place while rows are selected.
 * @practice Set `for` to the table's id where the bar is written outside the table. - Written inside the table, it finds the table.
 * @documentation https://fusion.dev/design/components/selection-bar
 *
 * @cssproperty --selection-bar-background-color - The fill of the bar.
 */
@customElement('helix-selection-bar')
export class HelixSelectionBar extends HelixHeadlessSelectionBar {
  static override styles: CSSResultGroup = styles

  /** How many rows were selected at the last render. */
  private countBefore: number | undefined

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    const now = this.count
    const was = this.countBefore
    this.countBefore = now
    if (was === undefined || was === now || now === 0 || reducedMotion()) {
      return
    }
    const style = getComputedStyle(this)
    const time = (name: string): number => {
      const written = style.getPropertyValue(name).trim()
      const amount = Number.parseFloat(written)
      const ms = written.endsWith('ms') ? amount : amount * 1000
      return ms >= 1 ? ms : 0
    }
    if (was === 0) {
      const duration = time('--helix-duration-normal')
      if (duration > 0) {
        this.animate?.(
          [
            {
              opacity: 0,
              transform: `translateY(calc(${style.getPropertyValue('--helix-space-xs').trim() || '0.5rem'} * -1))`,
            },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration,
            easing: style.getPropertyValue('--helix-easing-decelerate').trim() || 'ease-out',
          },
        )
      }
      return
    }
    const beat = time('--helix-duration-fast')
    const count = this.renderRoot.querySelector<HTMLElement>('[part="count"]')
    if (beat > 0 && count) {
      count.animate?.([{ scale: 1 }, { scale: 1.06 }, { scale: 1 }], {
        duration: beat * 2,
        easing: style.getPropertyValue('--helix-easing-standard').trim() || 'ease',
      })
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-selection-bar': HelixSelectionBar
  }
}
