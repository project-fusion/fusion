import { difference, inherit, product, safeArea, scheme, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Toast's styled tier, which writes
 * `helix/styled/src/toast/root/toast-root.generated.css`.
 *
 * **The host draws nothing. The stack is the `region` layer**, a column along
 * the window's bottom edge, or its top edge under a `top-` placement, kept
 * `--toast-inset` from the edges, with the newest message nearest the edge,
 * at the start, the middle, or the end of the line as `placement` says. The
 * stack has no surface of its own and takes no touch between its messages,
 * so the page beside a message stays pressable. **Below a window of 30rem
 * each message takes the whole width of the stack.** A phone keeps the stack
 * clear of the home indicator and the status bar.
 *
 * **The messages are drawn in the scheme opposite the page's**, unless the
 * stack names its own mode with `data-color-mode`. The stack is not printed,
 * being an overlay.
 */
export default styles(
  root,
  {
    prefix: 'toast',
    hooks: ['gap', 'inset'],
    own: ['toast-enter', 'toast-gap', 'toast-inset', 'toast-most', 'toast-width'],
    stylesheet: 'toast/root/toast-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    return [
      on('host', [
        rule({ own: { inset: hook.inset(token('space-lg')) }, display: 'contents' }),
        /* Which way the nearest edge is, which a message arrives from and leaves toward. */
        rule({ placement: false }, { own: { enter: token('space-lg') } }),
        rule(
          { placement: ['bottom-center', 'bottom-end', 'bottom-start'] },
          { own: { enter: token('space-lg') } },
        ),
        rule(
          { placement: ['top-center', 'top-end', 'top-start'] },
          { own: { enter: product(token('space-lg'), '-1') } },
        ),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* Fixed to the window and transparent to a pointer, with the browser's
         popover box undone, since the stack has no surface of its own. */
      on('region', [
        rule({
          own: { gap: hook.gap(token('space-xs')) },
          background: web('none'),
          blockSize: web('auto'),
          border: web('none'),
          color: web(inherit()),
          display: 'flex',
          flexDirection: 'column',
          inlineSize: web('auto'),
          inset: web('auto'),
          insetInline: web(own.inset),
          margin: web(token('space-none')),
          maxBlockSize: web('none'),
          maxInlineSize: web('none'),
          overflow: web('visible'),
          padding: web(token('space-none')),
          pointerEvents: web('none'),
          position: web('fixed'),
          zIndex: web(token('layer-toast')),
        }),
        rule({ placement: false }, { insetBlockEnd: web(own.inset) }),
        rule(
          { placement: ['bottom-center', 'bottom-end', 'bottom-start'] },
          { insetBlockEnd: web(own.inset) },
        ),
        rule(
          { placement: ['top-center', 'top-end', 'top-start'] },
          { insetBlockStart: web(own.inset) },
        ),
        rule(
          { placement: ['top-center', 'top-end', 'top-start'] },
          { flexDirection: 'column-reverse' },
        ),
        rule({ placement: false }, { alignItems: 'flex-end' }),
        rule({ placement: ['bottom-start', 'top-start'] }, { alignItems: 'flex-start' }),
        rule({ placement: ['bottom-end', 'top-end'] }, { alignItems: 'flex-end' }),
        rule({ placement: ['bottom-center', 'top-center'] }, { alignItems: 'center' }),
        /* A message is never wider than the window less a margin. */
        rule({ platform: 'web' }, { own: { most: difference('100vw', token('space-xl')) } }),
        /* Each message the whole width of the stack where the window is narrow. */
        rule({ window: { below: '30rem' } }, { own: { width: '100%' } }),
        /* A phone keeps the stack from the edges, clear of the home indicator
           at the bottom and of the status bar at the top. */
        rule(
          { platform: 'native' },
          {
            marginBlockEnd: sum(own.inset, safeArea('bottom')),
            marginInline: own.inset,
          },
        ),
        rule(
          { platform: 'native', placement: ['top-center', 'top-end', 'top-start'] },
          { marginBlockEnd: 0, marginBlockStart: sum(own.inset, safeArea('top')) },
        ),
        rule(
          { lacks: 'data-color-mode', platform: 'native' },
          { colorScheme: scheme('dark', 'light') },
        ),
      ]),
      /* The UA hides a popover that is not showing, said again since `display: flex` takes it away. */
      on({ part: 'region', selector: '[part="region"]:not(:popover-open)' }, [
        rule({ platform: 'web' }, { display: 'none' }),
      ]),
      /* Only the messages take a pointer. */
      on({ region: 'default', slotted: '*' }, [
        rule({ platform: 'web' }, { pointerEvents: 'auto' }),
      ]),
    ]
  },
)
