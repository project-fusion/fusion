import { fn, mix, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * A `ghost` Select at rest, which reads as a column of words: at the size of the
 * text around it, as a ghost text field is, with round dots under its value in
 * the color of Select's `ghost-underline` hook, and its mark only under the
 * pointer or with focus. A touch screen keeps the size iOS will not zoom, and
 * draws the dots in the subtle foreground while the hook is unset. The value
 * lines up as the `ghost-align` hook says.
 *
 * Written out, and the web's: the rules read the host's attribute and its
 * interactions together. A phone draws no ghost dots.
 */
export default fragment(
  'select-ghost',
  {
    parts: ['indicator', 'trigger', 'value'],
    hooks: { ghostAlign: null, ghostUnderline: null },
    own: { selectGhostDots: null },
  },
  ({ hook, on, own, rule }) => [
    on({ part: 'trigger', selector: ':host([emphasis="ghost"]) [part="trigger"]' }, [
      web([
        rule({ fontSize: token('text-control'), fontWeight: 'inherit' }),
        rule(
          { coarsePointer: true },
          { fontSize: fn('max', token('text-field-min'), token('text-control')) },
        ),
      ]),
    ]),
    on({ part: 'value', selector: ':host([emphasis="ghost"]:not(:focus-within)) [part="value"]' }, [
      web([
        rule({
          backgroundImage: fn(
            'radial-gradient',
            'circle',
            [own.selectGhostDots('transparent'), '0.75px'],
            ['transparent', '1px'],
          ),
          backgroundPosition: [0, '100%'],
          backgroundRepeat: 'repeat-x',
          backgroundSize: ['4px', '2px'],
          flex: '0 1 auto',
        }),
      ]),
    ]),
    on(
      {
        part: 'trigger',
        selector: ':host([emphasis="ghost"]:not(:focus-within)) [part="trigger"]',
      },
      [web([rule({ justifyContent: hook.ghostAlign('start') })])],
    ),
    on('host', [
      web([
        rule({ own: { selectGhostDots: hook.ghostUnderline('transparent') } }),
        rule(
          { coarsePointer: true },
          {
            own: {
              selectGhostDots: hook.ghostUnderline(
                mix(token('color-foreground-subtle'), 60, 'transparent'),
              ),
            },
          },
        ),
      ]),
    ]),
    on(
      {
        part: 'indicator',
        selector: ':host([emphasis="ghost"]:not(:hover, :focus-within)) [part="indicator"]',
      },
      [web([rule({ visibility: 'hidden' })])],
    ),
  ],
)
