import {
  difference,
  inherit,
  native,
  product,
  safeArea,
  scheme,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Toast's styled tier.
 *
 * **The host draws nothing. The stack is the `region` layer**, a column along
 * the window's bottom edge, or its top edge under a `top-` placement, kept
 * `--toast-inset` from the edges, with the newest message nearest the edge,
 * at the start, the middle, or the end of the line as `placement` says. The
 * stack has no surface of its own and takes no touch between its messages,
 * so the page beside a message stays pressable. **Below a window of 30rem
 * a phone's message takes the whole width of the stack.** A phone keeps the
 * stack clear of the home indicator and the status bar.
 *
 * **The messages are drawn in the scheme opposite the page's**, unless the
 * stack names its own mode with `data-color-mode`. The stack is not printed,
 * being an overlay.
 */
export default styles(
  root,
  {
    prefix: 'toast',
    hooks: {
      gap: token('space-xs'),
      inset: token('space-lg'),
    },
    own: { toastEnter: null, toastGap: null, toastInset: null, toastMost: null, toastWidth: null },
    stylesheet: 'toast/root/toast-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    return [
      on('host', [
        rule({ own: { toastInset: hook.inset }, display: 'contents' }),
        /* Which way the nearest edge is, which a message arrives from and leaves toward. */
        rule({ placement: false }, { own: { toastEnter: token('space-lg') } }),
        rule(
          { placement: ['bottom-center', 'bottom-end', 'bottom-start'] },
          { own: { toastEnter: token('space-lg') } },
        ),
        rule(
          { placement: ['top-center', 'top-end', 'top-start'] },
          { own: { toastEnter: product(token('space-lg'), '-1') } },
        ),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* Fixed to the window and transparent to a pointer, with the browser's
         popover box undone, since the stack has no surface of its own. */
      on('region', [
        rule({
          own: { toastGap: hook.gap },
          web: { background: 'none' },
          blockSize: web('auto'),
          border: web('none'),
          color: web(inherit()),
          display: 'flex',
          flexDirection: 'column',
          inlineSize: web('auto'),
          inset: web('auto'),
          insetInline: web(own.toastInset),
          margin: web(token('space-none')),
          maxBlockSize: web('none'),
          maxInlineSize: web('none'),
          overflow: web('visible'),
          padding: web(token('space-none')),
          pointerEvents: web('none'),
          position: web('fixed'),
          zIndex: web(token('layer-toast')),
        }),
        rule(
          { placement: false },
          { web: { insetBlockEnd: sum(own.toastInset, safeArea('bottom')) } },
        ),
        rule(
          { placement: ['bottom-center', 'bottom-end', 'bottom-start'] },
          { web: { insetBlockEnd: sum(own.toastInset, safeArea('bottom')) } },
        ),
        rule(
          { placement: ['top-center', 'top-end', 'top-start'] },
          { web: { insetBlockStart: sum(own.toastInset, safeArea('top')) } },
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
        web([rule({ own: { toastMost: difference('100vw', token('space-xl')) } })]),
        /* The web's message keeps its own width at every window, capped by `toastMost`,
           and a phone's takes the whole width of the stack where its window is narrow. */
        web([rule({ own: { toastWidth: '22rem' } })]),
        native([rule({ window: { below: '30rem' } }, { own: { toastWidth: '100%' } })]),
        /* A phone keeps the stack from the edges, clear of the home indicator
           at the bottom and of the status bar at the top. */
        native([
          rule({
            marginBlockEnd: sum(own.toastInset, safeArea('bottom')),
            marginInline: own.toastInset,
          }),
          rule(
            { placement: ['top-center', 'top-end', 'top-start'] },
            { marginBlockEnd: 0, marginBlockStart: sum(own.toastInset, safeArea('top')) },
          ),
          rule({ lacks: 'data-color-mode' }, { colorScheme: scheme('dark', 'light') }),
        ]),
      ]),
      /* The UA hides a popover that is not showing, said again since `display: flex` takes it away. */
      /* Written out: the vocabulary names no `:popover-open`. */
      on({ part: 'region', selector: '[part="region"]:not(:popover-open)' }, [
        web([rule({ display: 'none' })]),
      ]),
      /* Only the messages take a pointer. */
      on({ region: 'default', slotted: '*' }, [web([rule({ pointerEvents: 'auto' })])]),
    ]
  },
)
