import { mix, product, quotient, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Code's styled tier.
 *
 * **A step down from the words around it**, since a monospace face reads
 * larger than the prose it sits in, as a ratio of the sizes so a fragment in
 * a heading stays a heading's size.
 *
 * **A phone draws the wash and the words, and no corners or padding.** A
 * `Text` nested in other words takes a background color, and iOS and Android
 * give it no padding and no radius, so the run is a flat wash the width of
 * its words. A fragment longer than the line wraps with the words around it,
 * each line washed, which `box-decoration-break: clone` asks of the web.
 */
export default styles(
  root,
  {
    prefix: 'code',
    hooks: {
      backgroundColor: token('color-well'),
      fontFamily: token('font-mono'),
      foregroundColor: mix(token('color-foreground'), 30, token('color-foreground-muted')),
      padding: product(token('space-2xs'), 0.5),
      radius: token('radii-sm'),
      size: product(quotient(token('text-sm'), token('text-md')), '1em'),
    },
    stylesheet: 'code/root/code-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'inline' })]),
    on('code', [
      rule({
        /* The well, which composites the same on either scheme: `surface-raised`
           is absolute lightness and stepped 1.09 against the page in light,
           1.48 in dark. */
        backgroundColor: hook.backgroundColor,
        borderRadius: hook.radius,
        /* A fragment longer than the line, a path or an identifier, breaks
           inside itself where it would run out of the text, and each piece
           keeps the wash and the padding. */
        web: {
          WebkitBoxDecorationBreak: 'clone',
          boxDecorationBreak: 'clone',
          overflowWrap: 'break-word',
        },
        /* Never a syntax color: a colored word in running text reads as a
           link. `foreground-muted` alone is too far back at 5.27 light and
           7.42 dark where the prose runs at 21; mixed 30% it measures 9.98 and
           10.20. */
        color: hook.foregroundColor,
        fontFamily: hook.fontFamily,
        /* A ratio, not a rung: a fixed 13px inside a 32px heading is 0.41 of
           it and sits on the line like a footnote. `sm` over `md` leaves body
           text unchanged to the pixel. */
        fontSize: hook.size,
        paddingBlock: token('space-none'),
        /* Half a step: `2xs` is 4px against a word space of 3.5px, so
           `(code)` renders as `( code )`. A margin would add the same space
           beside a comma. */
        paddingInline: hook.padding,
      }),
      /* The wash is ink a printer may leave out. */
      rule({ print: true }, { backgroundColor: 'transparent' }),
    ]),
  ],
)
