import { customElement } from '@fusion.dev/helix-core'
import { HelixHeadlessToolbar } from '@fusion.dev/helix-headless/toolbar'
import type { CSSResultGroup, PropertyValues } from 'lit'
import { property } from 'lit/decorators.js'
import { styles as densityStyles } from '../../shared/density/density-sm.css.js'
import { styles } from './toolbar-root.generated.css.js'

/**
 * @summary A group of controls that share one tab stop.
 *
 * @description
 * The toolbar draws no frame of its own, so it does not add a second frame
 * inside whatever already frames the bar.
 *
 * Its controls are the small size, since a toolbar is dense by nature, and a
 * control added later takes it without being told. `size="md"` or `"lg"`
 * makes every control in it larger together.
 *
 * @since 0.1.0
 * @status stable
 * @category layout
 * @aliases Actions, Action bar
 * @documentation https://fusion.dev/helix/components/toolbar
 *
 * @slot - The toolbar's controls.
 *
 * @csspart toolbar - The toolbar container.
 *
 * @cssproperty --toolbar-align - How the controls line up across the toolbar's axis. Centered unless set; `stretch` makes a vertical toolbar's controls as wide as it is.
 * @cssproperty --toolbar-background-color - The fill behind the controls. Transparent unless set.
 * @cssproperty --toolbar-border-color - The color of the toolbar's edge, once it has a width.
 * @cssproperty --toolbar-border-width - The width of the toolbar's edge. None unless set.
 * @cssproperty --toolbar-gap - The space between controls.
 * @cssproperty --toolbar-padding - The space between the toolbar's edge and its controls.
 * @cssproperty --toolbar-radius - The corner radius of the toolbar's fill.
 * @cssproperty --toolbar-separator-gap - Extra space either side of a `Divider` between controls, along the toolbar's axis. None unless set.
 */
@customElement('helix-toolbar')
export class HelixToolbar extends HelixHeadlessToolbar {
  static override styles: CSSResultGroup = [densityStyles, styles]

  /**
   * Whether the toolbar holds one line and scrolls where it runs out of room.
   * Unset, the controls wrap. The toolbar stays one tab stop either way.
   */
  @property({ reflect: true, type: Boolean })
  scrollable?: boolean

  /**
   * The size of every control in the toolbar: their height, icons, boxes and
   * tags. Unset is the small size, as a toolbar is dense by nature.
   */
  @property({ reflect: true })
  size?: 'sm' | 'md' | 'lg'

  /* **A Divider that a wrap leaves at the start or the end of a line is
     hidden**, since it parts nothing there: in a 330 pixel column a wrapped
     row put two dividers at the start of their lines. A layout check, run
     on the frame after the row changes size or its controls change. Each check
     shows every divider first and measures that layout, so the answer does
     not depend on the last one's. Marked with `data-line-edge`, which the
     sheet hides. */
  private lines: ResizeObserver | undefined
  private lineFrame = 0

  override connectedCallback(): void {
    super.connectedCallback()
    if (this.hasUpdated) {
      this.watchLines()
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.lines?.disconnect()
    cancelAnimationFrame(this.lineFrame)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.renderRoot
      .querySelector('slot')
      ?.addEventListener('slotchange', () => this.checkLinesSoon())
    this.watchLines()
  }

  private watchLines(): void {
    const row = this.renderRoot.querySelector('[part="toolbar"]')
    if (!row || typeof ResizeObserver !== 'function') {
      return
    }
    this.lines ??= new ResizeObserver(() => this.checkLinesSoon())
    this.lines.observe(row)
  }

  private checkLinesSoon(): void {
    cancelAnimationFrame(this.lineFrame)
    this.lineFrame = requestAnimationFrame(() => this.checkLines())
  }

  private checkLines(): void {
    const dividers = [...this.children].filter((child) => child.localName === 'helix-divider')
    if (dividers.length === 0) {
      return
    }
    for (const divider of dividers) {
      divider.removeAttribute('data-line-edge')
    }
    const row = this.renderRoot.querySelector('[part="toolbar"]')
    const laid = row ? getComputedStyle(row) : undefined
    if (laid?.flexDirection !== 'row' || laid.flexWrap !== 'wrap') {
      return
    }
    /* Two controls share a line where their boxes overlap down the page. */
    const shown = [...this.children].filter((child) => child.getClientRects().length > 0)
    const boxes = shown.map((child) => child.getBoundingClientRect())
    const level = (one: DOMRect | undefined, other: DOMRect): boolean =>
      one === undefined || Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top) > 0
    shown.forEach((child, at) => {
      const box = boxes[at] as DOMRect
      if (
        child.localName === 'helix-divider' &&
        (!level(boxes[at - 1], box) || !level(boxes[at + 1], box))
      ) {
        child.setAttribute('data-line-edge', '')
      }
    })
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-toolbar': HelixToolbar
  }
}
