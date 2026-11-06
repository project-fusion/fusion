import { difference, product, quotient, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * Dialog's close control, in the panel's corner and out of the flow,
 * centered on the title's first line, its glyph's edge on the content's
 * edge, with a press as large as `--helix-size-target`. Dialog's table takes
 * it in where it stands in its cascade.
 */
export default fragment(
  'dialog-dismiss',
  {
    parts: ['dismiss', 'dismiss-mark'],
    hooks: { padding: null },
    own: { dialogDismiss: null, dialogDismissGlyph: null, dialogInset: null },
  },
  ({ hook, on, own, rule }) => {
    /* The title's first line, where the close control is centered. */
    const titleLine = product(token('text-xl'), token('leading-tight'))
    const dismissSize = own.dialogDismiss
    /* The panel's inset, which the family's `padding` hook defaults to. */
    const padding = hook.padding(own.dialogInset)
    return [
      /* In the corner and out of the flow, centered on the title's first line.
         **The box and its glyph follow the density**, the tight control and icon steps,
         **and the glyph's edge is the content's edge**: the box sits in by the inset less
         its own margin round the glyph, 16 at `md` as before. */
      on('dismiss', [
        rule({
          own: {
            dialogDismiss: token('size-control-tight'),
            dialogDismissGlyph: token('size-icon-tight'),
          },
          web: { all: 'unset', cursor: 'pointer' },
          boxSizing: 'border-box',
          position: 'absolute',
          insetBlockStart: sum(padding, quotient(difference(titleLine, dismissSize), 2)),
          insetInlineEnd: difference(
            padding,
            quotient(difference(dismissSize, own.dialogDismissGlyph), 2),
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
        rule({ blockSize: own.dialogDismissGlyph, inlineSize: own.dialogDismissGlyph }),
      ]),
      on('dismiss', [
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
      ]),
      on('dismiss', [rule({ reducedMotion: true }, { transition: 'none' })]),
    ]
  },
)
