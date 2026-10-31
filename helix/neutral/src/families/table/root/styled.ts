import { first, measured, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import table from './headless.js'

/**
 * A table's styled tier: hairline rules between rows, and no fill. Helix shows
 * depth with a single border and no elevation, and a dense table adds no other
 * decoration.
 *
 * **The table scrolls its own box rather than squeezing its columns.** On the
 * web `overflow-x` on the host does it. On a phone the machine stands a
 * horizontal scroll view around the table.
 *
 * **One grid for the whole table on the web**, which is what aligns every column
 * across every row, and the header row generates no box for the same reason. On
 * a phone the header row is a line of boxes at the tracks' widths.
 *
 * **A box of its own before it upgrades, with declarative shadow DOM too.**
 * Without it, `helix.css` lays the table out as a grid of its headings and cells,
 * and a rule from outside beats this sheet's `:host` unless this one is
 * important.
 *
 * **A windowed table scrolls its own box**, at a definite height, since the
 * window is a reading of that box. On the web its headings stick. On a phone they
 * stand outside what scrolls.
 *
 * **What a collection says instead of rows is `shared/collection/state`'s on the
 * web**, and its rules are written here again for a phone, which adopts no sheet.
 */
export default styles(
  table,
  {
    prefix: 'table',
    hooks: {
      blockSize: '24em',
      columns: null,
      dragPreviewBackgroundColor: token('color-surface-raised'),
      dragPreviewBorderColor: token('color-border'),
      dragPreviewBorderWidth: token('border-floating'),
      dragPreviewOpacity: 0.9,
      dragPreviewRadius: token('radii-sm'),
      dragPreviewShadow: token('shadow-floating'),
      errorColor: token('color-foreground'),
      headingBackgroundColor: token('color-background'),
      titleColor: token('color-foreground'),
      titleGap: token('space-sm'),
      titleText: token('text-md'),
    },
    own: {
      tableHeadingBackgroundColor: null,
      tableHeadingLayer: null,
      tableHeadingPosition: null,
    },
    stylesheet: 'table/root/table-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const heading = {
      borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
      boxSizing: 'border-box',
      minBlockSize: token('size-control-loose'),
    } as const
    const ring = [
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
    ]
    const stuck = [
      rule(
        { windowed: true },
        {
          backgroundColor: hook.headingBackgroundColor,
          insetBlockStart: 0,
          position: 'sticky',
          zIndex: token('layer-sticky'),
        },
      ),
    ]
    const said = {
      color: token('color-foreground-muted'),
      fontFamily: token('font-sans'),
      fontSize: token('text-sm'),
      margin: token('space-none'),
      paddingBlock: token('space-md'),
      paddingInline: token('space-sm'),
      textAlign: 'center',
    } as const
    return [
      on('host', [
        rule({ display: 'block', web: { overflowX: 'auto' } }),
        rule({ print: true }, { printColorAdjust: 'economy' }),
      ]),
      on({ part: 'table', selector: ':host(:not(:defined))' }, [
        web([rule({ display: 'block !important' })]),
      ]),
      on({ part: 'table', selector: ':host(:not(:defined))::before' }, [
        web([rule({ content: 'none !important' })]),
      ]),
      on('table', [
        web([
          rule({
            display: 'grid',
            gridTemplateColumns: first(hook.columns, measured('table-template', 'minmax(0, 1fr)')),
            inlineSize: '100%',
          }),
          rule(
            { windowed: true },
            {
              alignContent: 'start',
              blockSize: hook.blockSize,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
            },
          ),
        ]),
        native([rule({ windowed: true }, { blockSize: hook.blockSize })]),
        rule({ loading: true }, { opacity: 0.5 }),
      ]),
      on('head', [
        web([rule({ display: 'contents' })]),
        native([rule({ display: 'flex', flexDirection: 'row' })]),
      ]),
      on({ region: 'heading', slotted: '*' }, [
        rule({
          color: hook.titleColor,
          display: 'block',
          fontFamily: token('font-sans'),
          fontSize: hook.titleText,
          fontWeight: token('weight-semibold'),
          marginBlock: [token('space-none'), hook.titleGap],
        }),
      ]),
      on('select-all', [
        rule({
          ...heading,
          alignItems: 'center',
          display: 'flex',
          paddingInline: [token('space-none'), token('space-md')],
        }),
        web(stuck),
        web(ring),
      ]),
      on('grip-head', [rule(heading), web(stuck), web(ring)]),
      on('expand-head', [rule(heading), web(stuck), web(ring)]),
      on('checkbox', [native([rule({ alignSelf: 'center' })])]),
      on('head-box', [
        native([
          rule({ flexDirection: 'row' }),
          rule(
            { part: { 'data-pinned': true } },
            { backgroundColor: hook.headingBackgroundColor, zIndex: 1 },
          ),
        ]),
      ]),
      on('error', [
        rule({
          color: hook.errorColor,
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          margin: token('space-none'),
          paddingBlock: token('space-md'),
          paddingInline: token('space-sm'),
          textAlign: 'center',
        }),
      ]),
      on('loading', [native([rule(said)])]),
      on('empty', [native([rule(said)])]),
      on({ slotted: 'helix-table-column' }, [
        web([
          rule(
            { windowed: true },
            {
              own: {
                tableHeadingBackgroundColor: hook.headingBackgroundColor,
                tableHeadingLayer: token('layer-sticky'),
                tableHeadingPosition: 'sticky',
              },
            },
          ),
        ]),
      ]),
      on(['after', 'before'], [web([rule({ gridColumn: '1 / -1' })])]),
      on('drag-preview', [
        web([
          rule({
            backgroundColor: hook.dragPreviewBackgroundColor,
            border: [hook.dragPreviewBorderWidth, 'solid', hook.dragPreviewBorderColor],
            borderRadius: hook.dragPreviewRadius,
            boxShadow: hook.dragPreviewShadow,
            opacity: hook.dragPreviewOpacity,
          }),
        ]),
      ]),
    ]
  },
)
