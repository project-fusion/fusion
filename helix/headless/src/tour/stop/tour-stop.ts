import {
  customElement,
  HelixElement,
  HelixTourAskEvent,
  hostAria,
  type Placement,
  PopoverController,
  type Side,
} from '@fusion.dev/helix-core'
import type { PropertyValues, TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { html } from 'lit/static-html.js'
import '../../button/index.js'

/**
 * @summary One stop on a tour: what it points at, and a panel to say it in.
 *
 * @description
 * A stop names a target with `for` and holds whatever the consumer puts in it.
 * It owns no content of its own, which is the whole shape of this family: the
 * tour abstracts the three things that are genuinely hard, and the words are
 * the consumer's.
 *
 * What it does own:
 *
 * - **Where the panel goes.** Anchored to the target through the same floating
 *   pass every other overlay here uses.
 * - **That it is on top.** A popover, so it is in the top layer. A tour points
 *   at things inside dialogs, inside scrollers, inside anything with a stacking
 *   context, and a panel in the ordinary flow loses to all three.
 * - **When it shows.** Which is `current`, and which the root decides.
 *
 * What it does not own is the heading, the paragraph, the picture and the
 * layout. Slot a `helix-card`, or a heading and a line of prose, or anything
 * else. Fixed `title` and `body` parts would be a component deciding what a
 * tour is allowed to say.
 *
 * **The buttons are slot fallback, so the common case costs nothing and the
 * uncommon one is possible.** Write nothing and get Back, Next and Skip already
 * wired. Slot `actions` and they are yours, driven by `next()`, `back()` and
 * `skip()` on the root, which are public for exactly that.
 *
 * **`for` is an id, the same as `Tooltip`'s.** The target is elsewhere on the
 * page, and an id is the one reference a consumer can write in markup without
 * holding an element. Resolved against the root node, so a stop inside a shadow
 * tree points at a target in that tree.
 *
 * @since 0.1.0
 * @status experimental
 * @category overlays
 * @documentation https://helix.fusion.dev/components/tour
 *
 * @slot - What this stop says. A card, a heading and a line, anything.
 * @slot actions - Replaces the controls, which are Back, Next and Skip.
 *
 * @event {HelixTourAskEvent} helix-tour-ask - A stop asking the tour to move, from its own controls.
 *
 * @csspart actions - The row the controls sit in.
 * @csspart arrow - The point, which the floating pass places against the target.
 * @csspart arrow-bottom - The point while the panel is below its target, so on the panel's top edge, beside `arrow`.
 * @csspart arrow-left - The point while the panel is left of its target, so on the panel's right edge, beside `arrow`.
 * @csspart arrow-right - The point while the panel is right of its target, so on the panel's left edge, beside `arrow`.
 * @csspart arrow-top - The point while the panel is above its target, so on the panel's bottom edge, beside `arrow`.
 * @csspart back - The control that goes to the previous stop.
 * @csspart back-button - The inner control.
 * @csspart bubble - The panel that points at the target.
 * @csspart content - The region holding the slotted content.
 * @csspart next - The control that goes on, and finishes on the last stop.
 * @csspart next-button - The inner control.
 * @csspart skip - The control that leaves the tour.
 * @csspart skip-button - The inner control.
 *
 * @cssstate placed-bottom - While the panel sits below its target.
 * @cssstate placed-left - While the panel sits to the left of its target.
 * @cssstate placed-right - While the panel sits to the right of its target.
 * @cssstate placed-top - While the panel sits above its target.
 */
@customElement('helix-headless-tour-stop')
export class HelixHeadlessTourStop extends HelixElement {
  /**
   * Label for the control that goes back.
   */
  @property({ attribute: 'back-label' })
  backLabel = 'Back'

  /**
   * Whether this is the stop the reader is on.
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
   * Whether this is the first stop, so there is nowhere back to.
   */
  @property({ reflect: true, type: Boolean })
  first = false

  /**
   * The id of the element this stop is about.
   */
  @property()
  for = ''

  /**
   * Whether this is the last stop, so the control says Done.
   */
  @property({ reflect: true, type: Boolean })
  last = false

  /**
   * Label for the control that goes on.
   */
  @property({ attribute: 'next-label' })
  nextLabel = 'Next'

  /**
   * Which side of the target the panel prefers.
   */
  @property()
  placement: Placement = 'bottom'

  /**
   * Label for the control that leaves the tour.
   */
  @property({ attribute: 'skip-label' })
  skipLabel = 'Skip'

  /**
   * The side of its target the panel last landed on, which names the arrow's
   * second part. Undefined until the first placement, which the server never
   * makes.
   */
  @state()
  private side?: Side

  /** The element this stop is about, or null where the id resolves to nothing. */
  get target(): HTMLElement | null {
    const scope = this.getRootNode() as Document | ShadowRoot
    return this.for === '' ? null : (scope.getElementById?.(this.for) ?? null)
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
      return (
        (tour?.spotlightPadding ?? 0) + (this.partNamed('arrow')?.offsetWidth ?? 0) / Math.SQRT2
      )
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
      const side = placement.split('-')[0] as Side
      this.toggleState('placed-bottom', side === 'bottom')
      this.toggleState('placed-left', side === 'left')
      this.toggleState('placed-right', side === 'right')
      this.toggleState('placed-top', side === 'top')
      this.side = side
    },
    placement: () => this.placement,
    surface: () => this.partNamed('bubble'),
  })

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    /* `group`, not `dialog`, and this is a decision rather than a shortcut. A
       tour must not trap focus: the reader has to be able to look at the thing
       being pointed at, and an overlay that will not let them has hidden its
       own subject. */
    hostAria(this.internals, { role: 'group' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Shown and hidden from here rather than by a controller reading a
       property, because `current` is written onto this element by the root and
       is not a property this element decides. The controller does the top layer
       and the placement; when is ours. */
    if (this.current) {
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
      exportparts="button: skip-button" emphasis="ghost" @click=${() => this.ask('skip')}>
        ${this.skipLabel}
      </${this.tag('button')}>
      ${
        this.first
          ? ''
          : html`<${this.tag('button')}
              part="back"
      exportparts="button: back-button"
              emphasis="outlined"
              @click=${() => this.ask('back')}
            >
              ${this.backLabel}
            </${this.tag('button')}>`
      }
      <${this.tag('button')}
        part="next"
      exportparts="button: next-button"
        emphasis="solid"
        tone="primary"
        @click=${() => this.ask('next')}
      >
        ${this.last ? this.doneLabel : this.nextLabel}
      </${this.tag('button')}>
    </slot>`
  }

  protected override render(): TemplateResult {
    return html`<div part="bubble" popover="manual" ?hidden=${!this.current}>
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
      <div part="content"><slot></slot></div>
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
