import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import preview from './headless.js'

/**
 * Sandbox Preview's styled tier.
 *
 * **The frame fills the pane on the page's ground**, and stays transparent
 * until it draws: a frame's document paints white until it knows its color
 * mode, since Chrome draws an opaque canvas behind a frame whose color scheme
 * differs from its element's, and the frame learns its mode only after its
 * first paint. Transparent rather than hidden, since a browser stops drawing a
 * hidden frame from another origin.
 *
 * **What the source threw lies over the example**, which is stale while it
 * fails, in the mono face and the danger ink, the shape of what was thrown
 * kept as the console keeps it.
 *
 * **The reload and open buttons stand in the corner over the example**, in
 * the console's small type.
 */
export default styles(
  preview,
  {
    prefix: 'sandbox-preview',
    stylesheet: 'sandbox/preview/sandbox-preview.generated.css',
  },
  ({ on, rule }) => [
    on('host', [rule({ display: 'block', minBlockSize: 0, position: 'relative' })]),
    on('frame', [
      rule({
        backgroundColor: token('color-background'),
        blockSize: '100%',
        border: 'none',
        display: 'block',
        inlineSize: '100%',
      }),
      rule({ blank: true }, { opacity: 0 }),
    ]),
    on('error', [
      rule({
        backgroundColor: token('color-background'),
        boxSizing: 'border-box',
        color: token('color-danger'),
        fontFamily: token('font-mono'),
        fontSize: token('text-sm'),
        fontVariantLigatures: 'none',
        inset: 0,
        lineHeight: token('leading-normal'),
        margin: token('space-none'),
        overflow: 'auto',
        padding: token('space-md'),
        position: 'absolute',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }),
    ]),
    on('controls', [
      rule({
        display: 'flex',
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        gap: token('space-2xs'),
        insetBlockEnd: token('space-xs'),
        insetInlineEnd: token('space-xs'),
        position: 'absolute',
      }),
    ]),
    on(
      ['reload', 'open'],
      [
        rule({
          backgroundColor: token('color-surface'),
          border: [token('border-thin'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          color: token('color-foreground'),
          cursor: 'pointer',
          font: 'inherit',
          padding: [token('space-2xs'), token('space-xs')],
        }),
        rule({ hover: true }, { backgroundColor: token('color-surface-sunken') }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ],
    ),
  ],
)
