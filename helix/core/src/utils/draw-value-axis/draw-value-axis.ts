import { html, type TemplateResult } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
import { heldInside, levelsOf } from '../scale/levels.js'

/**
 * The numbers of a chart's value scale, beside its drawing: an `axis` part
 * holding a `tick` part at each level `ticks` picks, which are the levels
 * `gridlines` rules.
 *
 * HTML beside the plot, for the reason a chart's reading names are: text
 * inside an `<svg>` that fills its box scales with the box. Each tick is placed
 * with `inset-block-start`, as a percentage of the axis, so a stylesheet that
 * makes the axis as tall as the plot puts each number on its level.
 *
 * `width` builds the axis's style from the number of characters in its widest
 * number. The ticks are positioned absolutely and give the column no width of
 * their own, so each family writes its own custom property there, such as
 * `--line-chart-axis` in `ch`, and a stylesheet sizes the column from it.
 *
 * **A number that stays on a new scale is the same tick**, keyed by its value,
 * so a stylesheet moves it to its new level. Given `before`, the numbers that
 * scale had and this one does not stay too, as `tick-leaving` beside `tick`,
 * `hidden`, and at their place on the new scale held inside the plot, so a
 * stylesheet can fade them out as they move.
 *
 * @param domain The scale's lowest and highest values.
 * @param place Where a value sits down the plot, from 0 at the top to 100 at the bottom.
 * @param format How a value is written, such as a number in the chart's locale.
 * @param width The style the axis carries, from the number of characters in its widest number.
 * @param before The scale drawn before this one, which `ScaleMemory` holds.
 */
export const drawValueAxis = (
  domain: readonly [number, number],
  place: (value: number) => number,
  format: (value: number) => string,
  width: (widest: number) => string,
  before?: readonly [number, number],
): TemplateResult => {
  const levels = levelsOf(domain, before)
  const widest = Math.max(
    1,
    ...levels.filter((one) => !one.leaving).map((one) => format(one.level).length),
  )
  return html`<div aria-hidden="true" part="axis" style=${width(widest)}>
    ${repeat(
      levels,
      (one) => one.level,
      ({ leaving, level }) =>
        html`<span
          ?hidden=${leaving}
          part=${leaving ? 'tick tick-leaving' : 'tick'}
          style=${`inset-block-start: ${leaving ? heldInside(place(level)) : place(level)}%`}
          >${format(level)}</span
        >`,
    )}
  </div>`
}
