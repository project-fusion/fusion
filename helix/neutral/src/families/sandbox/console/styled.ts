import { fn, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import pane from './headless.js'

/**
 * Sandbox Console's styled tier.
 *
 * **It fills the box it is given and scrolls inside it**, since its content
 * is unbounded: an auto height let the log grow past the panel holding it. A
 * console placed where nothing gives it a height sizes to what it holds.
 *
 * **The controls are a row of small controls along the top edge**, in the
 * log's own type, at the small step, so the clear button is the size of the
 * filter beside it. The filter is a select, which iOS Safari zooms into below
 * 16px, so its type has the field floor under it. On paper the lines print and
 * the controls, which have nothing to do there, do not.
 *
 * **The lines are a Log's**, flush in the panel: no box of its own, the
 * panel's padding either side.
 */
export default styles(
  pane,
  {
    prefix: 'sandbox-console',
    hooks: {
      size: '100%',
    },
    stylesheet: 'sandbox/console/sandbox-console.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        web: { blockSize: hook.size, display: 'grid', gridTemplateRows: 'minmax(0, 1fr)' },
        minBlockSize: 0,
      }),
      web([rule({ controls: true }, { gridTemplateRows: 'auto minmax(0, 1fr)' })]),
      native([rule({ display: 'flex', flexDirection: 'column' })]),
    ]),
    on('controls', [
      rule({
        '--helix-size-control': token('size-control-sm'),
        '--helix-size-control-loose': fn('round', product(token('size-control'), 1.2), '1px'),
        '--helix-size-control-tight': fn('round', product(token('size-control'), 0.8), '1px'),
        '--helix-size-checkbox': token('size-checkbox-sm'),
        '--helix-size-checkbox-loose': fn('round', product(token('size-checkbox'), 1.2), '1px'),
        '--helix-size-checkbox-tight': fn('round', product(token('size-checkbox'), 0.8), '1px'),
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': fn('round', product(token('size-icon'), 1.2), '2px'),
        '--helix-size-icon-tight': fn('round', product(token('size-icon'), 0.8), '2px'),
        '--helix-size-switch': token('size-switch-sm'),
        '--helix-size-tag': token('size-tag-sm'),
        '--helix-text-control': token('text-control-sm'),
        '--helix-space-control': token('space-sm'),
        '--helix-text-field': token('text-sm'),
        '--helix-text-field-label': token('text-xs'),
        '--helix-space-field': token('space-xs'),
        '--helix-space-row-bleed': token('space-2xs'),
        alignItems: 'center',
        borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
        display: 'flex',
        flexDirection: 'row',
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        gap: token('space-xs'),
        justifyContent: 'space-between',
        padding: [token('space-2xs'), token('space-sm')],
      }),
      rule({ print: true }, { display: 'none' }),
    ]),
    on('filter', [
      rule({
        backgroundColor: 'transparent',
        border: [token('border-thin'), 'solid', token('color-border')],
        borderRadius: token('radii-sm'),
        color: token('color-foreground'),
        font: 'inherit',
        fontSize: fn('max', token('text-field-min'), token('text-xs')),
        padding: [token('space-2xs'), token('space-xs')],
      }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on('output', [
      rule({
        '--log-padding-inline': token('space-sm'),
        minBlockSize: 0,
      }),
    ]),
  ],
)
