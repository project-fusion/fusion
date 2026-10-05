import type { ReactiveController, ReactiveControllerHost } from 'lit'
import { auditName, nameText } from '../../utils/audit-name/audit-name.js'
import { elementById } from '../../utils/element-by-id/element-by-id.js'

/** What the controller needs to know: which element inside is the control. */
export interface AriaForwardOptions {
  /**
   * Whether a host `aria-label` names the control too.
   *
   * For a control named by its content, a button or a switch, which has no
   * `label` to render it into. A field renders its `aria-label` as a clipped
   * label already, so it leaves this off. A function is asked on every
   * forward, for a subclass that names the control itself.
   */
  label?: boolean | (() => boolean)
  /**
   * Elements read after whatever names the control from outside, the host's
   * `aria-labelledby` or its `<label>`.
   *
   * For a control whose name is the label and then what it shows, as a
   * native `<select>` is named. Added only where the host gives a name, so a
   * control named by its own template keeps its own.
   */
  labelledByAfter?: () => Element[]
  /**
   * Whether the control has a name of its own, where its own labels do not
   * say.
   *
   * A file input is labeled by the trigger that opens its picker, "Choose
   * files", which is an action rather than a name, so a page's `<label>`
   * should still name it. Absent, the control's own `aria-label`,
   * `aria-labelledby` and labels with words in them decide.
   */
  named?: () => boolean
  /** The focusable thing in the shadow root, or null before it renders. */
  target: () => HTMLElement | null
  /**
   * How to name the control, said in a warning when it has no accessible
   * name once it has rendered. Absent, the name is not checked.
   *
   * For a control named by its content or a host attribute, as a button is. A
   * field is checked by `MixinField`, which knows its label.
   */
  unnamed?: string
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
 * `aria-invalid` is one of them: a field a server has already judged wrong is
 * written `aria-invalid="true"`, and a picker marks the list or slider it
 * draws with it, and either way the word belongs on the control a reader is on.
 *
 * `aria-current` is another: a stage in a sequence marks its name's button
 * `aria-current="step"`, and the button is a host the tree reports as
 * `generic`, so the word reached nobody until it was carried to the control.
 *
 * So the record below holds what was forwarded last time, and a host that stops
 * carrying one removes exactly that and nothing else. A control's own attribute
 * is untouched either way, which is the only rule that can be right: this
 * controller knows what the host said and cannot know what the template meant.
 */
const STATES = [
  'aria-current',
  'aria-expanded',
  'aria-haspopup',
  'aria-controls',
  'aria-invalid',
  'aria-pressed',
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
 *
 * **A `<label>` that names the host names the control too**, when the control
 * has no name of its own. The platform gives a form-associated host its labels
 * and the host is a generic the reader never lands on, so a `<label for>` or a
 * wrapping `<label>` left the textbox unnamed. The labels travel the same way a
 * forwarded `aria-labelledby` does, as element references, and are read again
 * when focus arrives, since a label can be added without the host hearing.
 */
export class AriaForwardController implements ReactiveController {
  private readonly host: ReactiveControllerHost & HTMLElement

  private readonly target: () => HTMLElement | null

  private observer: MutationObserver | undefined

  /** Which state attributes this controller wrote, so only those are removed. */
  private readonly forwarded = new Set<string>()

  /** The control the record above is about, so a replacement resets it. */
  private recorded: HTMLElement | undefined

  /** Whether a host `aria-label` is carried down. See the option. */
  private readonly asked: boolean | (() => boolean)

  private get label(): boolean {
    return typeof this.asked === 'function' ? this.asked() : this.asked
  }

  /** The component's own answer to whether the control is named. See the option. */
  private readonly named: (() => boolean) | undefined

  /** What is read after the host's names. See the option. */
  private readonly after: (() => Element[]) | undefined

  /** How to name the control, where its name is checked. See the option. */
  private readonly unnamed: string | undefined

  constructor(host: ReactiveControllerHost & HTMLElement, options: AriaForwardOptions) {
    this.host = host
    this.target = options.target
    this.asked = options.label ?? false
    this.named = options.named
    this.after = options.labelledByAfter
    this.unnamed = options.unnamed
    host.addController(this)
  }

  /**
   * Whether the control has a name that did not come from this controller: an
   * `aria-label`, an `aria-labelledby` of its own, or a label of its own with
   * words in it.
   */
  private namedByItself(target: HTMLElement): boolean {
    if (target.getAttribute('aria-label')) {
      return true
    }
    if (!this.forwarded.has('aria-labelledby') && target.hasAttribute('aria-labelledby')) {
      return true
    }
    const own = (target as HTMLElement & { labels?: NodeList | null }).labels
    return [...(own ?? [])].some((label) => nameText(label).trim() !== '')
  }

  /**
   * The labels the platform associated with the host, for a control with no
   * name of its own, and none otherwise.
   */
  private hostLabels(target: HTMLElement): HTMLElement[] {
    const labels = (this.host as HTMLElement & { labels?: NodeList | null }).labels
    const named = this.named ? this.named() : this.namedByItself(target)
    if (!labels || labels.length === 0 || named) {
      return []
    }
    return [...labels].filter((label): label is HTMLElement => label instanceof HTMLElement)
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
       says what this controller put on the control. Kept across a replacement,
       it claims a value the new element never had, and the clearing branches
       below then take off what the component wrote itself: the fault the record
       exists to prevent, one element later.

       **No component in this library replaces its control**, which is worth
       saying because the comment here used to name one. Every consumer
       resolves to a single fixed part rendered once. `target` is a callback and
       its contract permits a swap, so a controller in `core` is held to the
       contract rather than to the callers it happens to have today. */
    if (target !== this.recorded) {
      this.forwarded.clear()
      this.recorded = target
    }
    /* The states first, so a host `aria-label` is on the control before the
       labels below ask whether it has a name. */
    for (const attribute of this.label ? [...STATES, 'aria-label'] : STATES) {
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
    for (const [attribute, property] of RELATIONSHIPS) {
      if (!(property in target)) {
        // An engine without element reflection. Nothing to do, and nothing that
        // silently half works: assigning to a property it does not implement is
        // a no-op rather than an error, which is what the guard makes visible.
        continue
      }
      const ids = (this.host.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)
      const referenced = ids
        .map((id) => elementById(this.host, id))
        .filter((element): element is HTMLElement => element !== null)
      const elements =
        referenced.length === 0 && attribute === 'aria-labelledby'
          ? this.hostLabels(target)
          : referenced
      const reflect = target as unknown as Record<string, Element[] | null>
      if (elements.length > 0) {
        /* In the same write, so no listener order can leave the control with
           the host's names and without what follows them. */
        const after = attribute === 'aria-labelledby' ? (this.after?.() ?? []) : []
        const named: Element[] = elements
        reflect[property] = [...named, ...after.filter((one) => !named.includes(one))]
        this.forwarded.add(attribute)
        continue
      }
      /* Only if this controller is what put it there, which is the same rule
         the states above keep and for a worse reason. `MixinField` writes
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
  }

  hostConnected(): void {
    this.observer = new MutationObserver(() => this.forward())
    this.observer.observe(this.host, {
      attributeFilter: [
        ...RELATIONSHIPS.map(([attribute]) => attribute),
        ...STATES,
        ...(this.asked === false ? [] : ['aria-label']),
      ],
    })
    this.host.addEventListener('focusin', this.refresh)
  }

  hostDisconnected(): void {
    this.observer?.disconnect()
    this.observer = undefined
    this.host.removeEventListener('focusin', this.refresh)
  }

  /** Forwards again as focus arrives, for a label added since the last update. */
  private readonly refresh = (): void => {
    this.forward()
  }

  /* After the render that created the control, because there is nothing to
     forward to before it exists. Every update, not only the first: a component
     that re-renders its control produces a new element with none of this. */
  hostUpdated(): void {
    this.forward()
    if (this.unnamed !== undefined) {
      auditName(this.host, this.target, this.unnamed)
    }
  }
}
