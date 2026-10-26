import { product, token } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Toolbar's styled tier, which writes
 * `helix/styled/src/toolbar/root/toolbar-root.generated.css`.
 *
 * **Dense by nature, and it says so once.** The host sets the small steps
 * of every control size, so a control put in it takes them without being
 * told, and `size` sets larger ones for all of them together. Each step is
 * written before the ones derived from it, which a phone resolves in order.
 *
 * **It draws no frame of its own** until its hooks give it a fill, an edge,
 * or padding, so it does not add a second frame inside whatever already
 * frames the bar.
 *
 * **A divider runs across the toolbar.** In a column it is a horizontal line
 * as wide as the column, which a column of controls centered on its axis
 * would shrink to nothing.
 */
export default styles(
  root,
  {
    prefix: 'toolbar',
    hooks: {
      align: 'center',
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      gap: token('space-2xs'),
      padding: token('space-none'),
      radius: token('radii-none'),
      separatorGap: 0,
    },
    props: [prop('size', ['sm', 'md', 'lg'])],
    stylesheet: 'toolbar/root/toolbar-root.generated.css',
  },
  ({ hook, on, rule, variants }) => [
    on('host', [
      rule({
        '--helix-size-checkbox': token('size-checkbox-sm'),
        '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
        '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
        /* The icon step with it. Declaring the control size alone leaves an
           icon at the `md` step inside `sm` controls: 20 pixels in a 32 pixel
           row. */
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': product(token('size-icon'), 1.2),
        '--helix-size-icon-tight': product(token('size-icon'), 0.8),
        '--helix-size-control': token('size-control-sm'),
        '--helix-size-control-loose': product(token('size-control'), 1.2),
        '--helix-size-control-tight': product(token('size-control'), 0.8),
        '--helix-size-tag': token('size-tag-sm'),
        display: 'inline-flex',
      }),
      variants('size', {
        md: {
          '--helix-size-checkbox': token('size-checkbox-md'),
          '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
          '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
          '--helix-size-icon': token('size-icon-md'),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-control': token('size-control-md'),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-control-tight': product(token('size-control'), 0.8),
          '--helix-size-tag': token('size-tag-md'),
        },
        lg: {
          '--helix-size-checkbox': token('size-checkbox-lg'),
          '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
          '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
          '--helix-size-icon': token('size-icon-lg'),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-control': token('size-control-lg'),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-control-tight': product(token('size-control'), 0.8),
          '--helix-size-tag': token('size-tag-lg'),
        },
      }),
      /* Not printed: a row of controls is ink spent on actions a page cannot
         take. */
      rule({ print: true }, { display: 'none' }),
    ]),
    on('toolbar', [
      rule({
        /* Across the toolbar's axis: centered, or `stretch` for a column of
           controls as wide as the toolbar. */
        alignItems: hook.align,
        backgroundColor: hook.backgroundColor,
        border: [hook.borderWidth, 'solid', hook.borderColor],
        borderRadius: hook.radius,
        display: 'flex',
        gap: hook.gap,
        padding: hook.padding,
      }),
      rule({ orientation: 'vertical' }, { flexDirection: 'column' }),
    ]),
    /* A divider between controls, and the space either side of it along the
       toolbar's axis. None unless set: the toolbar's gap already parts them. */
    on({ slotted: 'helix-divider' }, [
      rule({ marginInline: hook.separatorGap }),
      rule(
        { orientation: 'vertical' },
        { alignSelf: 'stretch', marginBlock: hook.separatorGap, marginInline: 0 },
      ),
    ]),
  ],
)
