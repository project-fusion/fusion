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
 * **It opens on hover, and a press is always the fallback.** `open-on` says
 * which, and hover is the resting value because a nav bar is the one place a
 * reader expects to sweep along a row and see each section: making them click,
 * read, click again to compare two is the interaction hover exists to save.
 *
 * Hover is not the only way in, and the code is mostly about that. There is no
 * hover on a touch screen, so a tap opens the panel there whatever `open-on`
 * says, which is why the pointer type is checked rather than assumed. Focus
 * still opens nothing, for the same reason a tab through a nav bar should not
 * unfold it, but Enter on the trigger does, and a keyboard press arrives as a
 * click with no pointer behind it.
 *
 * A mouse click on a trigger the pointer is already sitting on is the case
 * worth naming: toggling there would close the panel and the pointer, still on
 * the trigger, would open it again, so the trigger would flicker and never
 * close. In hover mode the mouse's own clicks are left alone and hover governs
 * on its own. Escape and a click away still close it.
 *
 * The delays are intent, not decoration. Opening waits, so a pointer crossing
 * the bar on its way somewhere else opens nothing; closing waits longer, so the
 * diagonal from the trigger down into the panel does not pass through a gap and
 * shut it. Moving along a bar where a panel is already down opens the next one
 * at once, because at that point the reader is reading the bar, not crossing it.
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

  /**
   * Whether hovering the trigger opens the panel, or only a press does.
   *
   * A press always works. This says whether a mouse also opens it by resting on
   * the trigger, and it is the default because that is what a navigation bar
   * does. `click` is for a trigger that does something else as well, or a panel
   * heavy enough that opening it on the way past is rude.
   */
  /* Read, never written back. It has a default, and a reflected default puts an
     attribute on the host that the consumer did not write, which the server
     then ships: the SSR spec for this element checks exactly that and caught
     it. Nothing selects on it, so there is nothing to reflect for. */
  @property({ attribute: 'open-on' })
  openOn: 'click' | 'hover' = 'hover'

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

  /**
   * How long a pointer has to mean it, in milliseconds.
   *
   * Opening is the shorter wait: too long and the panel feels stuck, too short
   * and crossing the bar opens things. Closing is longer because the pointer
   * has to get from the trigger to the panel, and the straight line between
   * them is not the line anybody moves along.
   */
  private static readonly OPEN_DELAY = 120
  private static readonly CLOSE_DELAY = 220

  private timer: ReturnType<typeof setTimeout> | undefined

  /* What pressed last, so a click can be told apart from a tap. A click event
     carries no pointer type of its own. */
  private pointer: string | undefined

  private schedule(delay: number, then: () => void): void {
    this.stop()
    this.timer = setTimeout(then, delay)
  }

  private stop(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.pointer = event.pointerType
  }

  private readonly handlePointerEnter = (event: PointerEvent): void => {
    /* Mouse only. A touch screen synthesises an enter on tap, and acting on it
       would open the panel and then let the click that follows close it again,
       so a tap would do nothing at all. */
    if (this.openOn !== 'hover' || event.pointerType !== 'mouse') {
      return
    }
    /* No wait when a panel is already down: the bar is open, and the reader
       moving along it is choosing, not passing through. */
    this.schedule(showing && showing !== this ? 0 : HelixBaseMegamenu.OPEN_DELAY, () => {
      this.requestOpen(true)
    })
  }

  private readonly handlePointerLeave = (event: PointerEvent): void => {
    if (this.openOn !== 'hover' || event.pointerType !== 'mouse') {
      return
    }
    this.schedule(HelixBaseMegamenu.CLOSE_DELAY, () => {
      /* Not `close()`: leaving with the pointer should not pull focus back to
         the trigger, which would scroll the page to a nav bar the reader has
         moved on from. Escape is the one that returns them. */
      this.requestOpen(false)
    })
  }

  private readonly handleTriggerClick = (event: MouseEvent): void => {
    this.stop()
    if (this.openOn !== 'hover') {
      this.requestOpen(!this.open)
      return
    }
    /* In hover mode the mouse's own clicks are hover's business. Toggling here
       would close a panel the pointer is still standing on, and the pointer
       would reopen it. A keyboard press arrives with no clicks behind it, and a
       tap arrives with a pointer that is not a mouse: both are the only way in
       for the people making them, so both toggle. */
    if (event.detail === 0 || (this.pointer !== undefined && this.pointer !== 'mouse')) {
      this.requestOpen(!this.open)
    }
  }

  /* On the host, and here rather than in the template, because Lit templates
     bind inside a shadow root and these have to hear the panel too. Not the
     constructor: the server runs that and has no events. */
  override connectedCallback(): void {
    super.connectedCallback()
    this.addEventListener('pointerdown', this.handlePointerDown)
    this.addEventListener('pointerenter', this.handlePointerEnter)
    this.addEventListener('pointerleave', this.handlePointerLeave)
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback()
    this.removeEventListener('pointerdown', this.handlePointerDown)
    this.removeEventListener('pointerenter', this.handlePointerEnter)
    this.removeEventListener('pointerleave', this.handlePointerLeave)
    this.stop()
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
    /* The listeners sit on the host rather than the trigger, so the panel counts
       as inside it: the top layer changes where the panel is painted and not
       where it is in the tree, so a pointer moving off the trigger and onto the
       panel has not left this element and fires no leave. */
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
