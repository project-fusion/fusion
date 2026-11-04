import { difference, inherited, measured, product, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * The mark on the last reading of a line, which `Sparkline` and `LineChart`
 * draw as the same mark on the same kind of thing: a dot centered on the
 * reading, placed at the percentages of the box its tree sets in
 * `--chart-terminus-x` and `--chart-terminus-y`, and sized by the page's
 * `--chart-terminus-size`.
 *
 * **Four shapes, and each family that takes it in names all four.** `none`
 * lets the line stop on its own, `square` keeps its corners, `ring` lets the
 * ground through, and `triangle` points along the axis, "and onward", turned
 * on a right-to-left page.
 *
 * **A ring sets the radius it leaves open**, `--_chart-terminus-inner`, for
 * the drawing to cut its disc out of the line, which the family that owns the
 * drawing does on the web. Never a surface color in the hole, which on a
 * purple card hid the stroke and left a disc of the page.
 *
 * **Web only:** the triangle's clip, and forced colors, where the mark keeps
 * the color its line is drawn in.
 */
export default fragment(
  'terminus',
  {
    parts: ['terminus'],
    own: { chartTerminusInner: null },
    props: ['terminus'],
  },
  ({ on, rule }) => {
    const size = inherited('chart-terminus-size', '5px')
    return [
      on('terminus', [
        rule({
          backgroundColor: 'currentColor',
          blockSize: size,
          inlineSize: size,
          insetBlockStart: measured('chart-terminus-y'),
          insetInlineStart: measured('chart-terminus-x'),
          position: 'absolute',
          translate: ['-50%', '-50%'],
        }),
        rule({ dir: 'rtl' }, { translate: ['50%', '-50%'] }),
        rule({ borderRadius: token('radii-full') }),
        rule({ terminus: 'none' }, { display: 'none' }),
        rule({ terminus: 'square' }, { borderRadius: token('radii-none') }),
        rule(
          { terminus: 'ring' },
          {
            backgroundColor: inherited('chart-terminus-hole', 'transparent'),
            blockSize: product(size, 1.6),
            border: [token('border-thick'), 'solid', 'currentColor'],
            inlineSize: product(size, 1.6),
          },
        ),
      ]),
      on('host', [
        rule(
          { terminus: 'ring' },
          { own: { chartTerminusInner: difference(product(size, 0.8), token('border-thick')) } },
        ),
      ]),
      on('terminus', [
        rule(
          { terminus: 'triangle' },
          {
            backgroundColor: 'currentColor',
            borderRadius: token('radii-none'),
            clipPath: web('polygon(0% 0%, 100% 50%, 0% 100%)'),
          },
        ),
        web([
          rule(
            { dir: 'rtl', terminus: 'triangle' },
            { clipPath: 'polygon(100% 0%, 0% 50%, 100% 100%)' },
          ),
          rule({ forcedColors: true }, { forcedColorAdjust: 'none' }),
        ]),
      ]),
    ]
  },
)
