import { customElement, HelixElement } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'
import { HelixBaseTabsPanel } from '../panel/tabs-panel.js'
import { HelixBaseTabsTab } from '../tab/tabs-tab.js'

/** Keys the tab list handles, per the APG tabs pattern. */
const KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

/**
 * @summary A row of tabs and the panel each one shows.
 *
 * @description
 * Selection is coordinated by event, the same shape the accordion and the tree
 * use: a tab dispatches `SelectionChange` and the root pairs it with the panel
 * of the same value. Nothing registers with anything, so tabs added later work
 * without the root being told.
 *
 * The tab list is a single tab stop, moved with the arrow keys. Selection
 * follows focus, which is the right default for a small set where showing a
 * panel is cheap; a set where it is not should use `manual`.
 *
 * @since 0.1.0
 * @status experimental
 * @aliases TabList, Segmented control
 * @documentation https://helix.fusion.dev/components/tabs
 *
 * @slot - The tabs.
 * @slot panels - The panels.
 *
 * @csspart tabs - The tab list.
 * @csspart panels - The panel container.
 *
 * @event {HelixSelectEvent} helix-select - Fired when a tab is chosen. Dispatched by the tab and listened for here, because the root is what a consumer holds.
 */
@customElement('helix-base-tabs')
export class HelixBaseTabs extends HelixElement {
  /**
   * How the row reads.
   *
   * Unset is a row of underlines. `toggle` is a segmented control: a framed,
   * sunken track with the selected tab raised inside it, which is what a set of
   * files or modes wants when it sits in a toolbar rather than above a page.
   *
   * Reflected and left unset by default, so the host carries nothing a
   * consumer's server markup does not already have.
   */
  @property({ reflect: true })
  appearance?: 'toggle'

  /** Accessible name for the tab list. */
  @property()
  label = 'Tabs'

  /** Value of the selected tab. */
  @property()
  value = ''

  /**
   * Whether arrowing to a tab also selects it.
   *
   * Automatic is the default because showing a panel is usually cheap. Set this
   * where it is not, so a reader arrowing past four tabs does not load four
   * panels on the way.
   */
  @property({ reflect: true, type: Boolean })
  manual = false

  private get tabs(): HelixBaseTabsTab[] {
    return [...this.children].filter(
      (child): child is HelixBaseTabsTab => child instanceof HelixBaseTabsTab,
    )
  }

  private get panels(): HelixBaseTabsPanel[] {
    return [...this.children].filter(
      (child): child is HelixBaseTabsPanel => child instanceof HelixBaseTabsPanel,
    )
  }

  private readonly handleSelection = (event: Event): void => {
    this.value = (event as CustomEvent<{ value: string }>).detail.value
  }

  /** Pushes the current value down to whichever tab and panel own it. */
  private sync(): void {
    const tabs = this.tabs
    const value = this.value || tabs[0]?.value || ''
    for (const tab of tabs) {
      tab.selected = tab.value === value
    }
    for (const panel of this.panels) {
      panel.selected = panel.value === value
    }
  }

  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (!KEYS.has(event.key)) {
      return
    }
    const tabs = this.tabs.filter((tab) => !tab.disabled)
    const current = tabs.findIndex((tab) => tab.selected)
    if (current === -1) {
      return
    }

    let next = current
    if (event.key === 'ArrowRight') {
      next = (current + 1) % tabs.length
    } else if (event.key === 'ArrowLeft') {
      next = (current - 1 + tabs.length) % tabs.length
    } else if (event.key === 'Home') {
      next = 0
    } else {
      next = tabs.length - 1
    }

    event.preventDefault()
    const target = tabs[next]
    target?.focusTab()
    if (!this.manual) {
      target?.select()
    }
  }

  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('helix-select', this.handleSelection)
    this.addEventListener('keydown', this.handleKeydown)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('helix-select', this.handleSelection)
    this.removeEventListener('keydown', this.handleKeydown)
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.sync()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    if (changed.has('value')) {
      this.sync()
    }
  }

  protected override render(): TemplateResult {
    return html`<div part="tabs" role="tablist" aria-label=${this.label}>
        <slot @slotchange=${() => this.sync()}></slot>
      </div>
      <div part="panels"><slot name="panels" @slotchange=${() => this.sync()}></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-tabs': HelixBaseTabs
  }
}
