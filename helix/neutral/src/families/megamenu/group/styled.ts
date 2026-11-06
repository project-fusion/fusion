import { difference, hookOf, token } from '../../../style.js'
import { styles } from '../../../table.js'
import group from './headless.js'

/**
 * A megamenu group's styled tier.
 *
 * **It draws what the `data-megamenu-group` and `data-megamenu-heading`
 * recipes give markup of your own**: a column of destinations one gap
 * apart, under a heading that labels the column rather than starting a
 * section, quiet and small, 24 pixels off its first row as the rows are off
 * each other. An icon passed into the heading hangs back into the heading's
 * inset, so the name starts where the destinations' names start.
 */
export default styles(
  group,
  { prefix: 'megamenu-group', stylesheet: 'megamenu/group/megamenu-group.generated.css' },
  ({ on, rule }) => [
    on('host', [rule({ display: 'block' })]),
    on('group', [
      rule({
        display: 'flex',
        flexDirection: 'column',
        gap: token('space-xs'),
      }),
    ]),
    on('label', [
      rule({
        alignItems: 'center',
        color: token('color-foreground-muted'),
        display: 'flex',
        gap: token('space-xs'),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontWeight: token('weight-medium'),
        /* A heading's leading, as the heading a page writes takes it. */
        lineHeight: token('leading-heading'),
        margin: [token('space-none'), token('space-none'), token('space-2xs')],
        paddingInline: token('space-sm'),
      }),
      rule({ hidden: true }, { display: 'none' }),
    ]),
    /* The product's own mark, where the product is named. */
    on({ region: 'label', slotted: 'helix-icon' }, [
      rule({
        '--icon-size': token('size-icon-sm'),
        flex: [0, 0, 'auto'],
        marginInlineStart: difference(
          difference(token('space-sm'), token('space-xs')),
          hookOf('icon', 'size'),
        ),
      }),
    ]),
  ],
)
