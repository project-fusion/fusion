import { html, type TemplateResult } from 'lit'
import { ticks } from '../scale/ticks.js'

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
 * `width` names the custom property the widest number is written to, in `ch`:
 * the ticks are positioned absolutely and give the column no width of their
 * own, so a stylesheet sizes the column from it.
 *
 * @param domain The scale's lowest and highest values.
 * @param place Where a value sits down the plot, from 0 at the top to 100 at the bottom.
 * @param format How a value is written, such as a number in the chart's locale.
 * @param width The custom property the column's width is written to.
 */
export const drawValueAxis = (
  domain: readonly [number, number],
  place: (value: number) => number,
  format: (value: number) => string,
  width: string,
): TemplateResult => {
  const levels = ticks(domain)
  const widest = Math.max(1, ...levels.map((level) => format(level).length))
  return html`<div aria-hidden="true" part="axis" style=${`${width}: ${widest}ch`}>
    ${levels.map(
      (level) =>
        html`<span part="tick" style=${`inset-block-start: ${place(level)}%`}>${format(level)}</span>`,
    )}
  </div>`
}
