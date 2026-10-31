import { difference, measured, mix, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import row from './headless.js'

/**
 * One row of a table, in its styled tier.
 *
 * **The row generates no box on the web**, so its cells become items of the
 * table's grid, and everything a row looks like is drawn across its cells: the
 * wash of a chosen row, the dimming of a disabled one, and the line where a moved
 * row would land. A phone's row is a line of boxes, and each box takes the same
 * treatment.
 *
 * **The cells the row draws are a cell's box**, the rule under it included.
 *
 * **The disclosure cell's start is inset by the row's depth**, so a row sits
 * under the one it belongs to.
 *
 * **A grip is quiet until a pointer holds it**, and `touch-action: none` lets a
 * drag on a phone's browser move the row and leave the page.
 *
 * **The line where a moved row would land is an inset shadow** on the edge it
 * goes past, which moves nothing around it.
 */
export default styles(
  row,
  {
    prefix: 'table',
    hooks: {
      draggingOpacity: 0.5,
      dropIndicatorColor: token('color-primary'),
      dropIndicatorSize: token('border-thick'),
      expandColor: token('color-foreground-muted'),
      gripColor: token('color-foreground-muted'),
      gripDisabledOpacity: 0.4,
      headingBackgroundColor: token('color-background'),
      indent: token('space-lg'),
      rowDisabledOpacity: 0.5,
      rowHoverBackgroundColor: mix(token('color-foreground'), 5, 'transparent'),
    },
    stylesheet: 'table/row/table-row.generated.css',
  },
  ({ hook, on, rule }) => {
    const wash = mix(token('color-primary'), 10, token('color-background'), 'srgb')
    const ring = [
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
    ]
    const lifted = [
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]
    const cell = {
      alignItems: 'center',
      borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
      boxSizing: 'border-box',
      display: 'flex',
      minBlockSize: token('size-control'),
    } as const
    const dragged = [rule({ dragging: true }, { opacity: hook.draggingOpacity })]
    const before = ['inset', '0', hook.dropIndicatorSize, '0', '0', hook.dropIndicatorColor]
    const after = [
      'inset',
      '0',
      product(hook.dropIndicatorSize, '-1'),
      '0',
      '0',
      hook.dropIndicatorColor,
    ]
    const landing = [
      rule({ dropBefore: true }, { boxShadow: before }),
      rule({ dropAfter: true }, { boxShadow: after }),
    ]
    const chosen = [rule({ selected: true }, { backgroundColor: wash })]
    const dimmed = [rule({ disabled: true }, { opacity: hook.rowDisabledOpacity })]
    return [
      on('host', [
        web([rule({ display: 'contents' })]),
        native([rule({ display: 'flex', flexDirection: 'row' })]),
      ]),
      on('select', [
        rule({
          ...cell,
          paddingInline: [token('space-none'), token('space-md')],
        }),
        ...chosen,
        ...dimmed,
        ...dragged,
        ...landing,
        web(ring),
      ]),
      on('expand', [
        rule({
          ...cell,
          paddingInline: [
            product(difference(measured('table-row-level', 1), 1), hook.indent),
            token('space-xs'),
          ],
        }),
        ...chosen,
        ...dimmed,
        ...dragged,
        ...landing,
        web(ring),
      ]),
      on('grip', [
        rule({
          ...cell,
          paddingInline: [token('space-2xs'), token('space-sm')],
        }),
        ...dragged,
        ...landing,
        web(ring),
      ]),
      on('expand-button', [
        rule({
          web: { all: 'unset', cursor: 'pointer' },
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: hook.expandColor,
          display: 'inline-flex',
          justifyContent: 'center',
        }),
        web([rule({ hover: true }, { color: token('color-foreground') })]),
        web(lifted),
      ]),
      on('expand-mark', [
        rule({
          blockSize: '1em',
          inlineSize: '1em',
          transition: ['rotate', token('duration-fast'), token('easing-standard')],
        }),
        rule({ expanded: true }, { rotate: '90deg' }),
      ]),
      on('grip-button', [
        rule({
          web: { all: 'unset', cursor: 'grab', touchAction: 'none' },
          alignItems: 'center',
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: hook.gripColor,
          display: 'inline-flex',
        }),
        web([rule({ active: true }, { cursor: 'grabbing' })]),
        web(lifted),
        native([rule({ part: { 'data-still': true } }, { opacity: hook.gripDisabledOpacity })]),
      ]),
      /* Written out: a sort decides the order, so the grip does nothing and says so. */
      on({ part: 'grip-button', selector: '[part="grip-button"][aria-disabled="true"]' }, [
        web([rule({ cursor: 'default', opacity: hook.gripDisabledOpacity })]),
      ]),
      on('grip-mark', [rule({ blockSize: '1em', inlineSize: '1em' })]),
      /* What a phone's row draws around each cell. */
      /* A phone's checkbox stands at its own height, in the middle of the cell. */
      on('checkbox', [native([rule({ alignSelf: 'center' })])]),
      on('cell-box', [
        native([
          rule({ flexDirection: 'row' }),
          /* The first column stays as the rest pass under it. */
          rule(
            { part: { 'data-pinned': true } },
            { backgroundColor: hook.headingBackgroundColor, zIndex: 1 },
          ),
          ...chosen,
          ...dimmed,
          ...dragged,
          ...landing,
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: product(token('size-focus-offset'), '-1'),
            },
          ),
        ]),
      ]),
      /* Written out: the row has no box, and a pointer on any of its cells has it
         hovered, so the wash is across the whole row. */
      on({ part: 'grip', selector: ':host(:state(link):hover) ::slotted(*)' }, [
        web([rule({ backgroundColor: hook.rowHoverBackgroundColor })]),
      ]),
      on({ region: 'default', slotted: '*' }, [
        web([
          rule({ selected: true }, { backgroundColor: wash }),
          rule({ has: 'disabled' }, { opacity: hook.rowDisabledOpacity }),
          rule({ link: true }, { cursor: 'pointer' }),
          ...dragged,
          ...landing,
        ]),
      ]),
    ]
  },
)
