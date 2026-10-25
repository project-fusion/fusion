import { token, web } from '../../../style.js'
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
    hooks: [
      'background-color',
      'border-color',
      'border-width',
      'color',
      'font-size',
      'inset-block',
      'inset-inline',
      'padding-block',
      'padding-inline',
      'radius',
      'shadow',
    ],
    stylesheet: 'skip-link/root/skip-link-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        display: 'block',
        insetBlockStart: hook.insetBlock(token('space-sm')),
        insetInlineStart: hook.insetInline(token('space-sm')),
        position: web('fixed'),
        zIndex: token('layer-overlay'),
      }),
      rule(
        { focusWithin: false },
        {
          blockSize: '1px',
          border: token('space-none'),
          clipPath: web('inset(50%)'),
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
        backgroundColor: hook.backgroundColor(token('color-surface-inverse')),
        border: [
          hook.borderWidth(token('border-floating')),
          'solid',
          hook.borderColor(token('color-border')),
        ],
        borderRadius: hook.radius(token('radii-sm')),
        boxShadow: hook.shadow(token('shadow-floating')),
        color: hook.color(token('color-foreground-inverse')),
        display: 'inline-block',
        fontFamily: token('font-sans'),
        fontSize: hook.fontSize(token('text-sm')),
        fontWeight: token('weight-medium'),
        lineHeight: token('leading-normal'),
        paddingBlock: hook.paddingBlock(token('space-sm')),
        paddingInline: hook.paddingInline(token('space-md')),
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
