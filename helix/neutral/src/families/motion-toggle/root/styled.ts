import { mix, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Motion Toggle's styled tier, which writes
 * `helix/styled/src/motion-toggle/root/motion-toggle-root.generated.css`.
 *
 * **A quiet button on the floating surface**, as the controls over a map and
 * Aura's own pause are, so it reads over a page's header or over a drawing
 * alike: square with the icon alone, and as wide as its text with text.
 * Paused, it reads pressed, in the ink of a chosen control.
 *
 * **The icon is the small icon step.** The web sizes the drawn `<svg>` and an
 * icon passed in, which the vocabulary names with a selector of the web's own.
 * A phone sizes its glyph and an icon passed in with rules of its own.
 */
export default styles(
  root,
  {
    prefix: 'motion-toggle',
    hooks: ['background-color'],
    stylesheet: 'motion-toggle/root/motion-toggle-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'inline-block' }),
      /* A pause control means nothing on paper, where nothing moves. */
      rule({ print: true }, { display: 'none' }),
    ]),
    on('button', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor(token('color-surface-overlay')),
        border: [token('border-floating'), 'solid', token('color-border')],
        borderRadius: token('radii-sm'),
        boxShadow: token('shadow-floating'),
        color: token('color-foreground'),
        cursor: web('pointer'),
        display: 'inline-flex',
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        gap: token('space-xs'),
        justifyContent: 'center',
        minBlockSize: token('size-control-sm'),
        minInlineSize: token('size-control-sm'),
        /* Room either side of the icon and any text beside it, which a square
           button with the icon alone keeps inside its least width. */
        padding: [0, token('space-xs')],
      }),
      rule(
        { hover: true },
        {
          backgroundColor: mix(
            token('color-foreground'),
            10,
            hook.backgroundColor(token('color-surface-overlay')),
          ),
        },
      ),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      /* Paused: the button reads pressed, in the ink of a chosen control. */
      rule(
        { state: 'paused' },
        {
          backgroundColor: mix(
            token('color-foreground'),
            16,
            hook.backgroundColor(token('color-surface-overlay')),
          ),
        },
      ),
      rule({ forcedColors: true }, { borderColor: web('ButtonText') }),
      rule(
        { forcedColors: true, state: 'paused' },
        { backgroundColor: web('Highlight'), color: web('HighlightText') },
      ),
    ]),
    on('icon', [rule({ display: 'inline-flex' })]),
    on({ part: 'icon', selector: '[part="icon"] svg,\n[part="icon"] ::slotted(*)' }, [
      rule(
        { platform: 'web' },
        { blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') },
      ),
    ]),
    on('glyph', [
      rule(
        { platform: 'native' },
        { blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') },
      ),
    ]),
    on({ region: 'icon', slotted: '*' }, [
      rule(
        { platform: 'native' },
        { blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') },
      ),
    ]),
  ],
)
