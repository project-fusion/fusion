import { measured, native, token, web } from '../style.js'
import { fragment } from '../table.js'
import visuallyHidden from './visually-hidden.js'

/**
 * What Spatial Heatmap draws round its relief: the readout, the overview,
 * the selection's count, and the table, said and not shown; the footer, its
 * first and last labels at the ends of the front edge, where they are
 * measured, and the summary between them; the words in the strip's place
 * while there is nothing to draw, the error in the danger ink; and a hairline
 * on every face in print. Its table takes it in where it stands in its
 * cascade.
 */
export default fragment(
  'spatial-heatmap-edges',
  {
    parts: [
      'base',
      'cell',
      'empty',
      'end',
      'error',
      'footer',
      'live',
      'loading',
      'overview',
      'selection',
      'start',
      'summary',
      'table',
    ],
  },
  ({ on, rule }) => [
    on(
      ['live', 'overview', 'selection', 'table'],
      [web([rule([visuallyHidden, { margin: token('space-none') }])])],
    ),
    /* The labels stand where they are measured; the summary keeps the footer's line. */
    on('footer', [
      rule({
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        paddingBlockStart: token('space-xs'),
        position: 'relative',
      }),
      web([rule({ display: 'grid', minBlockSize: '1lh' })]),
      /* A phone's footer is as wide as the strip and tall enough for the labels it places. */
      native([
        rule({
          minBlockSize: measured('spatial-heatmap-footer', 0),
          minInlineSize: measured('heatmap-strip-width'),
        }),
      ]),
    ]),
    on(
      ['start', 'end'],
      [web([rule({ insetBlockStart: 0 })]), rule({ position: 'absolute', whiteSpace: 'nowrap' })],
    ),
    on('start', [web([rule({ insetInlineStart: 0 })])]),
    on('end', [web([rule({ insetInlineEnd: 0 })])]),
    on(
      ['start', 'end'],
      [
        web([
          rule(
            { part: { 'data-placed': true } },
            {
              insetBlockStart: measured('spatial-heatmap-label-y'),
              insetInlineEnd: 'auto',
              insetInlineStart: measured('spatial-heatmap-label-x'),
            },
          ),
        ]),
        native([
          rule({
            left: measured('spatial-heatmap-label-x', 0),
            top: measured('spatial-heatmap-label-y', 0),
          }),
        ]),
      ],
    ),
    on('summary', [rule({ textAlign: 'center' })]),
    on('footer', [web([rule({ part: { 'data-empty': true } }, { display: 'none' })])]),
    /* With nothing to draw, the words stand across the box, in the middle of a plot's height. */
    on(
      ['empty', 'error', 'loading'],
      [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          margin: token('space-none'),
          minBlockSize: '12em',
          textAlign: 'center',
        }),
        web([
          rule({
            display: 'grid',
            gridArea: '1 / 1',
            gridAutoFlow: 'column',
            placeContent: 'center',
          }),
        ]),
        native([rule({ alignItems: 'center', justifyContent: 'center' })]),
      ],
    ),
    /* The readings did not load: news to act on, in the danger ink. */
    on('error', [rule({ color: token('color-danger') })]),
    /* Print: an edge on every face, so the prisms stay countable whatever the fills come out as. */
    on({ part: 'cell', inner: '> *' }, [
      web([
        rule({ print: true }, { stroke: token('color-border'), strokeWidth: token('border-thin') }),
      ]),
    ]),
    on({ part: 'base', inner: '> *' }, [
      web([
        rule({ print: true }, { stroke: token('color-border'), strokeWidth: token('border-thin') }),
      ]),
    ]),
  ],
)
