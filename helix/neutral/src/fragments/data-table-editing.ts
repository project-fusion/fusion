import { difference, measured, mix, product, quotient, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * What a Data Table draws on the web for a search's matches, its pinned columns,
 * and the cells a reader edits in place. A phone pins, matches, and edits nothing.
 *
 * - **A search's matches** are painted by the Custom Highlight API. A highlight
 *   takes its look from the tree its text is in, and a cell is in the table's
 *   shadow root, so the rule in `base.css` does not reach it: the same look here.
 * - **A pinned column's cells stay at their end of the row** while the grid
 *   scrolls sideways, on the page's ground, so the cells passing under them do
 *   not show through.
 * - **An editable cell draws nothing of its own at rest** until the pointer is
 *   on it, when it takes a well and a text cursor. Open, it holds the inline
 *   field, which rings itself inside the cell, so the row stays a control's
 *   height. A cell that is its field keeps no padding of its own, and the
 *   field's inset is taken back with a margin, so its words line up with the
 *   heading and the cells around it. Round dots under each value, a step quieter
 *   than the subtle foreground, say it can be edited.
 * - **Open, a field that needs more than its column**, a date with its calendar,
 *   grows over the cell beside it, and the cell stops counting for its column's
 *   width, so the column does not move.
 * - **A refused value's message** stands under the cell, over the rows below it;
 *   a saving cell turns a ring at its start, its words for a screen reader; and
 *   an unsaved change under `batch-edits` takes a wash and a mark in its corner,
 *   so it reads without its color too.
 *
 * Written out, and the web's: a cell carries several names, and one wins by
 * what follows it.
 */
export default fragment(
  'data-table-editing',
  {
    parts: [
      'cell',
      'cell-message',
      'cell-saving-mark',
      'edits',
      'edits-discard',
      'edits-save',
      'editor',
    ],
    hooks: {
      cellAlign: null,
      editableHoverBackgroundColor: null,
      editingBackgroundColor: null,
      messageBorderColor: null,
      messageBorderWidth: null,
      messageShadow: null,
      pinnedBackgroundColor: null,
      unsavedBackgroundColor: null,
    },
  },
  ({ hook, keyframes, on, rule }) => [
    on({ part: 'cell', selector: '::highlight(helix-filter-match)' }, [
      web([
        rule({
          backgroundColor: 'transparent',
          color: token('color-foreground'),
          textDecorationColor: token('color-primary'),
          textDecorationLine: 'underline',
          textDecorationThickness: token('border-thick'),
          textUnderlineOffset: '0.2em',
        }),
      ]),
    ]),
    on({ part: 'cell', selector: '[part~="cell-pinned-start"], [part~="cell-pinned-end"]' }, [
      web([
        rule({
          backgroundColor: hook.pinnedBackgroundColor(token('color-background')),
          position: 'sticky',
          zIndex: 1,
        }),
      ]),
    ]),
    on({ part: 'cell', selector: '[part~="cell-pinned-start"]' }, [
      web([rule({ insetInlineStart: measured('data-table-pin-offset', '0px') })]),
    ]),
    on({ part: 'cell', selector: '[part~="cell-pinned-end"]' }, [
      web([rule({ insetInlineEnd: measured('data-table-pin-offset', '0px') })]),
    ]),
    on({ part: 'cell', selector: '[part~="cell-editable"]' }, [
      web([rule({ position: 'relative' })]),
    ]),
    /* A cell that draws no field at rest, because its column draws its own
       `cell` or `editor`, takes the well and the cursor itself. */
    on(
      {
        part: 'cell',
        selector:
          '[part~="cell-editable"]:not([part~="cell-field"], [part~="cell-editing"], [part~="cell-boolean"]):hover',
      },
      [
        web([
          rule({
            backgroundColor: hook.editableHoverBackgroundColor(token('color-well')),
            cursor: 'text',
          }),
        ]),
      ],
    ),
    on(
      {
        part: 'cell',
        selector:
          '[part~="cell-editable"]:not([part~="cell-field"], [part~="cell-editing"], [part~="cell-boolean"])',
      },
      [
        web([
          rule(
            { coarsePointer: true },
            {
              textDecoration: ['underline', 'dotted', token('color-foreground-subtle')],
              textUnderlineOffset: '0.25em',
            },
          ),
        ]),
      ],
    ),
    on({ part: 'cell', selector: '[part~="cell-field"]' }, [web([rule({ paddingBlock: 0 })])]),
    /* A checkbox is a box in a line, so it sits on the row's middle. */
    on({ part: 'cell', selector: '[part~="cell-boolean"]' }, [
      web([rule({ alignItems: 'center', display: 'flex' })]),
    ]),
    on('editor', [
      web([
        rule({
          '--input-ghost-underline': mix(token('color-foreground-subtle'), 60, 'transparent'),
          '--number-input-ghost-underline': mix(
            token('color-foreground-subtle'),
            60,
            'transparent',
          ),
          '--date-input-ghost-underline': mix(token('color-foreground-subtle'), 60, 'transparent'),
          '--select-ghost-underline': mix(token('color-foreground-subtle'), 60, 'transparent'),
          /* The value at its column's edge, which the table writes on each cell. */
          '--input-ghost-align': hook.cellAlign('start'),
          '--number-input-ghost-align': hook.cellAlign('start'),
          '--date-input-ghost-align': hook.cellAlign('start'),
          '--select-ghost-align': hook.cellAlign('start'),
          inlineSize: sum('100%', product(token('space-xs'), 2)),
          marginInline: product(token('space-xs'), '-1'),
          /* A control's tight step, centered in the row, so an active field
             sits inside its cell with room above and below it. */
          '--input-size': token('size-control-tight'),
          '--number-input-size': token('size-control-tight'),
          '--date-input-size': token('size-control-tight'),
        }),
      ]),
    ]),
    on({ part: 'cell', selector: '[part~="cell-editing"]' }, [
      web([rule({ contain: 'inline-size', paddingBlock: 0, zIndex: 1 })]),
    ]),
    on({ part: 'editor', selector: '[part~="cell-editing"] > [part="editor"]' }, [
      web([rule({ backgroundColor: hook.editingBackgroundColor(token('color-background')) })]),
    ]),
    on({ part: 'editor', selector: '[part~="cell-editing"] > [part="editor"][data-type="date"]' }, [
      web([rule({ minInlineSize: '8.5rem' })]),
    ]),
    /* A refused value: the message under the cell, over the rows below it. */
    on('cell-message', [
      web([
        rule({
          backgroundColor: token('color-surface-raised'),
          border: [
            hook.messageBorderWidth(token('border-floating')),
            'solid',
            hook.messageBorderColor(token('color-danger')),
          ],
          borderRadius: token('radii-sm'),
          boxShadow: hook.messageShadow(token('shadow-floating')),
          color: token('color-foreground'),
          fontSize: token('text-sm'),
          inlineSize: 'max-content',
          insetBlockStart: sum('100%', token('space-2xs')),
          insetInlineEnd: 0,
          maxInlineSize: '16rem',
          padding: [token('space-xs'), token('space-sm')],
          position: 'absolute',
          textAlign: 'start',
          zIndex: token('layer-raised'),
        }),
      ]),
    ]),
    /* Saving: a turning ring at the start of the cell, its words for a screen reader. */
    on('cell-saving-mark', [
      web([
        rule({
          animation: ['data-table-saving', token('duration-crawl'), 'linear', 'infinite'],
          blockSize: token('size-icon-sm'),
          border: [token('border-thick'), 'solid', token('color-primary')],
          borderInlineEndColor: 'transparent',
          borderRadius: token('radii-full'),
          color: 'transparent',
          fontSize: 0,
          inlineSize: token('size-icon-sm'),
          insetBlockStart: difference('50%', quotient(token('size-icon-sm'), 2)),
          insetInlineStart: token('space-2xs'),
          overflow: 'hidden',
          position: 'absolute',
        }),
        rule({ reducedMotion: true }, { animation: 'none' }),
      ]),
    ]),
    keyframes('data-table-saving', { to: { rotate: '1turn' } }),
    on({ part: 'cell', selector: '[part~="cell-saving"]' }, [
      web([rule({ color: token('color-foreground-muted') })]),
    ]),
    /* An unsaved change, under `batch-edits`: a wash of the primary and a mark
       in the corner, so the change reads without its color too. */
    on({ part: 'cell', selector: '[part~="cell-unsaved"]' }, [
      web([rule({ backgroundColor: hook.unsavedBackgroundColor(token('color-primary-subtle')) })]),
    ]),
    on({ part: 'cell', selector: '[part~="cell-unsaved"]::after' }, [
      web([
        rule({
          borderBlockStart: [token('space-xs'), 'solid', token('color-primary')],
          borderInlineStart: [token('space-xs'), 'solid', 'transparent'],
          content: '""',
          insetBlockStart: 0,
          insetInlineEnd: 0,
          position: 'absolute',
        }),
      ]),
    ]),
    on({ part: 'cell', selector: '[part~="cell-unsaved"]:not([part~="cell-editable"])' }, [
      web([rule({ position: 'relative' })]),
    ]),
    on('edits', [
      web([
        rule({
          alignItems: 'center',
          color: token('color-foreground-muted'),
          display: 'flex',
          flexWrap: 'wrap',
          fontSize: token('text-sm'),
          gap: token('space-sm'),
          gridColumn: '1 / -1',
          paddingBlock: token('space-sm'),
        }),
      ]),
    ]),
    on(
      ['edits-save', 'edits-discard'],
      [
        web([
          rule({
            all: 'unset',
            boxSizing: 'border-box',
            borderRadius: token('radii-sm'),
            color: token('color-primary'),
            cursor: 'pointer',
            fontWeight: token('weight-medium'),
          }),
        ]),
      ],
    ),
    on('edits-discard', [web([rule({ color: token('color-foreground-muted') })])]),
    on(
      ['edits-save', 'edits-discard'],
      [
        web([
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ]),
      ],
    ),
  ],
)
