import {
  anchorElement,
  customElement,
  HelixElement,
  MixinControllerOpen,
  PopoverController,
} from '@helix-io/core'
import { html, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * The panel showing now, so opening one closes the last.
 *
 * A page has one of these open at a time: a nav bar whose Products panel is
 * still down while Solutions opens is a nav bar with two panels over the page.
 * Module scope rather than a coordinating parent, because there is nothing to
 * coordinate through: these sit in whatever container the consumer used, which
 * is usually `helix-navigation` and is not required to be. `Video` holds the
 * media session the same way and for the same reason.
 */
let showing: HelixBaseMegamenu | undefined

/**
 * @summary A section of a navigation that opens a panel of destinations.
 *
 * @description
 * **A disclosure, not a menu, and that is the whole design.** `role="menu"` and
 * `menuitem` are for an application's commands: they take over the arrow keys,
 * announce "menu" to a reader who asked for navigation, and put every link
 * inside a role that is not a link. What this is, is a button that shows and
 * hides a region of the consumer's own anchors, which is the pattern the APG
 * gives for site navigation and the one that leaves a middle click, a modified
 * click and the status bar working. `Menu` remains right for a row of commands.
 *
 * **It renders no links**, for the reason `Navigation` gives: a router renders
 * its own anchor and cannot render one inside this shadow root. The panel is a
 * slot, and what goes in it is lists and headings the consumer wrote.
 *
 * **It opens on a press and never on hover.** A panel that opens under a
 * passing pointer is a panel that opens when nobody asked, and on a touch
 * screen there is no hover to open it with at all: the first tap would have to
 * mean something else, which is the thing that makes hover menus unusable on a
 * phone. Focus opens nothing either, for the same reason a tab through a nav
 * bar should not unfold it.
 *
 * **Focus is not trapped and not moved.** A disclosure leaves the reader on the
 * trigger and the panel follows in the tab order, which is what the markup
 * already says, so Tab walks into the links and out the far side without
 * anything managing it. Escape closes and puts focus back, because Escape is
 * the one key that has to return the reader to where they were.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Mega menu, Flyout, Nav panel
 * @documentation https://helix.fusion.dev/components/megamenu
 *
 * @slot - The panel's contents: the consumer's own lists and headings.
 * @slot trigger - The control that opens it. Falls back to a button named by `label`.
 *
 * @csspart trigger - The default trigger, where none was slotted.
 * @csspart panel - The region that opens.
 *
 * @event {HelixOpenEvent} helix-open - Fired before it opens, and cancelable.
 * @event {HelixCloseEvent} helix-close - Fired before it closes, and cancelable.
 */
@customElement('helix-base-megamenu')
export class HelixBaseMegamenu extends MixinControllerOpen(HelixElement) {
  /** The section's name, which names the default trigger and the panel. */
  @property()
  label = ''

  /**
   * Whether the panel is a card under the trigger or a band across the page.
   *
   * The resting one is the card, hanging off the trigger and as wide as it
   * needs to be. `full` is the other shape navigations use: a band from edge to
   * edge under the header, with its contents held to the page's own measure, so
   * a set of destinations too wide to sit under one word gets the whole width
   * to lay out in.
   *
   * It changes where the panel goes as well as how it looks, which is why this
   * tier knows about it at all: a band spans the viewport, so there is nothing
   * to measure it against and nothing to flip or shift to, and the placing pass
   * is told not to run. Everything else the popover gives, the top layer and
   * the dismissal, is exactly what such a band needs.
   */
  @property({ reflect: true })
  appearance?: 'full'

  private readonly panel = new PopoverController(this, {
    anchor: () => this.trigger,
    /* The host, not the panel. A press on the trigger is a press on this
       element, and counting it as outside would close the panel on the way to
       the click that toggles it. `Menu` says the same about its own. */
    boundary: () => this,
    onDismiss: () => this.close(),
    place: () => this.appearance !== 'full',
    placement: () => 'bottom-start',
    surface: () => this.renderRoot?.querySelector<HTMLElement>('[part="panel"]'),
  })

  /** Whatever the consumer slotted, or the button rendered in its place. */
  private get trigger(): HTMLElement {
    return anchorElement(
      this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      this.renderRoot?.querySelector<HTMLElement>('[part="trigger"]') ?? this,
    )
  }

  /** Shuts it and puts the reader back where they were. */
  private close(): void {
    if (!this.requestOpen(false)) {
      return
    }
    this.trigger.focus()
  }

  /**
   * Where a full-bleed band starts, which is the only number it needs.
   *
   * The placing pass is off for that appearance, so nothing else is measuring:
   * a band spans the viewport and has only one degree of freedom, how far down
   * it sits, and that is the bottom of the trigger in viewport coordinates
   * because the panel is fixed. A header that scrolls takes the band with it,
   * which is what a panel hanging off a header should do.
   *
   * Written as a custom property rather than an inline `top`, so the stylesheet
   * keeps the arrangement and this contributes the one measurement it cannot
   * make. Nothing to do for the card, which the controller places.
   */
  private band(): void {
    if (this.appearance !== 'full') {
      return
    }
    const under = this.trigger.getBoundingClientRect().bottom
    this.style.setProperty('--_megamenu-top', `${Math.round(under)}px`)
  }

  private readonly handleTriggerClick = (): void => {
    this.requestOpen(!this.open)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    if (showing === this) {
      showing = undefined
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated?.(changed)
    if (this.open) {
      /* Before showing this one, so the two are never both up for a frame. The
         other closes through `requestOpen`, so a consumer holding it open is
         asked rather than overruled. */
      if (showing && showing !== this) {
        showing.requestOpen(false)
      }
      showing = this
      this.panel.show()
      this.band()
    } else {
      if (showing === this) {
        showing = undefined
      }
      this.panel.hide()
    }
  }

  protected override render(): TemplateResult {
    return html`<slot name="trigger" @click=${this.handleTriggerClick}>
        <button
          part="trigger"
          type="button"
          aria-controls="panel"
          aria-expanded=${this.open ? 'true' : 'false'}
        >
          ${this.label}
        </button>
      </slot>
      <div
        part="panel"
        id="panel"
        popover="manual"
        aria-label=${this.label || nothing}
        role="group"
        ?hidden=${!this.open}
      >
        <slot></slot>
      </div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-megamenu': HelixBaseMegamenu
  }
}
