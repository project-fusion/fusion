import {
  customElement,
  fillTemplate,
  HelixElement,
  hostAria,
  whenHydrated,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * The largest `max` a stylesheet folds a server's markup at.
 *
 * The rule is `:host([max="N"]) ::slotted(:nth-child(n + N+1))`, one selector
 * per value, because `An+B` takes a literal and no custom property can be read
 * into it. So the range a stylesheet covers is finite. The group folds any
 * `max` itself once it runs, with the platform's `hidden`; past this one, a
 * server's markup shows every avatar until the page hydrates.
 */
export const FOLDS_UP_TO = 12

/**
 * @summary Overlapping avatars, with a count for the ones not shown.
 *
 * @description
 * A part of `Avatar` that arranges avatars.
 *
 * The group computes the overflow count from `max` and renders the "+3" itself.
 * There is no slot for it, because the number has to match which avatars are
 * hidden.
 *
 * Avatars past `max` stay in the DOM and are hidden. The group writes `hidden`
 * on each of them, so they are hidden on the headless tier as well, and at any
 * `max`. The count is read out as `overflow-label`, such as "3 more: Grace
 * Hopper, Alan Turing, Barbara Liskov", so a screen reader hears who is there
 * past the ones it can reach.
 *
 * @since 0.1.0
 * @status stable
 * @aliases Avatar stack, Facepile
 * @documentation https://fusion.dev/helix/components/avatar
 *
 * @slot - The avatars, in the order they should be read.
 *
 * @csspart overflow - The count of avatars past `max`, an image named by `overflow-label`.
 */
@customElement('helix-headless-avatar-group')
export class HelixHeadlessAvatarGroup extends HelixElement {
  /**
   * Accessible name for the set, such as "Reviewers".
   */
  @property()
  label = ''

  /**
   * How many avatars are shown before the rest become a count.
   *
   * Unset shows all of them, which is what no limit means and is more useful
   * than refusing to render.
   *
   * **Reflected, because the fold is a stylesheet rule and nothing else.** A
   * sheet hides past the limit one selector per value, as `FOLDS_UP_TO`
   * describes, so the attribute *is* the mechanism: a `max` that reaches this
   * property and never reaches the host matches no rule, and every avatar is
   * drawn beside a count claiming some are hidden. Markup is the safe path and
   * hides the fault; a script is the broken one, and React takes it for
   * everyone, assigning a matching property rather than an attribute.
   *
   * **Optional rather than defaulted, per the rule that a reflected property
   * takes no default**: `max = 0` would stamp `max="0"` onto every host that
   * never asked for a limit, including on the server.
   */
  @property({ reflect: true, type: Number })
  max?: number

  /**
   * What a screen reader is told the count is, with `{count}` for the number
   * and `{names}` for the people it stands for, by each avatar's `name`.
   *
   * The count shows "+3", which reads as "plus three" and says nothing about
   * what was counted, nor who.
   */
  @property({ attribute: 'overflow-label' })
  overflowLabel = '{count} more: {names}'

  /** The avatars this group hid, so it unhides only those. */
  private readonly folded = new WeakSet<HTMLElement>()

  /** The avatars, in light-DOM order. Empty on the server, which has no tree. */
  get avatars(): HTMLElement[] {
    /* What a render may know, since `overflow` reads this in `render`: none on
       a server, whose shim has no tree, nor while hydrating what one sent. */
    return this.knownChildren.filter((child): child is HTMLElement => child instanceof HTMLElement)
  }

  /**
   * How many avatars are past the limit, and so not shown.
   *
   * Not `hidden`, which is `HTMLElement`'s own boolean: a getter of that name
   * returning a number is a type error, and had it been assignable it would
   * have been worse, because a group with three extra members would have set
   * the attribute that hides the whole group.
   */
  get overflow(): number {
    const limit = this.max ?? 0
    return limit > 0 ? Math.max(this.avatars.length - limit, 0) : 0
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    hostAria(this.internals, { label: this.label, role: 'group' })
  }

  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    this.fold()
  }

  /**
   * Hides the avatars past `max`, with the platform's own `hidden`.
   *
   * **State in markup, so the headless tier folds too.** The fold was a styled
   * rule alone, and on the headless tier every avatar was drawn beside a "+3".
   * The styled rule stays, because it is what folds a server's markup before
   * this runs, up to `FOLDS_UP_TO`, and this folds at any `max`. Written
   * through `whenHydrated`, so an avatar's hydrating render is the server's,
   * and undone only on the avatars this group hid.
   */
  private fold(): void {
    const limit = this.max ?? 0
    for (const [index, avatar] of this.avatars.entries()) {
      const past = limit > 0 && index >= limit
      if (past && !avatar.hidden) {
        this.folded.add(avatar)
        whenHydrated(avatar, () => {
          avatar.hidden = true
        })
      } else if (!past && this.folded.has(avatar)) {
        this.folded.delete(avatar)
        whenHydrated(avatar, () => {
          avatar.hidden = false
        })
      }
    }
  }

  /**
   * The names of the people past `max`, by each avatar's `name`, then its
   * `aria-label`, in the order they are read.
   */
  private foldedNames(): string[] {
    const limit = this.max ?? 0
    return this.avatars
      .slice(limit)
      .map(
        (avatar) =>
          (avatar as HTMLElement & { name?: string }).name ||
          avatar.getAttribute('aria-label') ||
          '',
      )
      .filter(Boolean)
  }

  protected override render(): TemplateResult {
    const past = this.overflow
    /* An image named by the label, and not hidden: the people past `max` are
       out of the accessibility tree, and the count is the only thing that
       says they exist. */
    return html`<slot @slotchange=${() => this.requestUpdate()}></slot>
      ${
        past > 0
          ? html`<span
              part="overflow"
              role="img"
              aria-label=${fillTemplate(this.overflowLabel, {
                count: String(past),
                names: this.foldedNames().join(', '),
              }).replace(/[\s:,]+$/, '')}
              >+${past}</span
            >`
          : ''
      }`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-avatar-group': HelixHeadlessAvatarGroup
  }
}
