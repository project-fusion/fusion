import {
  customElement,
  HelixElement,
  hostAria,
  reportRuntime,
  slottedWords,
} from '@fusion.dev/helix-core'
import { html, type PropertyValues, type TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

/**
 * @summary One measurement, with a label that names what it measures.
 *
 * @description
 * The label comes first in the markup and the value after it, so a screen
 * reader reads what the figure counts before the number. Visually, the number
 * stands out either way.
 *
 * Both are bare slots. An element that assigned itself a slot on connect would
 * add an attribute after upgrade, which markup rendered on the server by React
 * does not have.
 *
 * **A stat with a label is a group named by it**, so a reader moving through a
 * dashboard hears "Revenue, group" and then the figure, its unit and its
 * trend as one reading, rather than a run of loose words. The role and the name
 * are set through `ElementInternals` once the label is known, which writes no
 * attribute; a stat with no label has no role. Put a `Trend` in the `trend`
 * slot to have it read inside the group, after the figure it qualifies.
 *
 * @since 0.1.0
 * @status stable
 * @category data
 * @aliases Metric, KPI, Figure
 * @documentation https://fusion.dev/helix/components/stat
 *
 * @slot - The value.
 * @slot label - What the value measures, which also names the stat for a screen reader.
 * @slot trend - How the value moved, usually a `Trend`, read after the value inside the stat's group.
 * @slot unit - The unit, shown beside the value.
 *
 * @csspart value - The slot the value is written in. A slot draws no box, so it takes the inherited properties, such as color and font, and passes them to the value.
 */
@customElement('helix-headless-stat')
export class HelixHeadlessStat extends HelixElement {
  /**
   * Which way the label and the value are arranged.
   *
   * Absent is a column, the label over the number, which is how a figure is read
   * on a dashboard: the words say what is coming and the number answers.
   * `column-reverse` puts the number first, which is right where the number is
   * the headline and the label is a caption under it.
   *
   * The row directions set them side by side, for a figure in a line of text or
   * a narrow strip where a stacked pair would be two lines of almost nothing.
   *
   * A property rather than a `Flex` around it, because the unit has to stay on
   * the value's baseline whichever way the pair goes, and only this element
   * knows which of its children the unit belongs to.
   *
   * The name and the values are `Flex`'s, which lays out the same way. Which
   * way a number moved is `Trend`'s `movement`. On a Stat, `up`, `down` and
   * `neutral` are not layouts, and the pair stays the column.
   *
   * **Optional rather than defaulted to `column`, which is not a style
   * preference.** A reflecting property with a default writes its attribute onto
   * the host the moment the element upgrades, and the host is markup the
   * consumer rendered: React compares what it rendered against what is there and
   * reports a hydration mismatch. The absent attribute is the column, which the
   * stylesheet reads as the base case, and the server spec asserts the host
   * carries nothing nobody wrote.
   */
  @property({ reflect: true })
  direction?: 'column-reverse' | 'row' | 'row-reverse'

  /* Named by what is slotted as the label: by reference where the engine
     reflects elements, so an edit to the label's text renames the group, and
     by the label's words where it does not. Nothing on a server, which has no
     children to name it with. */
  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed)
    const labels = this.knownChildren.filter((child) => child.slot === 'label')
    hostAria(this.internals, {
      label:
        labels.length > 0 && !('ariaLabelledByElements' in this.internals)
          ? slottedWords(this, ['label'])
          : '',
      labelledBy: labels,
      role: labels.length > 0 ? 'group' : '',
    })
  }

  /* A hydrated label slot was filled before its listener was bound and sends
     no change, so the name is read once more after hydrating. */
  protected override firstUpdated(changed: PropertyValues): void {
    super.firstUpdated(changed)
    this.finishHydration()
  }

  /* Said once for the mix-up the description warns about. A server runs no
     `updated`, so nothing is said there. */
  protected override updated(changed: PropertyValues): void {
    super.updated(changed)
    const given = this.direction as string | undefined
    if (changed.has('direction') && (given === 'up' || given === 'down' || given === 'neutral')) {
      reportRuntime({
        kind: 'misread-direction',
        message:
          `<${this.localName} direction="${given}"> lays out as the column: \`${given}\` is a ` +
          "`movement` of Trend's, which says which way a number moved. Put it on the " +
          "`helix-trend` in the stat's `trend` slot.",
        tag: this.localName,
      })
    }
  }

  protected override render(): TemplateResult {
    /* The label's slot asks for the update that names the group, since a
       label arriving later changes no property. */
    return html`<slot name="label" @slotchange=${() => this.requestUpdate()}></slot>
      <slot part="value"></slot>
      <slot name="unit"></slot>
      <slot name="trend"></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'helix-headless-stat': HelixHeadlessStat
  }
}
