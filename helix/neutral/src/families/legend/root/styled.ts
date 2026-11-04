import printEconomy from '../../../fragments/print-economy.js'
import { oneOf } from '../../../render.js'
import { fn, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Legend's styled tier.
 *
 * **A wrapping row of names, each after a swatch of its series' color**, a
 * small rounded square, since a filled square is what a bar, an arc and a
 * line all have in common. `placement="start"` and `placement="end"` stack
 * the entries in a column, for a legend beside a chart, the swatch on the
 * side the chart is.
 *
 * **The swatches are drawn as the chart's marks are**: `emphasis`, or the
 * names `outlined` and `subtle` list, draws a swatch as an edge over a fill
 * faded toward the page or over a wash, and `material`, or the names `glass`
 * lists, thins it. A hidden series fades, and its swatch empties to an
 * outline in its own color.
 *
 * **Under `toggles` a name is a button that looks like the name it was**,
 * flush with the text, so turning it on does not move a legend already laid
 * out.
 *
 * **Web only:** the hover ink, printing, and forced colors.
 */
export default styles(
  root,
  {
    prefix: 'legend',
    hooks: {
      color: token('color-foreground-muted'),
      direction: 'row',
      entryGap: token('space-2xs'),
      fontSize: token('text-sm'),
      gap: token('space-sm'),
      hiddenOpacity: '0.56',
      swatchRadius: token('radii-sm'),
      swatchSize: token('space-sm'),
      swatchStroke: token('border-thick'),
    },
    own: { legendArea: null, legendShade: null, legendThrough: null },
    props: {
      emphasis: oneOf(['outlined', 'solid', 'subtle']),
      glass: '',
      material: oneOf(['frosted', 'glass']),
      outlined: '',
      placement: oneOf(['end', 'start']),
      subtle: '',
    },
    stylesheet: 'legend/root/legend-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const series = measured('chart-series')
    const through = own.legendThrough(1)
    /* The series' color at the share material lets through, toward nothing. */
    const edge = [
      hook.swatchStroke,
      'solid',
      fn('color-mix', ['in', 'oklab'], [series, product(through, '100%')], 'transparent'),
    ]
    return [
      on('host', [rule({ display: 'block' })]),
      on('list', [
        rule({
          web: { listStyle: 'none' },
          display: 'flex',
          flexDirection: hook.direction,
          flexWrap: 'wrap',
          gap: hook.gap,
          margin: token('space-none'),
          padding: token('space-none'),
        }),
      ]),
      on('entry', [
        rule({
          alignItems: 'center',
          color: hook.color,
          display: 'flex',
          fontSize: hook.fontSize,
          gap: hook.entryGap,
          lineHeight: token('leading-tight'),
        }),
      ]),
      /* Beside a chart, the entries stack. */
      on('list', [
        rule([{ placement: 'start' }, { placement: 'end' }], { flexDirection: 'column' }),
      ]),
      on('entry', [rule({ placement: 'end' }, { flexDirection: 'row-reverse', textAlign: 'end' })]),
      /* The mark, on the entry, from the series it carries. */
      on({ before: 'entry' }, [
        rule({
          blockSize: hook.swatchSize,
          borderRadius: hook.swatchRadius,
          content: '""',
          flex: [0, 0, 'auto'],
          inlineSize: hook.swatchSize,
          own: { legendShade: mix(series, 60, token('color-background')) },
        }),
        rule({
          backgroundColor: fn(
            'color-mix',
            ['in', 'oklab'],
            [series, product(product(own.legendArea(1), through), '100%')],
            'transparent',
          ),
        }),
        /* A phone mixes at fixed shares, a share a custom property computes
           being no color a phone can read, so material does not thin a
           phone's swatch. */
        native([rule({ backgroundColor: series })]),
      ]),
      /* A hidden series' swatch empties to an outline in its own color, which
         an entry's emphasis still draws over, as the web's more particular
         rule does. */
      on({ before: 'entry' }, [
        rule(
          { also: { 'entry-hidden': true } },
          {
            backgroundColor: 'transparent',
            border: [hook.swatchStroke, 'solid', series],
          },
        ),
      ]),
      on({ before: 'entry' }, [
        /* The edge, and the fill stays under it. */
        rule([{ 'data-emphasis': 'outlined' }, { 'data-emphasis': false, emphasis: 'outlined' }], {
          backgroundColor: fn(
            'color-mix',
            ['in', 'oklab'],
            [own.legendShade, product(through, '100%')],
            'transparent',
          ),
          border: edge,
        }),
        native([
          rule(
            [{ 'data-emphasis': 'outlined' }, { 'data-emphasis': false, emphasis: 'outlined' }],
            {
              backgroundColor: mix(series, 60, token('color-background')),
              border: [hook.swatchStroke, 'solid', series],
            },
          ),
        ]),
        /* A wash under the same edge. */
        rule([{ 'data-emphasis': 'subtle' }, { 'data-emphasis': false, emphasis: 'subtle' }], {
          border: edge,
          own: { legendArea: '0.2' },
        }),
        native([
          rule([{ 'data-emphasis': 'subtle' }, { 'data-emphasis': false, emphasis: 'subtle' }], {
            backgroundColor: mix(series, 20, 'transparent'),
            border: [hook.swatchStroke, 'solid', series],
          }),
        ]),
        /* Glass thins whatever emphasis drew. */
        rule([{ 'data-material': 'glass' }, { 'data-material': false, material: 'glass' }], {
          own: { legendThrough: product(0.62, token('material-opacity')) },
        }),
        rule(
          { 'data-material': false, material: 'frosted' },
          { own: { legendThrough: product(0.88, token('material-opacity')) } },
        ),
      ]),
      /* Under `toggles` a name is a button, and it looks like the name it was. */
      on('toggle', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
        }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        web([rule({ canHover: true, hover: true }, { color: token('color-foreground') })]),
      ]),
      /* A hidden series fades, and its swatch empties to an outline. */
      on('entry', [rule({ also: { 'entry-hidden': true } }, { opacity: hook.hiddenOpacity })]),
      include(printEconomy),
      on({ before: 'entry' }, [
        web([
          rule(
            { forcedColors: true },
            {
              forcedColorAdjust: 'none',
              outline: [token('border-thin'), 'solid', 'CanvasText'],
              outlineOffset: product(token('border-thin'), '-1'),
            },
          ),
        ]),
      ]),
    ]
  },
)
