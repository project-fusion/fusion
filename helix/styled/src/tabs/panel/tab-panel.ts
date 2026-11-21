import { customElement, reducedMotion } from '@fusion.dev/helix-core'
import { HelixHeadlessTabPanel } from '@fusion.dev/helix-headless/tabs'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { styles } from './tab-panel.css.js'

/**
 * @summary The content shown for one tab.
 *
 * @description
 * The panel has no box of its own, so only the panel that is showing takes
 * space. In a set of four panels, the visible one gets the full height.
 *
 * **A panel coming into view settles in**, fading up from a little below its
 * place, when its tab is chosen. The panel a page opens on shows at once, and
 * so does every panel where the reader asked for less movement.
 *
 * @since 0.1.0
 * @status stable
 * @documentation https://fusion.dev/design/components/tabs
 *
 * @slot - The panel's content.
 *
 * @csspart panel - The panel container.
 *
 * @cssproperty --tabs-panel-enter-distance - How far below its place a panel starts as its tab is chosen. Defaults to `--helix-space-2xs`.
 * @cssproperty --tabs-panel-enter-duration - How long a panel takes to settle in as its tab is chosen. Defaults to `--helix-duration-normal`; `0ms` shows it at once.
 * @cssproperty --tabs-panel-enter-easing - The curve a panel settles in along. Defaults to `--helix-easing-decelerate`.
 * @cssproperty --tabs-panel-padding-block-start - The space between the tab row and the panel's content.
 */
@customElement('helix-tab-panel')
export class HelixTabPanel extends HelixHeadlessTabPanel {
  static override styles: CSSResultGroup = styles

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed)
    /* Only a panel that was hidden and is now chosen: the first render's
       previous value is `undefined`, so the panel a page opens on stays put. */
    if (changed.has('selected') && changed.get('selected') === false && this.selected) {
      this.enter()
    }
  }

  /** Settles the panel in from the timing its hooks hold. */
  private enter(): void {
    const panel = this.partNamed('panel')
    if (!panel || typeof panel.animate !== 'function' || reducedMotion()) {
      return
    }
    const style = getComputedStyle(this)
    const written = style.getPropertyValue('--tabs-panel-enter-duration').trim()
    const amount = Number.parseFloat(written)
    const duration = written.endsWith('ms') ? amount : amount * 1000
    if (!(duration >= 1)) {
      return
    }
    const distance = style.getPropertyValue('--tabs-panel-enter-distance').trim() || '0px'
    const easing = style.getPropertyValue('--tabs-panel-enter-easing').trim() || 'ease-out'
    panel.animate(
      [
        { opacity: 0, translate: `0 ${distance}` },
        { opacity: 1, translate: '0 0' },
      ],
      {
        duration,
        easing,
      },
    )
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-tab-panel': HelixTabPanel
  }
}
