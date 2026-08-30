import type { ReactiveController, ReactiveControllerHost } from 'lit'

/** What the controller needs to know: which element inside is the control. */
export interface AriaForwardOptions {
  /** The focusable thing in the shadow root, or null before it renders. */
  target: () => HTMLElement | null
}

/** The two relationships a consumer writes on a host and means for the control. */
const RELATIONSHIPS = [
  ['aria-describedby', 'ariaDescribedByElements'],
  ['aria-labelledby', 'ariaLabelledByElements'],
] as const

/**
 * The state attributes a host may carry and mean for the control inside it.
 *
 * **Copied rather than resolved, which is what makes them a separate list.** A
 * relationship above names ids in the consumer's tree and can only travel as an
 * element reference; these are plain strings and the value means the same thing
 * wherever it is written, so the whole of the work is putting it on the node the
 * accessibility tree actually exposes.
 *
 * **A state written on a host reaches nobody.** `Megamenu` and `SpeedDial` write
 * `aria-expanded` onto whatever a consumer slots, and where that is a
 * `<helix-button>` it lands on a host the tree reports as `generic`: measured
 * through Chrome's own tree, a button named "Mega" with no expanded state at
 * all. A plain `<button slot="trigger">` never had the problem, because there
 * the host *is* the focusable node.
 *
 * **Only what this controller put there is ever taken away.** Removing any of
 * these from the control whenever the host lacks it reads as the obvious way to
 * keep the two in step and quietly deletes what the component renders for
 * itself: `Combobox` writes `aria-controls="listbox"` onto its own input and
 * `Select` writes `aria-expanded` onto its own trigger, and a controller
 * carrying nothing would wipe both on every update.
 *
 * So the record below holds what was forwarded last time, and a host that stops
 * carrying one removes exactly that and nothing else. A control's own attribute
 * is untouched either way, which is the only rule that can be right: this
 * controller knows what the host said and cannot know what the template meant.
 */
const STATES = ['aria-expanded', 'aria-haspopup', 'aria-controls'] as const

/**
 * Carries a host's ARIA references down to the control inside it.
 *
 * **The gap this closes, measured.** `<helix-button aria-describedby="tip">` puts
 * the description on the host, and the host is not what a reader is on: the
 * accessibility tree exposes the `<button>` in the shadow root, and the host
 * beside it is a generic with a description nobody hears. Read from Chrome's own
 * tree:
 *
 * ```
 * host           role=generic  name=""       desc="Helix description"
 * inner button   role=button   name="Helix"  desc=""
 * ```
 *
 * A plain `<button>` with the identical attribute reads `desc="Helix
 * description"`, so the reference itself is fine and only its destination is
 * wrong. This moves it.
 *
 * **An IDREF cannot make that trip and an element reference can.** The ids are
 * written in the consumer's tree and the control is in a shadow root, so
 * `aria-describedby` copied onto the inner element resolves to nothing.
 * `ariaDescribedByElements` takes the elements themselves, and a reference is
 * valid into the same tree *or a shadow-including ancestor* of it: from inside
 * the shadow root looking out, the document is exactly that. Measured, the
 * assignment reads back with the node intact, where the inward direction, from a
 * light-DOM trigger to a node in a shadow root, reads back empty. This is the
 * one direction that works, which is why `Tooltip` needs `for` and this does
 * not.
 *
 * **The attributes stay on the host.** Nothing is removed and nothing is added:
 * the consumer's markup is exactly what they wrote, which is the same reason
 * `hostAria` exists. What changes is only that the control now also holds the
 * reference, so a screen reader on the focused element hears it.
 *
 * Watched with a `MutationObserver`, because a reference can arrive at any time:
 * a framework rendering a tooltip after this element upgrades, or a consumer
 * pointing `aria-describedby` at a different id, changes an attribute and
 * nothing schedules a Lit update.
 */
export class AriaForwardController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly target: () => HTMLElement | null

  private observer: MutationObserver | undefined

  /** Which state attributes this controller wrote, so only those are removed. */
  private readonly forwarded = new Set<string>()

  /** The control the record above is about, so a replacement resets it. */
  private recorded: HTMLElement | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: AriaForwardOptions) {
    this.host = host
    this.target = options.target
    host.addController(this)
  }

  /**
   * Resolves the host's references and hands them to the control.
   *
   * Resolved through the host's own root rather than `document`, so a button
   * inside another component's shadow root finds the ids written beside it
   * there. Ids that resolve to nothing are dropped rather than passed on: an
   * `aria-describedby` naming a heading that has been removed is a stale
   * reference, and an empty array clears the property rather than leaving the
   * last good one in place.
   */
  forward(): void {
    const target = this.target()
    if (!target) {
      return
    }
    /* **The record belongs to the element it was written about.** `forwarded`
       says what this controller put on the control, and a component that
       re-renders its control produces a new element carrying none of it:
       `Button` does exactly that whenever `href` swaps an anchor for a button.
       Kept across the swap, the record claims a value the new element never
       had, and the clearing branch below then removes an attribute the
       component wrote itself, which is the fault this whole record exists to
       prevent, one element later. */
    if (target !== this.recorded) {
      this.forwarded.clear()
      this.recorded = target
    }
    const root = this.host.getRootNode() as Document | ShadowRoot
    for (const [attribute, property] of RELATIONSHIPS) {
      if (!(property in target)) {
        // An engine without element reflection. Nothing to do, and nothing that
        // silently half works: assigning to a property it does not implement is
        // a no-op rather than an error, which is what the guard makes visible.
        continue
      }
      const ids = (this.host.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)
      const elements = ids
        .map((id) => root.getElementById?.(id) ?? null)
        .filter((element): element is HTMLElement => element !== null)
      const reflect = target as unknown as Record<string, Element[] | null>
      if (elements.length > 0) {
        reflect[property] = elements
        this.forwarded.add(attribute)
        continue
      }
      /* Only if this controller is what put it there, which is the same rule
         the states below keep and for a worse reason. `MixinField` writes
         `aria-describedby` on the control for its own hint, and assigning null
         here removes the content attribute, so forwarding nothing wiped the
         component's own description on all eighteen form controls. Invisible to
         every DOM spec: happy-dom implements no ARIA element reflection, so the
         `property in target` guard above skips this whole branch and the suite
         is green against code that clears a description in every browser. */
      if (this.forwarded.has(attribute)) {
        reflect[property] = null
        this.forwarded.delete(attribute)
      }
    }
    for (const attribute of STATES) {
      const value = this.host.getAttribute(attribute)
      if (value === null) {
        // Only if this controller is what put it there. See the note above.
        if (this.forwarded.has(attribute)) {
          target.removeAttribute(attribute)
          this.forwarded.delete(attribute)
        }
        continue
      }
      target.setAttribute(attribute, value)
      this.forwarded.add(attribute)
    }
  }

  hostConnected(): void {
    this.observer = new MutationObserver(() => this.forward())
    this.observer.observe(this.host, {
      attributeFilter: [...RELATIONSHIPS.map(([attribute]) => attribute), ...STATES],
    })
  }

  hostDisconnected(): void {
    this.observer?.disconnect()
    this.observer = undefined
  }

  /* After the render that created the control, because there is nothing to
     forward to before it exists. Every update, not only the first: a component
     that re-renders its control, which `Button` does whenever `href` changes it
     between an anchor and a button, produces a new element with none of this. */
  hostUpdated(): void {
    this.forward()
  }
}
