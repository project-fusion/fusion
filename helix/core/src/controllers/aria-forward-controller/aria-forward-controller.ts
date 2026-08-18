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
      ;(target as unknown as Record<string, Element[] | null>)[property] =
        elements.length > 0 ? elements : null
    }
  }

  hostConnected(): void {
    this.observer = new MutationObserver(() => this.forward())
    this.observer.observe(this.host, {
      attributeFilter: RELATIONSHIPS.map(([attribute]) => attribute),
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
