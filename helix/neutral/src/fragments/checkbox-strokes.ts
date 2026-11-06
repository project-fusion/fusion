import { native } from '../style.js'
import { fragment } from '../table.js'

/**
 * How a phone draws Checkbox's tick and dash: the same paths the web masks,
 * stroked at the same weight in the mark's ink, filling the mark's box.
 * Checkbox's table takes it in after the mark's own rules.
 */
export default fragment(
  'checkbox-strokes',
  {
    parts: ['tick', 'dash-mark', 'tick-line', 'dash-line'],
    hooks: { markColor: null },
  },
  ({ hook, on, rule }) => [
    on(['tick', 'dash-mark'], [native([rule({ blockSize: '100%', inlineSize: '100%' })])]),
    on(
      ['tick-line', 'dash-line'],
      [
        native([
          rule({
            fill: 'none',
            stroke: hook.markColor,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2.5,
          }),
        ]),
      ],
    ),
  ],
)
