import { safeArea, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import stop from './headless.js'

/**
 * Tour Stop's styled tier, which writes
 * `helix/styled/src/tour/stop/tour-stop.generated.css`.
 *
 * **The panel is Popover's panel by another name**, on purpose: the raised
 * surface, a hairline edge, the floating shadow, and the house's small
 * radius, as wide as what it holds and never wider than 22rem. It grows
 * rather than scrolls. A dialog stop stands in the middle of the window,
 * and a floating stop in the corner at the end of its bottom edge, clear of
 * the window's edges by the step a toast keeps, and of the home indicator
 * on a phone.
 *
 * **The point is Tooltip's point**, 0.5rem before it turns, half outside
 * the panel on the edge facing the target, drawing the panel's edge on its
 * two outer sides, which are physical, as a placement is. A dialog and a
 * floating stop point at nothing. The controls trail, with Skip pushed away
 * from the other two, and the place in the run is drawn quieter, in figures
 * of one width.
 */
export default styles(
  stop,
  {
    prefix: 'tour',
    hooks: ['arrow-size', 'border-width', 'bubble-size', 'padding', 'shadow', 'surface-color'],
    stylesheet: 'tour/stop/tour-stop.generated.css',
  },
  ({ hook, on, rule }) => {
    const fill = hook.surfaceColor(token('color-surface-raised'))
    const edge = [token('border-thin'), 'solid', token('color-border')] as const
    const muted = token('color-foreground-muted')
    return [
      on('host', [rule({ display: 'contents' })]),
      on('surface', [
        rule({
          backgroundColor: fill,
          border: [hook.borderWidth(token('border-thin')), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxShadow: hook.shadow(token('shadow-floating')),
          boxSizing: 'border-box',
          color: token('color-foreground'),
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-md'),
          inlineSize: web('max-content'),
          margin: token('space-none'),
          maxInlineSize: hook.bubbleSize('22rem'),
          overflow: 'visible',
          padding: hook.padding(token('space-md')),
          position: web('fixed'),
        }),
        /* No ring on the panel, which takes focus only so a reader lands on the stop. */
        rule({ outline: 'none' }),
        rule({ type: 'dialog' }, { margin: 'auto' }),
        rule(
          { type: 'floating' },
          {
            inset: web('auto'),
            insetBlockEnd: web(token('space-lg')),
            insetInlineEnd: web(token('space-lg')),
          },
        ),
        /* A phone stands a floating panel along the window's bottom edge, at its end. */
        rule(
          { platform: 'native', type: 'floating' },
          {
            alignSelf: 'flex-end',
            marginBlockEnd: sum(token('space-lg'), safeArea('bottom')),
            marginInlineEnd: token('space-lg'),
          },
        ),
      ]),
      /* A panel that is not shown draws nothing, which the rules above outrank. */
      on({ part: 'surface', selector: ':host [part="surface"][hidden]' }, [
        rule({ platform: 'web' }, { display: 'none' }),
      ]),
      /* The title, and the line under it, when they are passed in on their own. */
      on({ region: 'heading', slotted: '*' }, [
        rule({
          fontSize: token('text-md'),
          fontWeight: token('weight-semibold'),
          margin: token('space-none'),
        }),
      ]),
      on({ region: 'description', slotted: '*' }, [
        rule({ color: muted, fontSize: token('text-sm'), margin: token('space-none') }),
      ]),
      on('progress', [
        rule({ color: muted, fontSize: token('text-sm'), fontVariantNumeric: 'tabular-nums' }),
      ]),
      on('content', [rule({ display: 'flex', flexDirection: 'column', gap: token('space-xs') })]),
      on('actions', [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: token('space-xs'),
          justifyContent: 'flex-end',
        }),
      ]),
      on('skip', [rule({ marginInlineEnd: 'auto' })]),
      on('arrow', [
        rule({
          backgroundColor: fill,
          blockSize: hook.arrowSize('0.5rem'),
          inlineSize: hook.arrowSize('0.5rem'),
          position: 'absolute',
          rotate: '45deg',
        }),
        /* Physical sides, as a placement is, in either direction. */
        rule({ dir: 'ltr', state: 'placed-bottom' }, { borderInlineStart: edge }),
        rule({ dir: 'rtl', state: 'placed-bottom' }, { borderInlineEnd: edge }),
        rule({ state: 'placed-bottom' }, { borderBlockStart: edge }),
        rule({ dir: 'ltr', state: 'placed-top' }, { borderInlineEnd: edge }),
        rule({ dir: 'rtl', state: 'placed-top' }, { borderInlineStart: edge }),
        rule({ state: 'placed-top' }, { borderBlockEnd: edge }),
        rule({ dir: 'ltr', state: 'placed-right' }, { borderInlineStart: edge }),
        rule({ dir: 'rtl', state: 'placed-right' }, { borderInlineEnd: edge }),
        rule({ state: 'placed-right' }, { borderBlockEnd: edge }),
        rule({ dir: 'ltr', state: 'placed-left' }, { borderInlineEnd: edge }),
        rule({ dir: 'rtl', state: 'placed-left' }, { borderInlineStart: edge }),
        rule({ state: 'placed-left' }, { borderBlockStart: edge }),
        /* A dialog and a floating stop point at nothing. */
        rule({ type: ['dialog', 'floating', 'wait'] }, { display: 'none' }),
      ]),
    ]
  },
)
