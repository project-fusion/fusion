import { native, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * The words a chart shows in place of its drawing: `empty-text` when the table
 * has no readings and `loading-text` while they load, or what a page passed
 * into `empty` and `loading`, and `error-text` in the danger ink, wrapping
 * before what was passed into `error`, in the middle of the plot, which keeps the box
 * it has with a drawing so the page does not move when the readings arrive.
 *
 * **A phone's alone, for now.** The web sets the same words from the shared
 * `chart/status.css`, which the charts not yet written once also read, so a
 * family that takes this in keeps importing that sheet on the web.
 */
export default fragment(
  'chart-status',
  { parts: ['empty', 'error', 'loading'] },
  ({ on, rule }) => [
    on(
      ['empty', 'error', 'loading'],
      [
        native([
          rule({
            alignItems: 'center',
            color: token('color-foreground-muted'),
            display: 'flex',
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            inset: 0,
            justifyContent: 'center',
            margin: token('space-none'),
            position: 'absolute',
            textAlign: 'center',
          }),
        ]),
      ],
    ),
    on('error', [
      native([
        rule({
          color: token('color-danger'),
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: token('space-xs'),
        }),
      ]),
    ]),
  ],
)
