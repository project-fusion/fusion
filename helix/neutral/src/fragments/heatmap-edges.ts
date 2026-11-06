import { product, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * What Heatmap draws at its edges: the words in the strip's place while there
 * is nothing to draw, the error in the danger ink, a hairline that keeps the
 * cells countable on paper, and the tones kept in forced colors, bound by a
 * hairline, with the reading and a selection in Highlight. Heatmap's table
 * takes it in where it stands in its cascade.
 */
export default fragment(
  'heatmap-edges',
  { parts: ['cell', 'empty', 'error', 'loading'] },
  ({ on, rule }) => {
    const inside = product(token('border-thin'), '-1')
    return [
      /* Under the strip, in place of the cells. */
      on(
        ['empty', 'error', 'loading'],
        [
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            margin: token('space-none'),
            textAlign: 'center',
          }),
          web([rule({ display: 'grid', gridArea: '1 / 1', placeContent: 'center' })]),
        ],
      ),
      /* The readings did not load: news to act on, in the danger ink. */
      on('error', [rule({ color: token('color-danger') })]),
      /* Printed, a hairline makes the cells countable whatever the fills come out like. */
      on('cell', [
        web([
          rule(
            { print: true },
            {
              outline: [token('border-thin'), 'solid', token('color-border')],
              outlineOffset: inside,
            },
          ),
        ]),
      ]),
      /* Forced colors keep the tones, bound by a hairline, the reading and a selection in Highlight. */
      on('cell', [
        web([
          rule(
            { forcedColors: true },
            {
              forcedColorAdjust: 'none',
              outline: [token('border-thin'), 'solid', 'CanvasText'],
              outlineOffset: inside,
            },
          ),
          rule(
            { forcedColors: true, also: { 'cell-active': true } },
            {
              outline: [token('border-thick'), 'solid', 'Highlight'],
              outlineOffset: token('border-thin'),
            },
          ),
          rule(
            { forcedColors: true, also: { 'cell-selected': true } },
            { boxShadow: ['inset', 0, 0, 0, token('border-thick'), 'Highlight'] },
          ),
        ]),
      ]),
    ]
  },
)
