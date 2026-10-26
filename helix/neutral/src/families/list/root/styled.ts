import printEconomy from '../../../fragments/print-economy.js'
import { oneOf } from '../../../render.js'
import { fn, inherited, token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * A list's styled tier, which writes `helix/styled/src/list/root/list-root.generated.css`.
 *
 * **The numbers are counters, and the list's.** A row cannot count itself, so
 * the list increments a counter on each row and sets it on the first, which is
 * how `start` and `reversed` move it. A browser draws an ordered list's marker
 * from the `list-item` counter and the rail's number from `list-rail`, and a
 * native view runs the same counters over its rows.
 */
export default styles(
  root,
  {
    prefix: 'list',
    hooks: {
      dragPreviewBackgroundColor: token('color-surface-raised'),
      dragPreviewBorderColor: token('color-border'),
      dragPreviewBorderWidth: token('border-floating'),
      dragPreviewOpacity: 0.9,
      dragPreviewRadius: token('radii-sm'),
      dragPreviewShadow: token('shadow-floating'),
      emptyColor: token('color-foreground-muted'),
      emptyPadding: token('space-md'),
      gap: token('space-none'),
      loadingColor: token('color-foreground-muted'),
      loadingPadding: token('space-sm'),
      markerGutter: token('space-md'),
    },
    props: { divided: false, marker: oneOf(['rail']) },
    stylesheet: 'list/root/list-root.generated.css',
  },
  ({ hook, include, on, rule, variants }) => [
    on('host', [
      rule({ display: 'flex', flexDirection: 'column', gap: hook.gap }),
      /* The markers. **`outside`, with a gutter of our own for it to hang into.**
         Never `inside`: an inside marker is the first inline box in the row, and
         the next thing there is the row's block-level grid. **Its own count,
         wherever the page puts it**: a size container above would otherwise own
         the `list-item` counter, so the list contains style. Wide enough for a
         two-digit marker and no wider. */
      rule([{ kind: 'ordered' }, { kind: 'unordered' }], {
        web: { contain: 'style' },
        paddingInlineStart: hook.markerGutter,
      }),
      /* The rail: the same numbering, at the start edge of the block, where a
         native marker cannot be moved. */
      rule(
        { marker: 'rail' },
        {
          counterReset: 'list-rail',
          /* Nothing to hang into: the number is inside the row now. */
          paddingInlineStart: token('space-none'),
        },
      ),
    ]),
    /* Between rows and not around them, so the first and last edges stay open
       and the list reads as one object. */
    on({ slotted: '*' }, [
      rule(
        { child: 'later', divided: true },
        { borderBlockStart: [token('border-thin'), 'solid', token('color-border')] },
      ),
      rule([{ kind: 'ordered' }, { kind: 'unordered' }], {
        display: 'list-item',
        listStylePosition: 'outside',
      }),
      rule({ kind: 'ordered' }, { listStyleType: 'decimal' }),
      /* Which glyphs an ordered list uses. `1` needs no rule, being what the
         rule above already says. */
      rule({ kind: 'ordered', type: 'a' }, { listStyleType: 'lower-alpha' }),
      rule({ kind: 'ordered', type: 'A' }, { listStyleType: 'upper-alpha' }),
      rule({ kind: 'ordered', type: 'i' }, { listStyleType: 'lower-roman' }),
      rule({ kind: 'ordered', type: 'I' }, { listStyleType: 'upper-roman' }),
      variants('kind', {
        unordered: { listStyleType: 'disc' },
        /* Where an ordered list starts and which way it runs. The list writes
           `--list-first` and `--list-step` where `start` or `reversed` asks, and the
           rows inherit both. A counter is incremented before it is set, so the first
           row reads `--list-first`; unset, the set is no declaration at all, and the
           count is the ordinary one. */
        ordered: { counterIncrement: ['list-item', inherited('list-step', 1)] },
      }),
      rule(
        { child: 'first', kind: 'ordered' },
        { counterSet: ['list-item', inherited('list-first')] },
      ),
      /* The two things a row cannot work out for itself: that there is a rail at
         all, and what number this row is. */
      rule(
        { marker: 'rail' },
        {
          '--list-item-rail-content': fn(
            'counter',
            'list-rail',
            inherited('list-rail-style', 'decimal-leading-zero'),
          ),
          '--list-item-rail-display': 'block',
          counterIncrement: ['list-rail', inherited('list-step', 1)],
        },
      ),
      rule(
        { child: 'first', marker: 'rail' },
        { counterSet: ['list-rail', inherited('list-first')] },
      ),
      /* The marker goes when the rail arrives. */
      rule(
        [
          { kind: 'ordered', marker: 'rail' },
          { kind: 'unordered', marker: 'rail' },
        ],
        { display: 'block', listStyle: 'none' },
      ),
      /* A term and what it means. */
      rule({ kind: 'description' }, { '--list-item-term-weight': token('weight-semibold') }),
    ]),
    /* The row shown while the list has no rows: quiet, and centered, so it
       reads as the list's own state and not as a row of yours. */
    on('empty', [
      rule({
        color: hook.emptyColor,
        fontSize: token('text-sm'),
        padding: hook.emptyPadding,
        textAlign: 'center',
      }),
      rule({ hidden: true }, { display: 'none' }),
    ]),
    /* The row after the last while more are fetched, quiet in the same way. */
    on('loading', [
      rule({
        color: hook.loadingColor,
        fontSize: token('text-sm'),
        padding: hook.loadingPadding,
        textAlign: 'center',
      }),
    ]),
    /* The copy of a row a pointer drags, raised over the page while the row
       stays in place, faded. It has no transition, so it follows the pointer
       with nothing animated. */
    on('drag-preview', [
      rule({
        backgroundColor: hook.dragPreviewBackgroundColor,
        border: [hook.dragPreviewBorderWidth, 'solid', hook.dragPreviewBorderColor],
        borderRadius: hook.dragPreviewRadius,
        boxShadow: hook.dragPreviewShadow,
        opacity: hook.dragPreviewOpacity,
      }),
    ]),
    include(printEconomy),
  ],
)
