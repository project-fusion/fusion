import chartStatus from '../../../fragments/chart-status.js'
import chartTooltip from '../../../fragments/chart-tooltip.js'
import printExact from '../../../fragments/print-exact.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Donut Chart's styled tier.
 *
 * **The slices take the series palette in order**, so a legend beside the
 * chart uses the same twenty-four colors, over a track in the sunken surface,
 * so a gap shows as part of the ring. The slice a pointer, a finger, or a key
 * rests on is drawn thicker, and filled in under `outlined`.
 *
 * **The ring and its middle share one box**, so what is passed in sits in the
 * hole without either knowing the other's size: the middle is as wide as the
 * hole, `80 - 2 * thickness` percent of the ring, and on a half ring as tall
 * as the half disc it opens.
 *
 * **`emphasis`** draws the slices as a wash of their colors (`subtle`), or
 * faded toward the track with an edge in their own color (`outlined`).
 * **`material`** lets the page read through them.
 *
 * **Web only:** the ring's turn to twelve, which a phone's arcs are drawn in
 * already, its sweep on arrival and its eased changes, the sizes in the hole's
 * own units, the crosshair, and printing.
 */
export default styles(
  root,
  {
    prefix: 'donut-chart',
    hooks: {
      edgeStroke: '3',
      size: '16em',
      sliceLabelBackgroundColor: token('color-surface'),
      sliceLabelColor: token('color-foreground'),
      sliceLabelFontSize: token('text-xs'),
      trackColor: token('color-surface-sunken'),
    },
    own: { donutChartRing: null },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      material: oneOf(['frosted', 'glass']),
    },
    stylesheet: 'donut-chart/root/donut-chart-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const stroke = measured('donut-chart-stroke')
    const settled = measured('donut-chart-stroke', 16)
    const series = measured('chart-series')
    return [
      include(chartStatus),
      include(chartTooltip),
      /* The ring and its middle share one grid cell. */
      on('host', [
        rule({
          display: 'grid',
          inlineSize: hook.size,
          placeItems: 'center',
          position: 'relative',
        }),
      ]),
      on('plot', [rule({ gridArea: '1 / 1' })]),
      /* The tooltip's containing block. */
      on('plot', [rule({ inlineSize: '100%', position: 'relative' })]),
      /* With nothing to draw, the plot keeps the ring's box. */
      on({ part: 'plot', selector: '[part="plot"]:not(:has(svg))' }, [
        web([rule({ aspectRatio: 1 })]),
      ]),
      on({ part: 'plot', selector: ':host([sweep="half"]) [part="plot"]:not(:has(svg))' }, [
        web([rule({ aspectRatio: 2 })]),
      ]),
      /* A phone's plot holds the ring's box always, which the ring fills. */
      on('plot', [native([rule({ aspectRatio: measured('donut-chart-aspect') })])]),
      on('ring', [native([rule({ inset: 0, position: 'absolute' })])]),
      on({ part: 'plot', inner: 'svg' }, [
        web([rule({ aspectRatio: 1, display: 'block', inlineSize: '100%' })]),
      ]),
      /* Zero at twelve o'clock. */
      on(
        ['track', 'segment'],
        [
          web([
            rule({
              transform: 'rotate(-90deg)',
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }),
          ]),
        ],
      ),
      on('track', [rule({ stroke: hook.trackColor })]),
      /* A phone strokes its arcs as the web's circles are, as thick as the band. */
      on('track', [native([rule({ fill: 'none', strokeWidth: stroke })])]),
      on('segment', [rule({ strokeLinecap: 'butt', strokeWidth: stroke })]),
      on('segment', [native([rule({ fill: 'none' })])]),
      on({ part: 'center', inner: 'slot' }, [
        web([rule({ '--stat-value-size': '24cqi', fontSize: '13cqi' })]),
      ]),
      /* A phone has no container units, so the same share of the hole is
         written against the ring's size: the hole is `80 - 2 * thickness`
         hundredths of it. A Stat's value stands at the web's proportion to the
         words, 24 to 13, against the size it inherits. */
      on('center', [
        native([
          rule({
            '--stat-value-size': '1.846em',
            fontSize: product(
              product(hook.size, quotient(difference(80, product(2, settled)), 100)),
              0.13,
            ),
          }),
          rule(
            { sweep: 'half' },
            {
              fontSize: product(
                product(hook.size, quotient(difference(80, product(2, settled)), 100)),
                0.065,
              ),
            },
          ),
        ]),
      ]),
      on('center', [
        rule({
          web: {
            containerType: 'inline-size',
            display: 'grid',
            insetBlockStart: '50%',
            insetInlineStart: '50%',
            placeItems: 'center',
            translate: ['-50%', '-50%'],
          },
          boxSizing: 'border-box',
          inlineSize: quotient(
            product('100%', difference(own.donutChartRing, product(2, settled))),
            100,
          ),
          own: { donutChartRing: '80' },
          pointerEvents: 'none',
          position: 'absolute',
          textAlign: 'center',
        }),
        /* Centered in the plot: a column the hole's width, its content in the middle. */
        native([
          rule({
            alignItems: 'center',
            insetBlock: 0,
            /* A hole `80 - 2 * thickness` hundredths wide stands `10 + thickness` in. */
            insetInlineStart: product(sum(10, settled), '1%'),
            justifyContent: 'center',
          }),
        ]),
      ]),
      on('segment', [rule({ stroke: series })]),
      /* The slice under the pointer, thickened rather than recolored. */
      on('segment', [rule({ 'data-active': true }, { strokeWidth: product(stroke, 1.18) })]),
      /* A chart never animates through a value it does not have. */
      on('segment', [
        web([
          rule({
            transition: list(
              ['r', token('duration-normal'), token('easing-decelerate')],
              ['stroke', token('duration-fast'), token('easing-decelerate')],
              ['stroke-dasharray', token('duration-normal'), token('easing-decelerate')],
              ['stroke-dashoffset', token('duration-normal'), token('easing-decelerate')],
              ['stroke-width', token('duration-fast'), token('easing-decelerate')],
            ),
          }),
          rule({ startingStyle: true }, { strokeDasharray: [0, 9999] }),
        ]),
      ]),
      on('track', [
        web([rule({ transition: ['r', token('duration-normal'), token('easing-decelerate')] })]),
      ]),
      on('segment', [rule({ web: { cursor: 'crosshair' } })]),
      /* A half circle, opening downward, from nine o'clock. */
      on({ part: 'plot', inner: 'svg' }, [
        web([rule({ sweep: 'half' }, { aspectRatio: [100, '/', sum(40, quotient(settled, 2))] })]),
      ]),
      on(['track', 'segment'], [web([rule({ sweep: 'half' }, { transform: 'rotate(180deg)' })])]),
      /* The middle sits at the bottom, where the circle's center now is. */
      on('center', [
        rule(
          { sweep: 'half' },
          {
            web: { insetBlockEnd: 0, insetBlockStart: 'auto', translate: ['-50%', 0] },
            blockSize: quotient(
              product('100%', difference(40, settled)),
              sum(40, quotient(settled, 2)),
            ),
          },
        ),
        native([rule({ sweep: 'half' }, { insetBlockStart: 'auto' })]),
      ]),
      on({ part: 'center', inner: 'slot' }, [
        web([rule({ sweep: 'half' }, { '--stat-value-size': '12cqi', fontSize: '6.5cqi' })]),
      ]),
      on('center', [
        web([
          rule({ dir: 'rtl' }, { translate: ['50%', '-50%'] }),
          rule({ dir: 'rtl', sweep: 'half' }, { translate: ['50%', 0] }),
        ]),
      ]),
      include(printExact),
      on('segment', [rule({ emphasis: 'subtle' }, { stroke: mix(series, 30, hook.trackColor) })]),
      /* The boundary, drawn only when it is asked for. */
      on('segment-edge', [rule({ fill: 'none', stroke: 'none' })]),
      on('segment', [rule({ emphasis: 'outlined' }, { stroke: mix(series, 55, hook.trackColor) })]),
      /* Under `outlined` the slice under the pointer fills in instead of
         growing, written after the fade it overrides. */
      on('segment', [
        rule(
          { 'data-active': true, emphasis: 'outlined' },
          { stroke: series, strokeWidth: stroke },
        ),
      ]),
      on('segment-edge', [
        rule({ emphasis: 'outlined' }, { stroke: series, strokeWidth: hook.edgeStroke }),
        /* A phone strokes the wedge inset by a quarter of the stroke where the
           web clips it to itself, so half the declared width shows on both. */
        native([rule({ emphasis: 'outlined' }, { strokeWidth: quotient(hook.edgeStroke, 2) })]),
      ]),
      on('segment', [
        rule({ material: 'glass' }, { strokeOpacity: product(0.62, token('material-opacity')) }),
        rule({ material: 'frosted' }, { strokeOpacity: product(0.88, token('material-opacity')) }),
      ]),
      /* The summary is said and not shown. */
      on('summary', [
        web([
          rule({
            blockSize: '1px',
            clipPath: 'inset(50%)',
            inlineSize: '1px',
            margin: token('space-none'),
            overflow: 'hidden',
            position: 'absolute',
            whiteSpace: 'nowrap',
          }),
        ]),
      ]),
      /* Each slice's share, on a plate of the page's own surface. */
      on('slice-label', [
        rule({
          web: { fontVariantNumeric: 'tabular-nums' },
          backgroundColor: hook.sliceLabelBackgroundColor,
          borderRadius: token('radii-sm'),
          color: hook.sliceLabelColor,
          fontFamily: token('font-sans'),
          fontSize: hook.sliceLabelFontSize,
          lineHeight: 1.4,
          padding: [0, token('space-2xs')],
          pointerEvents: 'none',
          position: 'absolute',
          translate: ['-50%', '-50%'],
          whiteSpace: 'nowrap',
        }),
        native([rule({ left: measured('donut-chart-x'), top: measured('donut-chart-y') })]),
      ]),
      on('slice-label', [
        web([rule({ dir: 'rtl', sweep: 'half' }, { translate: ['50%', '-50%'] })]),
      ]),
    ]
  },
)
