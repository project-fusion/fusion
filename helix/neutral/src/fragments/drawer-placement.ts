import { first, fn, native, safeArea, sum, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * Where Drawer's panel stands along each edge: square where it meets the
 * window and curved where it meets the page, as long as the window and as
 * wide as its size across it, sliding out toward its edge, and clear of the
 * status bar and the home indicator at an edge it meets the window along.
 * Drawer's table takes it in where it stands in its cascade.
 */
export default fragment(
  'drawer-placement',
  {
    parts: ['panel'],
    hooks: { padding: null, paddingBlockStart: null },
    own: {
      drawerAway: null,
      drawerInset: null,
      drawerInsetTop: null,
      drawerLead: null,
      drawerSize: null,
      drawerTrail: null,
    },
    props: ['placement'],
  },
  ({ hook, on, own, rule }) => {
    const padding = hook.padding(own.drawerInset)
    const paddingTop = first(hook.paddingBlockStart, hook.padding, own.drawerInsetTop)
    /* The padding at an edge the panel meets the window along, clear of the
       status bar, a notch, and the home indicator there. */
    const clearTop = sum(paddingTop, safeArea('top'))
    const clearBottom = sum(padding, safeArea('bottom'))
    return [
      on('panel', [
        /* Square where it meets the window, curved where it meets the page. */
        rule([{ placement: false }, { placement: 'end' }], {
          borderStartEndRadius: token('radii-none'),
          borderEndEndRadius: token('radii-none'),
          blockSize: '100%',
          inlineSize: fn('min', own.drawerSize, '100%'),
          web: { insetBlock: 0, insetInlineEnd: 0 },
          own: {
            drawerAway: fn('translateX', '100%'),
            drawerLead: clearTop,
            drawerTrail: clearBottom,
          },
        }),
        rule(
          { placement: 'start' },
          {
            borderStartStartRadius: token('radii-none'),
            borderEndStartRadius: token('radii-none'),
            blockSize: '100%',
            inlineSize: fn('min', own.drawerSize, '100%'),
            web: { insetBlock: 0, insetInlineStart: 0 },
            own: {
              drawerAway: fn('translateX', '-100%'),
              drawerLead: clearTop,
              drawerTrail: clearBottom,
            },
          },
        ),
        rule(
          { placement: 'bottom' },
          {
            borderEndStartRadius: token('radii-none'),
            borderEndEndRadius: token('radii-none'),
            blockSize: fn('min', own.drawerSize, '100%'),
            web: { insetBlockEnd: 0, insetInline: 0 },
            own: {
              drawerAway: fn('translateY', '100%'),
              drawerLead: paddingTop,
              drawerTrail: clearBottom,
            },
          },
        ),
        rule(
          { placement: 'top' },
          {
            borderStartStartRadius: token('radii-none'),
            borderStartEndRadius: token('radii-none'),
            blockSize: fn('min', own.drawerSize, '100%'),
            web: { insetBlockStart: 0, insetInline: 0 },
            own: {
              drawerAway: fn('translateY', '-100%'),
              drawerLead: clearTop,
              drawerTrail: padding,
            },
          },
        ),
        /* A phone takes no share inside `min()`, which the window it stands
           in has no length for until it is laid out: the size, and never more
           than the window across it. */
        native([
          rule([{ placement: false }, { placement: ['end', 'start'] }], {
            inlineSize: own.drawerSize,
            maxInlineSize: '100%',
          }),
          rule(
            { placement: ['bottom', 'top'] },
            { blockSize: own.drawerSize, maxBlockSize: '100%' },
          ),
        ]),
        /* The inline edges are logical and `translateX` is physical, so on a
           right-to-left page the end sits on the left and slides out leftward. */
        rule(
          [
            { dir: 'rtl', placement: false },
            { dir: 'rtl', placement: 'end' },
          ],
          { own: { drawerAway: fn('translateX', '-100%') } },
        ),
        rule({ dir: 'rtl', placement: 'start' }, { own: { drawerAway: fn('translateX', '100%') } }),
      ]),
    ]
  },
)
