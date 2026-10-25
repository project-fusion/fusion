import { token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * A description list item's styled tier, which writes
 * `helix/styled/src/description-list/item/description-list-item.generated.css`.
 * Its hooks carry the list's prefix, `--description-list-label-color`.
 *
 * **A subgrid of the list, across every track it has**: one when the list
 * stacks, two when it sets labels beside values. The item reads the list's
 * tracks, and the alignment its values take from the list's private values.
 *
 * **A phone lays the label beside the value** where the list says so, and
 * the value takes the rest of the line.
 */
export default styles(
  item,
  {
    prefix: 'description-list',
    hooks: [
      'actions-gap',
      'item-align',
      'item-gap',
      'label-color',
      'label-font-size',
      'label-weight',
      'value-color',
    ],
    own: [
      'description-list-column-gap',
      'description-list-direction',
      'description-list-value-align',
      'description-list-value-figures',
    ],
    stylesheet: 'description-list/item/description-list-item.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        alignItems: hook.itemAlign('baseline'),
        display: 'grid',
        gridColumn: '1 / -1',
        gridTemplateColumns: 'subgrid',
        rowGap: hook.itemGap(token('space-2xs')),
      }),
      rule(
        { platform: 'native' },
        { columnGap: own.columnGap(0), display: 'flex', flexDirection: own.direction('column') },
      ),
      /* A label never ends one page with its value starting the next. */
      rule({ print: true }, { breakInside: web('avoid') }),
    ]),
    /* `muted`, because a label is content, and `subtle` falls under the
       contrast a small label needs. */
    on('label', [
      rule({
        color: hook.labelColor(token('color-foreground-muted')),
        fontSize: hook.labelFontSize(token('text-sm')),
        fontWeight: hook.labelWeight(token('weight-medium')),
        margin: 0,
      }),
    ]),
    /* The value takes the text around it, and breaks anywhere: an id, a hash
       or an address has no spaces to wrap at. */
    on('value', [
      rule({
        color: hook.valueColor(token('color-foreground')),
        fontVariantNumeric: own.valueFigures('normal'),
        justifySelf: web(own.valueAlign('stretch')),
        margin: 0,
        minInlineSize: 0,
        overflowWrap: web('anywhere'),
        textAlign: own.valueAlign('start'),
      }),
      rule({ platform: 'native' }, { flex: '1 1 auto' }),
    ]),
    /* Several values, as `<dd>` elements of the page's: each drawn as the
       value is, in the values' column. */
    on({ slotted: 'dd' }, [
      rule(
        { platform: 'web' },
        {
          color: hook.valueColor(token('color-foreground')),
          fontVariantNumeric: own.valueFigures('normal'),
          gridColumn: '-2 / -1',
          justifySelf: own.valueAlign('stretch'),
          margin: 0,
          minInlineSize: 0,
          overflowWrap: 'anywhere',
          textAlign: own.valueAlign('start'),
        },
      ),
    ]),
    /* Controls after the value, on its line where they fit. */
    on({ region: 'actions', slotted: '*' }, [
      rule({ marginInlineStart: hook.actionsGap(token('space-xs')), verticalAlign: web('middle') }),
    ]),
  ],
)
