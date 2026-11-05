import dataTableRows from '../../../fragments/data-table-rows.js'
import {
  difference,
  first,
  fn,
  measured,
  mix,
  native,
  product,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import table from './headless.js'

/**
 * A table drawn from an array, in its styled tier: hairline rules between rows
 * and no fill. Helix shows depth with a single border and no elevation.
 *
 * **The grid scrolls in its own box, and the toolbar and footer sit outside it**,
 * so a search field stays in place when the columns scroll sideways. A phone's
 * machine stands a horizontal scroll view around the grid. A grid wider than its
 * box fades whichever edge has more behind it, on a scroll timeline.
 */
export default styles(
  table,
  {
    prefix: 'data-table',
    hooks: {
      cellAlign: null,
      cellBlockAlign: 'center',
      draggingOpacity: 0.5,
      dropIndicatorColor: token('color-primary'),
      dropIndicatorSize: token('border-thick'),
      gripColor: token('color-foreground-muted'),
      gripDisabledOpacity: token('opacity-disabled'),
      rowBackgroundColor: null,
      rowHoverBackgroundColor: mix(token('color-foreground'), 4, token('color-background'), 'srgb'),
      selectedBackgroundColor: token('color-primary-subtle'),
      blockSize: '24em',
      color: token('color-foreground'),
      columns: null,
      dragPreviewBackgroundColor: token('color-surface-raised'),
      dragPreviewBorderColor: token('color-border'),
      dragPreviewBorderWidth: token('border-floating'),
      dragPreviewOpacity: 0.9,
      dragPreviewRadius: token('radii-sm'),
      dragPreviewShadow: token('shadow-floating'),
      errorColor: token('color-foreground'),
      footerGap: token('space-sm'),
      footerItemGap: token('space-md'),
      headingBackgroundColor: token('color-background'),
      headingColor: null,
      indent: null,
      moreBorderColor: token('color-border'),
      moreHoverBackgroundColor: token('color-surface-raised'),
      morePaddingBlock: token('space-2xs'),
      morePaddingInline: token('space-sm'),
      moreRadius: token('radii-sm'),
      paddingBlock: token('space-sm'),
      paddingInline: null,
      ruleColor: token('color-border'),
      text: token('text-control'),
      toggleColor: token('color-foreground-muted'),
      toggleGap: token('space-2xs'),
      toggleSize: token('size-icon-tight'),
      toolbarGap: token('space-sm'),
    },
    own: {
      collectionInsetBlock: null,
      collectionInsetInline: null,
      dataTableDepth: null,
      dataTableFade: null,
      dataTableGutter: null,
      tableHeadingBackgroundColor: null,
      tableHeadingColor: null,
      tableHeadingLayer: null,
      tableHeadingPaddingBlock: null,
      tableHeadingPaddingInline: null,
      tableHeadingPosition: null,
      tableHeadingRuleColor: null,
      tableHeadingText: null,
    },
    stylesheet: 'data-table/root/data-table-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const said = {
      fontFamily: token('font-sans'),
      fontSize: token('text-sm'),
      margin: token('space-none'),
      paddingBlock: token('space-md'),
      paddingInline: token('space-sm'),
      textAlign: 'center',
    } as const
    const gutter = own.dataTableGutter
    const leadBox = {
      alignItems: 'center',
      borderBlockEnd: [token('border-thin'), 'solid', hook.ruleColor],
      display: 'flex',
      justifyContent: 'center',
      paddingBlock: hook.paddingBlock,
      paddingInline: first(hook.paddingInline, token('space-sm')),
    } as const
    const heldHead = {
      backgroundColor: hook.headingBackgroundColor,
      insetBlockStart: 0,
      position: 'sticky',
      zIndex: token('layer-sticky'),
    } as const
    return [
      on('host', [
        rule({
          display: 'block',
          own: {
            collectionInsetBlock: token('space-md'),
            collectionInsetInline: token('space-sm'),
          },
        }),
      ]),
      on(['toolbar', 'table', 'footer'], [web([rule({ gridColumn: '1 / -1' })])]),
      on('table', [
        web([
          rule({
            animation: ['data-table-edges', 'linear', 'both'],
            animationTimeline: fn('scroll', 'self inline'),
            display: 'grid',
            gridTemplateColumns: first(
              hook.columns,
              measured('data-table-template', 'minmax(0, 1fr)'),
            ),
            inlineSize: '100%',
            maskImage: fn(
              'linear-gradient',
              own.dataTableFade,
              'transparent',
              ['#000', measured('_data-table-fade-start', '0rem')],
              ['#000', difference('100%', measured('_data-table-fade-end', '0rem'))],
              'transparent',
            ),
            overflowX: 'auto',
            own: { dataTableFade: 'to right' },
          }),
          rule({ dir: 'rtl' }, { own: { dataTableFade: 'to left' } }),
          rule({ reducedMotion: true }, { animation: 'none' }),
          rule(
            { windowed: true },
            { blockSize: hook.blockSize, overflowY: 'auto', overscrollBehavior: 'contain' },
          ),
          rule({ print: true }, { overflowX: 'visible' }),
          rule({ print: true, windowed: true }, { blockSize: 'auto', overflowY: 'visible' }),
        ]),
        native([rule({ windowed: true }, { blockSize: hook.blockSize })]),
        rule({ loading: true }, { opacity: token('opacity-busy') }),
      ]),
      on('head', [
        web([rule({ display: 'contents' })]),
        native([rule({ display: 'flex', flexDirection: 'row' })]),
      ]),
      on('head-box', [
        native([
          rule({ flexDirection: 'row' }),
          rule(
            { part: { 'data-pinned': true } },
            { backgroundColor: hook.headingBackgroundColor, zIndex: 1 },
          ),
        ]),
      ]),
      on('checkbox', [native([rule({ alignSelf: 'center' })])]),
      include(dataTableRows),
      on({ part: 'cell', selector: '[part~="cell"]' }, [
        web([rule({ textAlign: hook.cellAlign })]),
      ]),
      /* **Centered from top to bottom**, so a line of text beside a taller
         grip, tag or button sits on the row's middle rather than riding at its
         top. `align-content` rather than a flex box, which would make every
         text node an anonymous item and lose `text-align` above. A cell that
         wraps to the row's full height has no room to move, so long text still
         starts at the top. */
      on({ part: 'cell', selector: '[part~="cell"]' }, [
        web([rule({ alignContent: hook.cellBlockAlign })]),
      ]),
      /* **On the capitals, not on the line box.** A line centered as a box sits
         a pixel or two high to the eye. Trimmed to cap height, and held to a
         line's height as its least, the cell is as tall as it was and the
         capitals are what is centered, `border-box` so the line, the padding
         either side and the rule. Behind `@supports`, as `Avatar` does its
         initials: a browser without it centers the line box. */
      on({ part: 'cell', selector: '[part~="cell"]' }, [
        web([
          rule(
            { supports: '(text-box: trim-both cap alphabetic)' },
            {
              minBlockSize: sum('1lh', product(hook.paddingBlock, 2), token('border-thin')),
              textBox: 'trim-both cap alphabetic',
            },
          ),
        ]),
      ]),
      on({ part: 'row', selector: '[part~="row"] > *' }, [
        web([rule({ backgroundColor: hook.rowBackgroundColor })]),
      ]),
      on({ part: 'row', selector: ':host([row-link]) [part~="row"] > [part~="cell"]' }, [
        web([rule({ cursor: 'pointer' })]),
      ]),
      on(
        {
          part: 'row',
          selector: ':host([row-link]) [part~="row"]:not([aria-selected="true"]):hover > *',
        },
        [
          web([
            rule({
              backgroundColor: hook.rowHoverBackgroundColor,
            }),
          ]),
        ],
      ),
      on({ part: 'row', selector: '[part~="row"][aria-selected="true"] > *' }, [
        web([
          rule({
            backgroundColor: hook.selectedBackgroundColor,
          }),
        ]),
      ]),
      on('row-grip-button', [
        web([
          rule({
            all: 'unset',
            alignItems: 'center',
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
            color: hook.gripColor,
            cursor: 'grab',
            display: 'inline-flex',
            paddingBlock: token('space-2xs'),
            touchAction: 'none',
          }),
          rule({ active: true }, { cursor: 'grabbing' }),
        ]),
      ]),
      on({ part: 'row-grip-button', selector: '[part="row-grip-button"][aria-disabled="true"]' }, [
        web([
          rule({
            cursor: 'default',
            opacity: hook.gripDisabledOpacity,
          }),
        ]),
      ]),
      on('row-grip-mark', [web([rule({ blockSize: '1em', inlineSize: '1em' })])]),
      on({ part: 'row', selector: '[part~="row"][part~="row-dragging"] > *' }, [
        web([rule({ opacity: hook.draggingOpacity })]),
      ]),
      on({ part: 'row', selector: '[part~="row"][part~="row-drop-before"] > *' }, [
        web([
          rule({
            boxShadow: ['inset', 0, hook.dropIndicatorSize, 0, 0, hook.dropIndicatorColor],
          }),
        ]),
      ]),
      on({ part: 'row', selector: '[part~="row"][part~="row-drop-after"] > *' }, [
        web([
          rule({
            boxShadow: [
              'inset',
              0,
              product(hook.dropIndicatorSize, '-1'),
              0,
              0,
              hook.dropIndicatorColor,
            ],
          }),
        ]),
      ]),
      on({ slotted: 'helix-table-column' }, [
        web([
          rule({
            own: {
              tableHeadingColor: hook.headingColor,
              tableHeadingPaddingBlock: measured('data-table-padding-block'),
              tableHeadingPaddingInline: hook.paddingInline,
              tableHeadingRuleColor: measured('data-table-rule-color'),
              tableHeadingText: measured('data-table-text'),
            },
          }),
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
      on({ slotted: 'helix-table-column[sortable]' }, [web([rule({ cursor: 'pointer' })])]),
      /* Written out: a chosen row's checkbox cell holds two names. */
      on({ part: 'select', selector: '[part~="select"]' }, [web([rule(leadBox)])]),
      on(['select-all', 'grip-head'], [rule(leadBox), web([rule({ windowed: true }, heldHead)])]),
      on('row-grip', [web([rule(leadBox)])]),
      on({ part: 'grip-head', selector: '[part="grip-head"]::before' }, [
        web([rule({ content: '""', inlineSize: '1em' })]),
      ]),
      on(
        {
          part: 'select',
          selector: '[part~="row-last"] [part~="select"], [part~="row-last"] [part="row-grip"]',
        },
        [web([rule({ borderBlockEndColor: 'transparent' })])],
      ),
      on('toolbar', [
        rule({ paddingBlockEnd: hook.toolbarGap }),
        rule({ part: { 'data-empty': true } }, { display: 'none' }),
      ]),
      on('footer', [
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: hook.footerItemGap,
          paddingBlockStart: hook.footerGap,
        }),
        rule({ part: { 'data-empty': true } }, { display: 'none' }),
        web([
          rule(
            { part: { 'data-held': true } },
            {
              minBlockSize: sum(
                first(measured('pagination-size'), token('size-control-tight')),
                hook.footerGap,
              ),
            },
          ),
          rule({ print: true }, { display: 'none' }),
        ]),
      ]),
      on('pagination', [rule({ marginInlineStart: 'auto' })]),
      on({ part: 'pagination', selector: '[part="footer"][data-held] [part="pagination"]' }, [
        web([rule({ visibility: 'hidden' })]),
      ]),
      on(
        ['empty', 'loading'],
        [
          web([rule({ gridColumn: '1 / -1' })]),
          native([rule({ ...said, color: token('color-foreground-muted') })]),
        ],
      ),
      on('error', [rule({ ...said, color: hook.errorColor, web: { gridColumn: '1 / -1' } })]),
      /* Written out: a row header holds two names, and steps in by its depth. */
      on({ part: 'cell', selector: ':host([child-field]) [part~="cell-header"]' }, [
        web([
          rule({
            own: {
              dataTableDepth: product(
                difference(measured('data-table-level'), '1'),
                first(hook.indent, gutter),
              ),
              dataTableGutter: sum(hook.toggleSize, hook.toggleGap),
            },
            paddingInlineStart: own.dataTableDepth,
          }),
        ]),
      ]),
      on(
        {
          part: 'cell',
          selector: ':host([child-field]) [part~="cell-header"]:not(:has([part~="toggle"]))',
        },
        [web([rule({ paddingInlineStart: sum(own.dataTableDepth, gutter) })])],
      ),
      on({ part: 'toggle', selector: '[part~="toggle"]' }, [
        web([
          rule({
            alignItems: 'center',
            background: 'none',
            blockSize: hook.toggleSize,
            border: 'none',
            color: hook.toggleColor,
            cursor: 'pointer',
            display: 'inline-flex',
            inlineSize: hook.toggleSize,
            justifyContent: 'center',
            marginInlineEnd: hook.toggleGap,
            padding: token('space-none'),
            verticalAlign: 'middle',
          }),
        ]),
      ]),
      on('more-cell', [
        rule({
          display: 'flex',
          flexDirection: 'row',
          paddingBlock: hook.paddingBlock,
          web: { gridColumn: '1 / -1' },
        }),
      ]),
      on('more-button', [
        rule({
          backgroundColor: 'transparent',
          border: [token('border-thin'), 'solid', hook.moreBorderColor],
          borderRadius: hook.moreRadius,
          paddingBlock: hook.morePaddingBlock,
          paddingInline: hook.morePaddingInline,
          color: hook.color,
          fontFamily: token('font-sans'),
          fontSize: hook.text,
          web: { cursor: 'pointer' },
        }),
        rule({ hover: true }, { backgroundColor: hook.moreHoverBackgroundColor }),
      ]),
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
