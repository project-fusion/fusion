import { mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import row from './headless.js'

/**
 * A drilldown row's styled tier, which writes
 * `helix/styled/src/drilldown/item/drilldown-item.generated.css`.
 *
 * **A row is the width of its page**, its label taking what the row leaves
 * and ending in an ellipsis, with the caret of a row that opens a page at
 * its end in the quiet ink, one size with the way back's. **A described row
 * is two lines**: the label over its description, with what is before and
 * after them centered across both. It lights under the pointer, rings
 * inside its edge for the keyboard, and fades while disabled.
 *
 * **Two selectors stay written out**: a description that holds nothing,
 * which the web marks `data-empty` on its slot, and the parts of a
 * described row, which the web marks `data-described` on its press. A
 * phone reads whether the description holds something, its `described` value.
 */
export default styles(
  row,
  {
    prefix: 'drilldown-item',
    hooks: {
      blockSize: token('size-control-tight'),
      color: token('color-foreground'),
      descriptionColor: token('color-foreground-muted'),
      disabledOpacity: 0.5,
      fontSize: token('text-sm'),
      hoverColor: mix(token('color-foreground'), 8, 'transparent'),
      markColor: token('color-foreground-subtle'),
      paddingInline: token('space-sm'),
    },
    stylesheet: 'drilldown/item/drilldown-item.generated.css',
  },
  ({ hook, on, rule }) => {
    const height = hook.blockSize
    const spans = { gridRow: '1 / span 2' } as const
    /* A described row: the label over its description, with what is
       before and after them centered across both. */
    const grid = {
      blockSize: 'auto',
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
      minBlockSize: height,
      gap: token('space-none'),
      paddingBlock: token('space-2xs'),
    } as const
    const mark = {
      blockSize: token('size-icon-tight'),
      color: hook.markColor,
      flex: 'none',
      inlineSize: token('size-icon-tight'),
    } as const
    return [
      on('host', [rule({ display: 'block' })]),
      on('item', [
        rule({
          all: web('unset'),
          alignItems: 'center',
          blockSize: height,
          boxSizing: 'border-box',
          inlineSize: '100%',
          color: hook.color,
          cursor: web('pointer'),
          display: 'flex',
          fontFamily: token('font-sans'),
          fontSize: hook.fontSize,
          gap: token('space-xs'),
          paddingInline: hook.paddingInline,
          userSelect: 'none',
        }),
      ]),
      on('label', [
        rule({
          flex: '1 1 auto',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      ]),
      on('mark', [
        rule(mark),
        /* The caret points into the page, so it turns in a right-to-left
           page, as the web's mirror rule turns it. */
        native([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
      ]),
      on({ region: 'chevron', slotted: '*' }, [rule(mark)]),
      on({ region: 'description' }, [
        rule({
          color: hook.descriptionColor,
          display: 'block',
          fontSize: token('text-xs'),
          gridColumn: 2,
          gridRow: 2,
          minInlineSize: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      ]),
      /* Written out: a condition reads no attribute of a slot. */
      on({ part: 'item', selector: 'slot[name="description"][data-empty]' }, [
        web([rule({ display: 'none' })]),
      ]),
      on('item', [web([rule({ part: { 'data-described': true } }, grid)])]),
      on('item', [native([rule({ described: true }, grid)])]),
      /* Written out: a rule on what a region holds reads no state of the part around it. */
      on(
        { part: 'item', selector: '[part="item"][data-described] slot[name="start"]::slotted(*)' },
        [web([rule({ gridColumn: 1, ...spans, marginInlineEnd: token('space-xs') })])],
      ),
      on({ region: 'start', slotted: '*' }, [
        native([
          rule(
            { described: true },
            { gridColumn: 1, ...spans, marginInlineEnd: token('space-xs') },
          ),
        ]),
      ]),
      /* Written out: a rule on what a region holds reads no state of the part around it. */
      on({ part: 'item', selector: '[part="item"][data-described] [part="label"]' }, [
        web([rule({ gridColumn: 2, gridRow: 1 })]),
      ]),
      on('label', [native([rule({ described: true }, { gridColumn: 2, gridRow: 1 })])]),
      /* Written out: a rule on what a region holds reads no state of the part around it. */
      on({ part: 'item', selector: '[part="item"][data-described] slot[name="end"]::slotted(*)' }, [
        web([rule({ gridColumn: 3, ...spans, marginInlineStart: token('space-xs') })]),
      ]),
      on({ region: 'end', slotted: '*' }, [
        native([
          rule(
            { described: true },
            { gridColumn: 3, ...spans, marginInlineStart: token('space-xs') },
          ),
        ]),
      ]),
      /* Written out: a rule on what a region holds reads no state of the part around it. */
      on({ part: 'item', selector: '[part="item"][data-described] [part="mark"]' }, [
        web([rule({ gridColumn: 4, ...spans, marginInlineStart: token('space-xs') })]),
      ]),
      on('mark', [
        native([
          rule(
            { described: true },
            { gridColumn: 4, ...spans, marginInlineStart: token('space-xs') },
          ),
        ]),
      ]),
      /* Written out: a rule on what a region holds reads no state of the part around it. */
      on(
        {
          part: 'item',
          selector: '[part="item"][data-described] slot[name="chevron"]::slotted(*)',
        },
        [web([rule({ gridColumn: 4, ...spans, marginInlineStart: token('space-xs') })])],
      ),
      on({ region: 'chevron', slotted: '*' }, [
        native([
          rule(
            { described: true },
            { gridColumn: 4, ...spans, marginInlineStart: token('space-xs') },
          ),
        ]),
      ]),
      on('item', [
        rule({ hover: true, lacks: 'disabled' }, { backgroundColor: hook.hoverColor }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        rule({ has: 'disabled' }, { web: { cursor: 'default' }, opacity: hook.disabledOpacity }),
      ]),
    ]
  },
)
