import { CollapseController, customElement, HelixElement, hostAria } from '@helix-io/core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property, queryAssignedElements, state } from 'lit/decorators.js'

/** How many crumbs stay at the front when the trail collapses. */
const KEEP_LEADING = 1

/**
 * @summary Shows the path to the current page.
 *
 * @description
 * The host is the landmark, so `aria-label` on it names the trail directly and
 * there is no property mirroring one. A page may hold more than one navigation,
 * and landmarks are how a screen-reader user chooses between them.
 *
 * `role="list"` is set explicitly on the `<ol>` even though it is already a
 * list: removing the markers with `list-style: none` strips list semantics in
 * Safari, and a breadcrumb trail always removes its markers.
 *
 * Items are slotted rather than wrapped, so they are `<ol>` children in the flat
 * tree and each carries `role="listitem"` itself.
 *
 * **`collapse` hides the middle, and only ever the middle.** A trail that does
 * not fit keeps its root and its current page, because those are the two a
 * reader is orienting by: the first says where the tree begins and the last says
 * where they are. Everything between them goes behind one trigger.
 *
 * **The server sends the whole trail, and the client only ever removes.** There
 * is no width to measure without a DOM, so nothing is hidden until
 * `CollapseController` has measured, and a reader with no JavaScript keeps every
 * crumb. That is the right answer rather than a fallback, and this arrangement
 * cannot leave them with less.
 *
 * **The overflow control is the consumer's, slotted in.** Rendering a menu here
 * would put `Menu`, and the popover machinery under it, into anything that
 * imports a breadcrumb trail, which is a lot to carry for a trail that usually
 * fits. So the trail hides crumbs and reports which, and whatever is slotted as
 * `overflow` decides how to show them. It appears only while something is
 * actually hidden.
 *
 * @since 0.1.0
 * @status experimental
 * @category navigation
 * @aliases Breadcrumb, Crumbs
 * @documentation https://helix.fusion.dev/components/breadcrumbs
 *
 * @slot - The trail's items, in order from root to current page.
 * @slot overflow - Shown when crumbs are hidden, usually a menu of them.
 *
 * @csspart list - The ordered list.
 * @csspart overflow - The box holding the overflow control.
 */
@customElement('helix-base-breadcrumbs')
export class HelixBaseBreadcrumbs extends HelixElement {
  /** Whether a trail that does not fit hides its middle. */
  @property({ reflect: true, type: Boolean })
  collapse = false

  /** The crumbs, in reading order. */
  @queryAssignedElements({ flatten: true })
  private crumbs!: HTMLElement[]

  /**
   * Which crumbs are hidden, by index.
   *
   * `@state`, because it is measured rather than declared: a consumer setting
   * it would be claiming a width the element can see for itself.
   *
   * Named `hiddenAt` and not `hidden`, which is `HTMLElement`'s own property:
   * shadowing it with an array made the element's own visibility a list of
   * numbers, and TypeScript caught it only because the base class declares it.
   */
  @state()
  private hiddenAt: readonly number[] = []

  private readonly fit = new CollapseController(this, {
    container: () => this.renderRoot?.querySelector<HTMLElement>('[part="list"]'),
    items: () => this.crumbs ?? [],
    trigger: () => this.renderRoot?.querySelector<HTMLElement>('[part="overflow"]'),
  })

  /**
   * The crumbs behind the trigger, in order, for whoever is showing them.
   *
   * Elements rather than data, so a consumer reads `href` and text off the same
   * objects they wrote. Handing over a copy would be a second version of the
   * trail to keep in step.
   */
  get overflowed(): readonly HTMLElement[] {
    return this.hiddenAt
      .map((index) => this.crumbs?.[index])
      .filter((el): el is HTMLElement => !!el)
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    // On the host through internals, so the landmark is the element itself and
    // an author's `aria-label` names it without anything being copied inward.
    hostAria(this.internals, { role: 'navigation' })
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    /* Measured after the render that shows everything, which is what makes the
       arithmetic honest: widths are taken while nothing is hidden. */
    this.fit.measure()
    this.apply()
  }

  /**
   * Turns a count of what fits into a set of hidden indices.
   *
   * The first crumb and the last `fits` crumbs stay; the rest go. Written as
   * indices rather than by writing `hidden` onto the elements, because the
   * elements are the consumer's and this has to be able to give them back.
   */
  private apply(): void {
    const crumbs = this.crumbs ?? []
    const next: number[] = []

    if (this.collapse && Number.isFinite(this.fit.fits)) {
      const trailing = Math.max(1, Math.min(this.fit.fits, crumbs.length - KEEP_LEADING))
      for (let index = KEEP_LEADING; index < crumbs.length - trailing; index++) {
        next.push(index)
      }
    }

    /* Compared before it is written, or every measurement schedules the update
       that measures again. */
    const same =
      next.length === this.hiddenAt.length && next.every((value, at) => value === this.hiddenAt[at])
    if (!same) {
      this.hiddenAt = next
    }

    /* `hidden` on the consumer's own element, which is the one thing here that
       does write outward. There is no other way: the crumbs are light-DOM
       children and CSS in this shadow root cannot select the third of them. */
    crumbs.forEach((crumb, index) => {
      crumb.toggleAttribute('hidden', next.includes(index))
    })
  }

  /**
   * The crumbs arrived, so measure them now that they are real.
   *
   * The host renders and measures before its crumbs have upgraded, so every
   * width is zero and the arithmetic concludes that five crumbs fit in a
   * container half their size. Measured: `updated` ran once with
   * `widths: [0,0,0,0,0]`. `Tabs` carries the same paragraph for the same
   * reason, and its answer is this one, because a slot change is the moment
   * the children are real.
   *
   * No `requestUpdate` here. `measure` asks for one when the answer moves,
   * which is the only time an update is owed.
   */
  private readonly handleSlotChange = (): void => {
    this.fit.measure()
    this.apply()
  }

  protected override render(): TemplateResult {
    /* The trigger sits after the crumbs that were kept at the front, which is
       where the gap it stands for actually is. */
    return html`<ol part="list" role="list">
      <slot @slotchange=${this.handleSlotChange}></slot>
      <li part="overflow" ?hidden=${this.hiddenAt.length === 0}>
        <slot name="overflow"></slot>
      </li>
    </ol>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-base-breadcrumbs': HelixBaseBreadcrumbs
  }
}
