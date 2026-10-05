import {
  arrowReach,
  customElement,
  elementById,
  HelixElement,
  HelixTourAskEvent,
  type Placement,
  PopoverController,
  reflectElements,
  type Side,
  sideOf,
} from '@fusion.dev/helix-core'
import { nothing, type PropertyValues, type TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../button/index.js'
import { stopNaming } from '../naming.js'

/**
 * @summary One stop on a tour: the element it points at, and a panel of content about it.
 *
 * @description
 * A stop names its target with `for` and holds the content you put in it. The
 * stop handles three things:
 *
 * - **Placement.** The panel is anchored to the target by the same floating
 *   positioning as the other Helix overlays.
 * - **Stacking.** The panel is a popover, so it is in the top layer and shows
 *   above dialogs, scrolling regions, and other stacking contexts.
 * - **Visibility.** The stop shows when it is `current`, which the root sets.
 *
 * Put any content in the stop, such as a `Card`, or a heading and a line of
 * text. The `heading` and `description` slots are optional places for the
 * title and the line under it, which then name and describe the panel.
 *
 * **A stop has a type.** Without one it is a bubble pointing at its target.
 * `type="dialog"` is a panel in the middle of the window, over a backdrop, for
 * a welcome or a summary with nothing to point at. `type="floating"` is a
 * panel in a corner of the window, which the styled tier puts at the end of
 * the line, for a note that points at nothing in particular. `type="wait"` shows nothing: the tour waits
 * for the element `for` names to be on the page, such as a menu the reader has
 * to open, and moves on by itself.
 *
 * **The buttons are slot fallback.** With nothing in the `actions` slot, you
 * get Back, Next, and Skip, already wired. Slot your own `actions` and drive
 * them with `next()`, `back()`, and `skip()` on the root.
 *
 * **`for` is an id, as with `Tooltip`**, so you can point at a target elsewhere
 * on the page from markup. It resolves against the stop's root node, so a stop
 * inside a shadow tree points at a target in that tree.
 *
 * The panel is a `group`, and a `dialog` for a dialog stop, only while the
 * stop is shown. It is named by the `heading` slot, then by the first heading
 * in the content, then by `label`, and otherwise by its place in the tour. It
 * is described by the `description` slot and by its place, such as "2 of 5",
 * so a screen reader says where the reader is at every stop. `focus()` moves
 * focus to the panel, which is what the tour does when it opens or moves on.
 *
 * @since 0.1.0
 * @status stable
 * @category overlays
 * @documentation https://fusion.dev/helix/components/tour
 *
 * @slot - The stop's content. Any content works, such as a card, or a heading and a line.
 * @slot actions - Replaces the controls, which are Back, Next, and Skip.
 * @slot description - A line under the title, which describes the panel.
 * @slot heading - The stop's title, which names the panel.
 *
 * @event {HelixTourAskEvent} helix-tour-ask - Fired when one of the stop's controls is pressed, to move the tour.
 *
 * @csspart actions - The row the controls sit in.
 * @csspart arrow - The arrow that points at the target.
 * @csspart arrow-bottom - The arrow while the panel is below its target, on the panel's top edge. Applied with `arrow`.
 * @csspart arrow-left - The arrow while the panel is left of its target, on the panel's right edge. Applied with `arrow`.
 * @csspart arrow-right - The arrow while the panel is right of its target, on the panel's left edge. Applied with `arrow`.
 * @csspart arrow-top - The arrow while the panel is above its target, on the panel's bottom edge. Applied with `arrow`.
 * @csspart back - The control that goes to the previous stop.
 * @csspart back-button - The button inside `back`.
 * @csspart back-live - The live region inside `back`.
 * @csspart back-text - The words on that button, trimmed to their capitals and baseline.
 * @csspart bubble - The panel that points at the target.
 * @csspart content - The region holding the slotted content.
 * @csspart description - The slot the description is in. It draws no box until you give it one.
 * @csspart heading - The slot the title is in. It draws no box until you give it one.
 * @csspart next - The control that goes to the next stop, and finishes the tour on the last stop.
 * @csspart next-button - The button inside `next`.
 * @csspart next-live - The live region inside `next`.
 * @csspart next-text - The words on that button, trimmed to their capitals and baseline.
 * @csspart progress - The stop's place in the tour, such as "2 of 5". It describes the panel, and is shown when the tour has `progress`.
 * @csspart skip - The control that ends the tour early.
 * @csspart skip-button - The button inside `skip`.
 * @csspart skip-live - The live region inside `skip`.
 * @csspart skip-text - The words on that button, trimmed to their capitals and baseline.
 *
 * @cssstate placed-bottom - The panel sits below its target.
 * @cssstate placed-left - The panel sits to the left of its target.
 * @cssstate placed-right - The panel sits to the right of its target.
 * @cssstate placed-top - The panel sits above its target.
 */
@customElement('helix-headless-tour-stop')
export class HelixHeadlessTourStop extends HelixElement {
  /**
   * Label for the control that goes back.
   */
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Whether the stop is the one being shown.
   *
   * Written by the root rather than by a consumer, which is the one place this
   * family writes onto markup it does not own. It is acceptable here for a
   * reason that did not hold for the trail or the avatar group: a tour starts
   * closed, so there is no server state to get wrong. The server renders a
   * closed tour, a closed tour shows nothing, and nothing can disagree.
   */
  @property({ reflect: true, type: Boolean })
  current = false

  /**
   * Label for the control that goes on from the last stop.
   */
  @property({ attribute: 'done-label' })
  doneLabel = 'Done'

  /**
   * Whether the stop is the first one, with no stop before it.
   */
  @property({ reflect: true, type: Boolean })
  first = false

  /**
   * The id of the element the stop points at.
   */
  @property()
  for = ''

  /**
   * The panel's name, where neither the `heading` slot nor the content holds a
   * heading.
   */
  @property()
  label = ''

  /**
   * Whether the stop is the last one. Its next control then shows `doneLabel`.
   */
  @property({ reflect: true, type: Boolean })
  last = false

  /**
   * Label for the control that goes on.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next'

  /**
   * The side of the target the panel is placed on when there is room.
   */
  @property()
  placement: Placement = 'bottom'

  /**
   * @internal Set by the tour: the stop's place in it, such as "2 of 5".
   */
  @property({ attribute: false })
  position = ''

  /**
   * @internal Set by the tour: whether the stop's place is drawn as well as
   * read.
   */
  @property({ attribute: false })
  progress = false

  /**
   * Label for the control that leaves the tour.
   */
  @property({ attribute: 'skip-label' })
  skipLabel = 'Skip'

  /**
   * What kind of stop this is. Unset, it is a bubble pointing at its target.
   *
   * - `dialog`: a panel in the middle of the window, over a backdrop
   * - `floating`: a panel in a corner of the window
   * - `wait`: nothing shown, while the tour waits for the target to be on the page
   *
   * Reflected, because the styled tier places a dialog and a floating panel by
   * it, and unset at rest, so no default is written onto the host.
   */
  @property({ reflect: true })
  type?: 'dialog' | 'floating' | 'wait'

  /**
   * The side of its target the panel last landed on, which names the arrow's
   * second part. Undefined until the first placement, which the server never
   * makes.
   */
  @state()
  private side?: Side

  /** The element the stop points at, or `null` when no element has the `for` id. */
  get target(): HTMLElement | null {
    return this.for === '' ? null : elementById(this, this.for)
  }

  private readonly floating = new PopoverController(this, {
    anchor: () => this.target,
    arrow: () => this.partNamed('arrow'),
    /* Clear of the light, measured to the point of the arrow. The tour lights
       `spotlight-padding` around the target and the arrow reaches `n / sqrt(2)`
       past the panel's edge, and with no offset the panel sat on the target
       itself, over the lit margin, with its point 5.7px into what it pointed
       at. `offsetWidth` rather than a rect, which reports the rotated box. */
    offset: () => {
      const tour = this.parentElement as (HTMLElement & { spotlightPadding?: number }) | null
      return (tour?.spotlightPadding ?? 0) + arrowReach(this.partNamed('arrow'))
    },
    /* A press outside does not end a tour, and this is the decision rather than
       a stub. Everywhere else a surface closes on an outside press because
       pressing elsewhere means the reader is finished with it. Here elsewhere
       is the thing being pointed at: the scrim lets the pointer through on
       purpose, so the first press a reader makes on the button the tour is
       describing would be the press that ends the tour. Leaving is the skip
       control and `Escape`, both of which say so. */
    onDismiss: () => {},
    /* The side the panel landed on, which is not always `placement`: a stop
       with no room on the side it asked for is moved. The floating pass puts
       the arrow on the edge facing the target itself; what a sheet draws by
       side is the edge on the arrow's two outer sides. The styled tier reads
       `data-placement` on the panel, inside this shadow root; a stylesheet
       outside cannot follow `::part(arrow)` with an attribute, and reading the
       stop's own `placement` instead drew from the side that was asked for, or
       from below wherever React had set it as a property and there was no
       attribute to read. */
    onPlace: (placement) => {
      const side = sideOf(placement)
      this.toggleState('placed-bottom', side === 'bottom')
      this.toggleState('placed-left', side === 'left')
      this.toggleState('placed-right', side === 'right')
      this.toggleState('placed-top', side === 'top')
      this.side = side
    },
    /* Measured against the target only for a bubble: a dialog and a floating
       panel are placed by their stylesheet. */
    place: () => this.type === undefined,
    placement: () => this.placement,
    surface: () => this.partNamed('bubble'),
  })

  /**
   * Moves focus to the panel while the stop is shown.
   *
   * The host draws no box and takes no focus, so focusing it did nothing. The
   * panel takes focus without joining the `Tab` order, and a screen reader
   * reads the group it is.
   */
  override focus(options?: FocusOptions): void {
    const bubble = this.partNamed('bubble')
    if (this.current && bubble) {
      bubble.focus(options)
      return
    }
    super.focus(options)
  }

  /**
   * Names and describes the panel, by element reference: the words are in the
   * light DOM and the panel in this shadow root, which an IDREF cannot cross.
   * `stopNaming` decides which words.
   */
  private nameByHeading(): void {
    const bubble = this.partNamed('bubble')
    const slotted = (name: string): Element[] =>
      this.renderRoot
        .querySelector<HTMLSlotElement>(`slot[name="${name}"]`)
        ?.assignedElements({ flatten: true }) ?? []
    const { describedBy, labelledBy } = stopNaming({
      content: [...this.children].filter((one) => !one.slot),
      description: slotted('description'),
      heading: slotted('heading'),
      labeled: this.label !== '',
      progress: this.position === '' ? null : this.partNamed('progress'),
    })
    /* Owned outright: the stop writes both whatever it found, and clears what
       it finds nothing for. */
    reflectElements(bubble, 'ariaLabelledByElements', labelledBy, true)
    reflectElements(bubble, 'ariaDescribedByElements', describedBy, true)
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.nameByHeading()
    /* Shown and hidden from here rather than by a controller reading a
       property, because `current` is written onto this element by the root and
       is not a property this element decides. The controller does the top layer
       and the placement; when is ours. */
    if (this.current && this.type !== 'wait') {
      this.floating.show()
    } else {
      this.floating.hide()
    }
  }

  /**
   * Skip, back and next, behind a seam the styled tier can move.
   *
   * They are slot fallback rather than markup a consumer has to write, so a
   * tour with nothing slotted still has the three controls a tour needs; and
   * they are a method as well, so a tier above can render its own three without
   * reimplementing the panel around them. Both are needed: the slot is for the
   * consumer and the method is for the tier.
   */
  protected renderActions(): TemplateResult {
    return html`<slot name="actions">
      <${this.tag('button')}
        part="skip"
      exportparts="button: skip-button, live: skip-live, text: skip-text" emphasis="ghost" @click=${() => this.ask('skip')}>
        ${this.skipLabel}
      </${this.tag('button')}>
      ${
        this.first
          ? ''
          : html`<${this.tag('button')}
              part="back"
      exportparts="button: back-button, live: back-live, text: back-text"
              emphasis="outlined"
              @click=${() => this.ask('back')}
            >
              ${this.backLabel}
            </${this.tag('button')}>`
      }
      <${this.tag('button')}
        part="next"
      exportparts="button: next-button, live: next-live, text: next-text"
        emphasis="solid"
        tone="primary"
        @click=${() => this.ask('next')}
      >
        ${this.last ? this.doneLabel : this.nextLabel}
      </${this.tag('button')}>
    </slot>`
  }

  protected override render(): TemplateResult {
    /* `group` and not `dialog`, and this is a decision rather than a shortcut.
       A tour must not trap focus: the reader has to be able to look at the
       thing being pointed at, and an overlay that will not let them has hidden
       its own subject. On the panel rather than the host, so a stop that is not
       shown is in the tree as nothing at all. */
    return html`<div
      part="bubble"
      popover="manual"
      role=${this.type === 'dialog' ? 'dialog' : 'group'}
      tabindex="-1"
      aria-label=${this.label || nothing}
      ?hidden=${!this.current || this.type === 'wait'}
    >
      ${
        /* The one surface in this library that draws an arrow, and every other
           one deliberately does not. A menu or a select hangs off its trigger
           and adjacency says what it belongs to; a tour panel is anchored to
           something it did not open, on a page full of other things, and
           collision may flip it to the far side of its target. Leaving arrows
           off elsewhere is house style rather than a fact about the system. */
        ''
      }
      <div
        part="arrow${this.side ? { bottom: ' arrow-bottom', left: ' arrow-left', right: ' arrow-right', top: ' arrow-top' }[this.side] : ''}"
        aria-hidden="true"
      ></div>
      <slot name="heading" part="heading" @slotchange=${this.nameByHeading}></slot>
      <slot name="description" part="description" @slotchange=${this.nameByHeading}></slot>
      <div part="content"><slot></slot></div>
      ${
        /* Said always, through the panel's description, and drawn only when the
           tour asks: a panel's position is the screen reader's to hear at every
           stop, and a sighted reader may not want the count. */
        this.position === ''
          ? ''
          : html`<span part="progress" ?hidden=${!this.progress}>${this.position}</span>`
      }
      <div part="actions">
        ${this.renderActions()}
      </div>
    </div>`
  }

  /**
   * Says what the reader pressed and lets the root decide.
   *
   * A stop cannot move a tour: it does not know what is after it, and a stop
   * that reached up to its parent to find out would be a stop that only works
   * inside one. Composed, so the root hears it through its own slot.
   */
  private ask(what: 'back' | 'next' | 'skip'): void {
    this.dispatchEvent(new HelixTourAskEvent({ what }))
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-tour-stop': HelixHeadlessTourStop
  }
}
