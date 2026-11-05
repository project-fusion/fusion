import {
  difference,
  fn,
  inherit,
  inherited,
  mix,
  product,
  quotient,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Filter Chip's styled tier.
 *
 * **A chip is a row of segments and a control**, Tag's height, so a chip and a tag
 * mixed in one row stand level. The field and the comparison are quiet, and the
 * values carry the weight, since they are what a reader scans a bar of chips for.
 * **The seams are inside the segments**, so a chip with no comparison closes up.
 *
 * **The edge is a step from the chip's own fill**, mixed from the ink, since the
 * page's border measured 1.03:1 on the sunken fill in light.
 *
 * **The values give way first**, so the field's name stays readable, and each
 * segment ends in an ellipsis on one line. **The remove mark is Tag's**, three
 * quarters of `icon-sm`, in a square the size of the chip's own icons whose press
 * reaches the target size. Print keeps the chip and drops the remove button.
 */
export default styles(
  root,
  {
    prefix: 'filter-input-chip',
    hooks: ({ own }) => ({
      backgroundColor: token('color-surface-sunken'),
      borderColor: mix(token('color-foreground'), 8, own.chipFill),
      radius: token('radii-sm'),
    }),
    own: {
      chipFill: null,
    },
    stylesheet: 'filter-input/chip/filter-chip.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const truncated = {
      minInlineSize: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    } as const
    return [
      on('host', [
        rule({
          '--helix-size-control': token('size-control-sm'),
          '--helix-size-control-loose': product(token('size-control'), '1.2'),
          '--helix-size-control-tight': fn('round', product(token('size-control'), '0.8'), '1px'),
          '--helix-size-checkbox': token('size-checkbox-sm'),
          '--helix-size-checkbox-loose': product(token('size-checkbox'), '1.2'),
          '--helix-size-checkbox-tight': product(token('size-checkbox'), '0.8'),
          '--helix-size-switch': token('size-switch-sm'),
          '--helix-size-tag': inherit(),
          '--helix-text-control': token('text-control-sm'),
          '--helix-space-control': token('space-sm'),
          '--helix-text-field': token('text-sm'),
          '--helix-text-field-label': token('text-xs'),
          '--helix-space-field': token('space-xs'),
          '--helix-space-row-bleed': token('space-2xs'),
          '--helix-size-icon': token('size-icon-sm'),
          '--helix-size-icon-loose': product(token('size-icon'), '1.2'),
          '--helix-size-icon-tight': product(token('size-icon'), '0.8'),
          alignItems: 'center',
          own: { chipFill: hook.backgroundColor },
          backgroundColor: own.chipFill,
          border: [token('border-thin'), 'solid', hook.borderColor],
          borderRadius: hook.radius,
          color: token('color-foreground'),
          display: 'inline-flex',
          flexDirection: 'row',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          gap: token('space-none'),
          lineHeight: token('leading-normal'),
          maxInlineSize: '100%',
          minBlockSize: token('size-tag'),
          minInlineSize: 0,
          paddingInline: token('space-xs'),
        }),
      ]),
      on('field', [
        rule({
          ...truncated,
          color: token('color-foreground-muted'),
          maxInlineSize: '20ch',
          paddingInlineEnd: token('space-2xs'),
        }),
      ]),
      on('operator', [
        rule({
          alignItems: 'center',
          color: token('color-foreground-muted'),
          display: 'inline-flex',
          paddingInlineEnd: token('space-2xs'),
          whiteSpace: 'nowrap',
        }),
      ]),
      on('values', [
        rule({ ...truncated, flexShrink: 1000, fontWeight: token('weight-medium') }),
        rule({ part: { hidden: true } }, { display: 'none' }),
      ]),
      on('dismiss', [
        rule({
          web: { background: 'none', border: '0', cursor: 'pointer' },
          blockSize: token('size-icon'),
          borderRadius: token('radii-sm'),
          color: token('color-foreground-muted'),
          display: 'grid',
          inlineSize: token('size-icon'),
          marginInlineStart: token('space-2xs'),
          padding: token('space-none'),
          placeItems: 'center',
          position: 'relative',
        }),
        rule(
          { hover: true },
          {
            backgroundColor: mix('currentcolor', 12, 'transparent'),
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
        rule({ print: true }, { display: 'none' }),
      ]),
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
        rule({
          blockSize: inherited('icon-size', product(token('size-icon-sm'), 0.75)),
          inlineSize: inherited('icon-size', product(token('size-icon-sm'), 0.75)),
        }),
      ]),
    ]
  },
)
