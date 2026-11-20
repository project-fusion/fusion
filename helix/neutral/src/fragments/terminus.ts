import { difference, inherited, list, measured, product, token, web } from '../style.js'
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
 * **Web only:** the mark gliding with its line and fading, the triangle's clip, and
 * forced colors, where the mark keeps the color its line is drawn in.
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
    /* The privates the shared chart motion sheet sets from the public hooks. */
    const move = measured('_chart-move-duration', token('duration-normal'))
    const moveEasing = measured('_chart-move-easing', token('easing-decelerate'))
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
      ]),
      /* **The mark rides the end of its line** while the readings change: the
         line takes its new shape over `--chart-move-duration` along
         `--chart-move-easing`, and its last point travels straight from the
         old place to the new at the same pace, so the mark moving the same way
         stays on it. Only where the browser moves a path's shape at all, and
         not where the line jumped, with a reading more or fewer. A ring stays
         put: the hole cut for it in the drawing is a gradient that cannot
         travel with it, and a ring gliding off its hole shows the line through
         it. Every mark fades over the move, as a series a legend hides does. */
      on('terminus', [web([rule({ transition: list(['opacity', move, moveEasing]) })])]),
      on({ part: 'terminus', selector: '[part~="terminus"]:not([data-jumped])' }, [
        web([
          rule(
            { supports: '(d: path("M0 0"))' },
            {
              transition: list(
                ['inset-block-start', move, moveEasing],
                ['inset-inline-start', move, moveEasing],
                ['opacity', move, moveEasing],
              ),
            },
          ),
        ]),
      ]),
      on('terminus', [
        web([
          rule(
            { supports: '(d: path("M0 0"))', terminus: 'ring' },
            { transition: list(['opacity', move, moveEasing]) },
          ),
        ]),
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
