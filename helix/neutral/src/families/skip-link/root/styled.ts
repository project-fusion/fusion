import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * A skip link's styled tier, which writes
 * `helix/styled/src/skip-link/root/skip-link-root.generated.css`.
 *
 * **Hidden until focus reaches it**, by the visually hidden recipe, so it
 * stays in the tab order while nobody can see it, which `display: none`
 * would not keep. Then it is shown in a corner of the viewport, fixed there,
 * because the page may already be scrolled when focus arrives.
 */
export default styles(
  root,
  {
    prefix: 'skip-link',
    hooks: {
      backgroundColor: token('color-surface-inverse'),
      borderColor: token('color-border'),
      borderWidth: token('border-floating'),
      color: token('color-foreground-inverse'),
      fontSize: token('text-sm'),
      insetBlock: token('space-sm'),
      insetInline: token('space-sm'),
      paddingBlock: token('space-sm'),
      paddingInline: token('space-md'),
      radius: token('radii-sm'),
      shadow: token('shadow-floating'),
    },
    stylesheet: 'skip-link/root/skip-link-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        display: 'block',
        insetBlockStart: hook.insetBlock,
        insetInlineStart: hook.insetInline,
        web: { position: 'fixed' },
        zIndex: token('layer-overlay'),
      }),
      rule(
        { focusWithin: false },
        {
          blockSize: '1px',
          border: token('space-none'),
          web: { clipPath: 'inset(50%)' },
          inlineSize: '1px',
          margin: token('space-none'),
          overflow: 'hidden',
          padding: token('space-none'),
          position: 'absolute',
          whiteSpace: 'nowrap',
        },
      ),
      /* Not printed at all: paper cannot be tabbed through. */
      rule({ print: true }, { display: 'none' }),
    ]),
    on('link', [
      rule({
        backgroundColor: hook.backgroundColor,
        border: [hook.borderWidth, 'solid', hook.borderColor],
        borderRadius: hook.radius,
        boxShadow: hook.shadow,
        color: hook.color,
        display: 'inline-block',
        fontFamily: token('font-sans'),
        fontSize: hook.fontSize,
        fontWeight: token('weight-medium'),
        lineHeight: token('leading-normal'),
        paddingBlock: hook.paddingBlock,
        paddingInline: hook.paddingInline,
        textDecoration: 'none',
      }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
  ],
)
