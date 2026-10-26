import { native, token, web } from '../../../style.js'
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
    hooks: {
      actionsGap: token('space-xs'),
      itemAlign: 'baseline',
      itemGap: token('space-2xs'),
      labelColor: token('color-foreground-muted'),
      labelFontSize: token('text-sm'),
      labelWeight: token('weight-medium'),
      valueColor: token('color-foreground'),
    },
    own: {
      descriptionListColumnGap: null,
      descriptionListDirection: null,
      descriptionListValueAlign: null,
      descriptionListValueFigures: null,
    },
    stylesheet: 'description-list/item/description-list-item.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        alignItems: hook.itemAlign,
        display: 'grid',
        gridColumn: '1 / -1',
        gridTemplateColumns: 'subgrid',
        rowGap: hook.itemGap,
      }),
      native([
        rule({
          columnGap: own.descriptionListColumnGap(0),
          display: 'flex',
          flexDirection: own.descriptionListDirection('column'),
        }),
      ]),
      /* A label never ends one page with its value starting the next. */
      rule({ print: true }, { web: { breakInside: 'avoid' } }),
    ]),
    /* `muted`, because a label is content, and `subtle` falls under the
       contrast a small label needs. */
    on('label', [
      rule({
        color: hook.labelColor,
        fontSize: hook.labelFontSize,
        fontWeight: hook.labelWeight,
        margin: 0,
      }),
    ]),
    /* The value takes the text around it, and breaks anywhere: an id, a hash
       or an address has no spaces to wrap at. */
    on('value', [
      rule({
        color: hook.valueColor,
        fontVariantNumeric: own.descriptionListValueFigures('normal'),
        justifySelf: web(own.descriptionListValueAlign('stretch')),
        web: { overflowWrap: 'anywhere' },
        margin: 0,
        minInlineSize: 0,
        textAlign: own.descriptionListValueAlign('start'),
      }),
      native([rule({ flex: '1 1 auto' })]),
    ]),
    /* Several values, as `<dd>` elements of the page's: each drawn as the
       value is, in the values' column. */
    on({ slotted: 'dd' }, [
      web([
        rule({
          color: hook.valueColor,
          fontVariantNumeric: own.descriptionListValueFigures('normal'),
          gridColumn: '-2 / -1',
          justifySelf: own.descriptionListValueAlign('stretch'),
          margin: 0,
          minInlineSize: 0,
          overflowWrap: 'anywhere',
          textAlign: own.descriptionListValueAlign('start'),
        }),
      ]),
    ]),
    /* Controls after the value, on its line where they fit. */
    on({ region: 'actions', slotted: '*' }, [
      rule({ marginInlineStart: hook.actionsGap, web: { verticalAlign: 'middle' } }),
    ]),
  ],
)
