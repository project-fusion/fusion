import { customElement, HelixElement, hostAria, internalsOf } from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/** A stat, by what it offers a group: the step it needs and a way to set one. */
interface Stepping {
  showStep(step: number): void
  stepNeeded: number
}

/** The child as a stat that steps its figure, or nothing. */
function steps(child: Element): Stepping | undefined {
  return 'stepNeeded' in child && 'showStep' in child ? (child as unknown as Stepping) : undefined
}

/**
 * @summary A row of related measurements.
 *
 * @description
 * **A named group is a group**, so a screen reader announces the stats
 * together under its name, such as "Usage, group". Name it with `label`,
 * `aria-label` or `aria-labelledby`. An unnamed one has no role, since a group
 * with no name only adds "group" to what a reader says, as an unnamed Card
 * has none. The figures are read together and their order has no meaning, so
 * the group does not announce positions such as "1 of 4".
 *
 * @since 0.1.0
 * @status stable
 * @aliases Metrics, KPIs, Figures
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @slot - The stats.
 */
@customElement('helix-headless-stat-group')
export class HelixHeadlessStatGroup extends HelixElement {
  /**
   * Accessible name for the group, which makes it a group.
   *
   * Absent leaves the stats with no group around them, unless `aria-label` or
   * `aria-labelledby` names it.
   */
  @property()
  label = ''

  /**
   * Hears a name written on the element, which no property mirrors.
   *
   * Lit observes the attributes of its own properties only, and `ariaLabel`
   * and `ariaLabelledByElements` belong to the platform.
   */
  static override get observedAttributes(): string[] {
    // biome-ignore lint/complexity/noThisInStatic: super runs Lit's getter with the subclass as this, so a styled group keeps its own attributes, where the class name would read the base's
    return [...super.observedAttributes, 'aria-label', 'aria-labelledby']
  }

  /**
   * Called by the browser when an observed attribute changes. A name written
   * or taken off asks for an update, because it decides whether the stats are
   * a group.
   */
  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value)
    if (name === 'aria-label' || name === 'aria-labelledby') {
      this.requestUpdate()
    }
  }

  /* Through `ElementInternals`, so nothing is written onto the host. In
     `willUpdate`, which a server calls too. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const named =
      this.label.trim() !== '' ||
      Boolean(this.getAttribute?.('aria-label')?.trim()) ||
      Boolean(this.getAttribute?.('aria-labelledby')?.trim())
    hostAria(internalsOf(this), { label: this.label, role: named ? 'group' : '' })
  }

  /**
   * The step a stat's figure takes: its own outside columns, and in columns the
   * largest any stat in the group needs, so a row of figures shares one size.
   * The others are set at that step as it changes.
   *
   * **Only in columns**, where a stat is as wide as its column whatever its
   * figure. Stats that flow take the width of their figures, so a stat set a
   * step down shrank and then needed the step it was given, and the group never
   * stepped back up.
   */
  stepFor(stat: Element): number {
    const own = steps(stat)?.stepNeeded ?? 0
    if (!this.hasAttribute('columns')) {
      return own
    }
    const stats = [...this.children].filter((child) => child !== stat && steps(child))
    const shared = Math.max(own, ...stats.map((one) => steps(one)?.stepNeeded ?? 0))
    for (const one of stats) {
      steps(one)?.showStep(shared)
    }
    return shared
  }

  /** Sets every stat at the step the group shares, once one comes or goes. */
  private readonly share = (): void => {
    const first = [...this.children].find((child) => steps(child) !== undefined)
    if (first) {
      steps(first)?.showStep(this.stepFor(first))
    }
  }

  protected override render(): TemplateResult {
    return html`<slot @slotchange=${this.share}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-stat-group': HelixHeadlessStatGroup
  }
}
