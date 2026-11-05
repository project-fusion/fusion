import { first, product, sum, token, web } from '../style.js'
import { fragment } from '../table.js'

/**
 * A table's rows on the web, each a row of cells in one grid and no box of its
 * own, so what a row looks like is drawn across its cells: a chosen row's wash,
 * the rule between rows, a row's grip, and the line where a moved row would land.
 * A phone's rows are `TableRow`s, in Table's rules.
 */
export default fragment(
  'data-table-rows',
  {
    parts: [
      'after',
      'before',
      'cell',
      'more',
      'more-cell',
      'row',
      'row-grip',
      'select',
      'select-all',
      'table',
      'toggle-mark',
    ],
    hooks: {
      cellBlockAlign: 'center',
      color: token('color-foreground'),
      paddingBlock: token('space-sm'),
      paddingInline: null,
      ruleColor: token('color-border'),
      text: token('text-control'),
    },
  },
  ({ hook, keyframes, on, rule }) => {
    return [
      /* Written out: a row carries several names, and one wins by what follows it. */
      on({ part: 'row', selector: '[part~="row"]' }, [web([rule({ display: 'contents' })])]),
      on({ part: 'cell', selector: '[part~="cell"]' }, [
        web([
          rule({
            borderBlockEnd: [token('border-thin'), 'solid', hook.ruleColor],
            color: hook.color,
            fontFamily: token('font-sans'),
            fontSize: hook.text,
            fontVariantNumeric: 'tabular-nums',
            paddingBlock: hook.paddingBlock,
            paddingInline: first(hook.paddingInline, [token('space-none'), token('space-md')]),
          }),
        ]),
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
      /* Written out: the last column ends on the rule, and the page's last row has none. */
      on({ part: 'cell', selector: '[part~="cell"]:last-child' }, [
        web([
          rule({
            paddingInline: first(hook.paddingInline, token('space-none')),
          }),
        ]),
      ]),
      on({ part: 'cell', selector: '[part~="row-last"] [part~="cell"]' }, [
        web([rule({ borderBlockEndColor: 'transparent' })]),
      ]),
      /* Written out: the ring is on a cell whichever names it holds. */
      on(
        {
          part: 'cell',
          selector:
            '[part~="cell"]:focus-visible, [part="more-cell"]:focus-visible, [part~="select"]:focus-visible, [part="select-all"]:focus-visible, [part="row-grip"]:focus-visible, [part="grip-head"]:focus-visible',
        },
        [
          web([
            rule({
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            }),
          ]),
        ],
      ),
      /* Written out: before the table upgrades `helix.css` draws on the host's own
         pseudo-elements, and only an important rule here wins that back. */
      on(
        { part: 'table', selector: ':host(:not(:defined))::before, :host(:not(:defined))::after' },
        [web([rule({ content: 'none !important' })])],
      ),
      on('toggle-mark', [web([rule({ blockSize: '100%', inlineSize: '100%' })])]),
      on('more', [web([rule({ display: 'contents' })])]),
      on(['before', 'after'], [web([rule({ gridColumn: '1 / -1' })])]),
      keyframes('data-table-edges', {
        '0%': { '--_data-table-fade-end': token('space-xl'), '--_data-table-fade-start': '0rem' },
        '5%, 95%': {
          '--_data-table-fade-end': token('space-xl'),
          '--_data-table-fade-start': token('space-xl'),
        },
        '100%': { '--_data-table-fade-end': '0rem', '--_data-table-fade-start': token('space-xl') },
      }),
    ]
  },
)
