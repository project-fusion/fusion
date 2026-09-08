import type { ReactiveController, ReactiveControllerHost } from 'lit'
import {
  type DisableableItem,
  inheritDisabled,
} from '../../utils/inherit-disabled/inherit-disabled.js'

/** What the controller needs of the group it is cascading through. */
export interface DisabledCascadeOptions {
  /** The members, read fresh each pass. */
  items: () => DisableableItem[]
}

/**
 * A host that can be out of play, which is every group this runs on.
 *
 * `renderRoot` is named here because `ReactiveControllerHost` does not carry
 * it: the interface is the scheduling contract and says nothing about where a
 * host renders. Every Lit element has one, and this needs it to hear
 * `slotchange`, which stops at the root that owns the slot.
 */
type DisableableHost = ReactiveControllerHost &
  HTMLElement & {
    disabled: boolean
    /**
     * The form-associated reading, where the host has one.
     *
     * Optional because not every group that cascades is form-associated: Toggle
     * Group is a plain element with a `disabled` of its own and nothing to
     * inherit from a fieldset.
     */
    isDisabled?: boolean
    renderRoot: DocumentFragment | HTMLElement
  }

/**
 * Pushes a group's `disabled` onto its members, on every update, unasked.
 *
 * **The cascade itself is `inheritDisabled`, and this is what makes it
 * automatic.** Called by hand it runs only when whichever method holds the call
 * runs, so a group whose items changed by some other path leaves them holding
 * the last answer, and a group that forgets the call gets no cascade at all
 * with nothing to say so: the property exists, the attribute reflects, and the
 * members simply ignore it. That is invisible in review and shows up only when
 * someone disables a set.
 *
 * It adds no API. A group already has `disabled`, from `HelixFormElement` or
 * from the consumer; nothing here introduces a property or a method for anyone
 * to call. By this repo's own rule that makes it a controller and not a mixin:
 * it reacts to a lifecycle and nothing else.
 *
 * So a group states its members once, at construction, and never thinks about
 * it again:
 *
 *     new DisabledCascadeController(this, { items: () => this.items })
 *
 * **Runs after every render, and on every `slotchange`.** The second half is
 * not an extra: a member arriving in the light DOM changes no property, so Lit
 * schedules nothing, and a render-only cascade leaves a member slotted into an
 * already-disabled group enabled. Measured before it was added, on a radio
 * group holding two disabled members with a third inserted: `110`, and the
 * third was live in a set nobody could use.
 *
 * The listener is on the render root rather than on the host, because
 * `slotchange` bubbles but is not composed: it reaches the shadow root that
 * owns the slot and stops there. On the host it would never fire at all.
 *
 * After render rather than before, because the items are read from the DOM and
 * a newly slotted member is not there until the render that assigns it.
 *
 * Idempotent, so running on every update costs a comparison per member and
 * nothing else: `inheritDisabled` writes only where the answer changed and
 * remembers what each member said for itself, which is what lets a group be
 * re-enabled without freeing a member that was disabled on its own.
 */
export class DisabledCascadeController implements ReactiveController {
  private readonly host: DisableableHost

  private readonly items: () => DisableableItem[]

  constructor(host: DisableableHost, { items }: DisabledCascadeOptions) {
    this.host = host
    this.items = items
    host.addController(this)
  }

  private readonly cascade = (): void => {
    /* **`isDisabled` before `disabled`, and the difference is a fieldset.**
       `disabled` is only what the group was given directly; `isDisabled` is that
       or'd with `formDisabled`, which is how a `<fieldset disabled>` reaches a
       form-associated element. Reading the first alone, a listbox inside a
       disabled fieldset reported `disabled === false`, cascaded that to its
       options, and every one of them stayed selectable: the group was dimmed and
       its members still took a click.

       Falling back rather than requiring it, because Toggle Group is not
       form-associated and has nothing but its own `disabled`. */
    inheritDisabled(this.host.isDisabled ?? this.host.disabled, this.items())
  }

  hostConnected(): void {
    this.host.renderRoot.addEventListener('slotchange', this.cascade)
  }

  hostDisconnected(): void {
    this.host.renderRoot.removeEventListener('slotchange', this.cascade)
  }

  hostUpdated(): void {
    this.cascade()
  }
}
