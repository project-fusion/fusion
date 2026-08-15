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
  HTMLElement & { disabled: boolean; renderRoot: DocumentFragment | HTMLElement }

/**
 * Pushes a group's `disabled` onto its members, on every update, unasked.
 *
 * **The cascade itself is `inheritDisabled`, and this is what makes it
 * automatic.** Four groups called that function by hand from inside whichever
 * method they happened to use for writing to their items: `place` in two of
 * them, `sync` in a third, `place` again in the fourth. That works, and it is
 * the wrong shape for three reasons.
 *
 * It runs when that method runs. A group whose items changed without going
 * through it left them holding the last answer, and which paths reach it is a
 * different set in each of the four.
 *
 * It has to be remembered. A fifth group gets no cascade at all, and nothing
 * says so: the property exists, the attribute reflects, and the members simply
 * ignore it. That is the failure this exists to make impossible, because it is
 * invisible in review and only shows up when someone disables a set.
 *
 * And it adds no API. A group already has `disabled`, from `HelixFormElement`
 * or from the consumer; nothing here introduces a property or a method for
 * anyone to call. By this repo's own rule that makes it a controller and not a
 * mixin: it reacts to a lifecycle and nothing else.
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
    inheritDisabled(this.host.disabled, this.items())
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
