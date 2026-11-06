import { difference, first, product, quotient, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Drawer's close control, in the panel's corner and out of the flow,
 * centered on the title's first line below the panel's lead, its glyph's
 * edge on the content's edge, with a press as large as
 * `--helix-size-target`. Drawer's table takes it in where it stands in its
 * cascade.
 */
export default fragment(
  'drawer-dismiss',
  {
    parts: ['dismiss', 'dismiss-mark'],
    hooks: { padding: null, paddingBlockStart: null },
    own: {
      drawerDismiss: null,
      drawerDismissGlyph: null,
      drawerInset: null,
      drawerInsetTop: null,
      drawerLead: null,
    },
  },
  ({ hook, on, own, rule }) => {
    const padding = hook.padding(own.drawerInset)
    const paddingTop = first(hook.paddingBlockStart, hook.padding, own.drawerInsetTop)
    const dismissSize = own.drawerDismiss
    /* The title's first line, where the close control is centered. */
    const titleLine = product(token('text-lg'), token('leading-tight'))
    return [
      /* In the corner and out of the flow, centered on the title's first line. **The
         box, its glyph and its inset follow the density** as Dialog's do. */
      on('dismiss', [
        rule({
          own: {
            drawerDismiss: token('size-control-tight'),
            drawerDismissGlyph: token('size-icon-tight'),
          },
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          position: 'absolute',
          insetBlockStart: sum(
            own.drawerLead(paddingTop),
            quotient(difference(titleLine, dismissSize), 2),
          ),
          insetInlineEnd: difference(
            padding,
            quotient(difference(dismissSize, own.drawerDismissGlyph), 2),
          ),
          blockSize: dismissSize,
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          inlineSize: dismissSize,
          placeContent: 'center',
          placeItems: 'center',
          transition: ['color', token('duration-fast'), token('easing-standard')],
        }),
        rule(
          { hover: true },
          {
            backgroundColor: token('color-hover'),
            color: token('color-foreground'),
          },
        ),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        rule({ reducedMotion: true }, { transition: 'none' }),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing drawn
         moves. Where the control is already that size the box sits inside it. */
      on({ after: 'dismiss' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      on('dismiss-mark', [
        rule({ blockSize: own.drawerDismissGlyph, inlineSize: own.drawerDismissGlyph }),
      ]),
    ]
  },
)
