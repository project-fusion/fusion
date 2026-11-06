import { first, fn, inherited, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * A list row's styled tier.
 *
 * **One line of five tracks: the rail, the leading content, the body, the
 * trailing content, and the grip.** The body holds the label and the
 * description under it, so the description lines up under the label and
 * never under the leading icon.
 *
 * **An empty region costs nothing.** Its slot is a box with nothing in it, so
 * the space a leading icon keeps after itself is the icon's, and a row with no
 * icon has none.
 *
 * **A row that goes somewhere, or that a reader chooses, answers the
 * pointer**: the hover fill under it, the press fill while it is held, and
 * one ring inside it for the keyboard. The link covers the whole row, so the
 * row is the target, and what is passed into `end` stands above it as a
 * control of its own. A reader's row and a chosen row take the selected wash.
 */
export default styles(
  item,
  {
    prefix: 'list-item',
    hooks: ({ own }) => ({
      currentBackgroundColor: token('color-selected'),
      disabledOpacity: token('opacity-disabled'),
      draggingOpacity: 0.5,
      dropIndicatorColor: token('color-primary'),
      dropIndicatorSize: token('border-thick'),
      gripColor: token('color-foreground-muted'),
      hoverBackgroundColor: token('color-hover'),
      padding: [
        product(token('space-control'), '0.5'),
        first(own.listBleed, sum(token('space-field'), token('space-2xs'))),
      ],
      railContent: '""',
      railDisplay: 'none',
      selectedBackgroundColor: token('color-selected'),
      termWeight: token('weight-regular'),
    }),
    own: { listBleed: null },
    stylesheet: 'list/item/list-item.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      /* Out of reach, and drawn so: the platform's own disabled step. */
      rule({ has: 'disabled' }, { opacity: hook.disabledOpacity }),
    ]),
    /* The layout lives on the row and not on the host, so the host is free to
       be a `list-item` when the list asks for a marker. `auto` tracks, so a
       rail, an icon, or a grip a row does not have takes no space. */
    on('row', [
      rule({
        alignContent: 'center',
        alignItems: 'center',
        display: 'grid',
        /* `minmax(0, 1fr)` for the words, because a bare `1fr` cannot go under its
           content's min-content width: a code block in an item widened the row past
           its list. */
        gridTemplateColumns: 'auto auto minmax(0, 1fr) auto auto',
        /* The height of a control at this density, and two lines grow from it. */
        minBlockSize: token('size-control'),
        /* A long unbroken word breaks inside the column it was given. */
        minInlineSize: 0,
        padding: hook.padding,
        /* Out by the list's `bleed`, with the inset above the same amount, so
           the words stay on the list's edge and the fill reaches past it. None
           by default, where the inset is the row's own. */
        marginInline: product(own.listBleed(token('space-none')), '-1'),
        position: 'relative',
        web: {
          lineHeight: fn('round', 'up', product(token('text-sm'), token('leading-normal')), '1px'),
          overflowWrap: 'break-word',
        },
      }),
      /* A finger's target, and a step more, where the pointer is coarse. */
      rule(
        { coarsePointer: true },
        { minBlockSize: sum(token('size-target'), token('space-2xs')) },
      ),
      native([rule({ lineHeight: product(token('text-sm'), token('leading-normal')) })]),
      /* A phone's press on a row it chooses. */
      native([
        rule(
          { formDisabled: false, interaction: ['active'] },
          { backgroundColor: token('color-press'), borderRadius: token('radii-sm') },
        ),
      ]),
      /* The row a reader is on, by the part it is as well, `row-current`, which
         a property sets with no attribute. A chosen row keeps its own ground. */
      rule(
        { also: { 'row-current': true } },
        { backgroundColor: hook.currentBackgroundColor, borderRadius: token('radii-sm') },
      ),
      /* In a list with `selection-mode`, the row is the cell that takes focus, so
         the ring goes inside it, where the next row cannot cover it. */
      rule(
        { focusVisible: true },
        {
          borderRadius: token('radii-sm'),
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      rule(
        { selected: true },
        {
          backgroundColor: hook.selectedBackgroundColor,
          borderRadius: token('radii-sm'),
        },
      ),
      /* The row being moved, faded where it was, and the line where it would
         land: an inset shadow on the edge it goes past, which moves nothing
         around it. */
      rule({ dragging: true }, { opacity: hook.draggingOpacity }),
      rule(
        { dropBefore: true },
        {
          boxShadow: ['inset', 0, hook.dropIndicatorSize, 0, 0, hook.dropIndicatorColor],
        },
      ),
      rule(
        { dropAfter: true },
        {
          boxShadow: [
            'inset',
            0,
            product(hook.dropIndicatorSize, '-1'),
            0,
            0,
            hook.dropIndicatorColor,
          ],
        },
      ),
    ]),
    /* The rail: the ordinal, at the start edge of the block. **`display: none`
       and not an empty box**, until the list turns it on: an empty box is free
       to layout and not to a list's native marker, which aligns to the first
       line box it can see. **A width and not a `min-width`**, so `I` and `III`
       put their labels at one measure and the rail reads as a column. **At the
       top, against the row's centering**, so a label that wraps keeps its
       number on its first line. */
    on('rail', [
      rule({
        alignSelf: 'start',
        color: token('color-foreground-muted'),
        display: hook.railDisplay,
        fontFamily: token('font-mono'),
        fontSize: token('text-xs'),
        gridColumn: 1,
        gridRow: 1,
        letterSpacing: token('tracking-wide'),
        lineHeight: product(token('text-sm'), token('leading-normal')),
        inlineSize: inherited('list-rail-inline-size', token('space-3xl')),
      }),
    ]),
    /* Written by the list, which is the only thing that knows the ordinal. */
    on({ before: 'rail' }, [rule({ content: hook.railContent })]),
    /* The leading content, muted. **On the web the slot draws no box**, and
       what is passed in is the grid item: an empty box ahead of the body is a
       line box a list's native marker aligns to, and it put the marker on the
       middle of a row with no icon. A native view has no marker, and its box
       is drawn only around content. */
    on('start', [rule({ color: token('color-foreground-muted'), web: { display: 'contents' } })]),
    /* The gap after it is the content's, so a row with nothing there has
       none. A gap on the row would be drawn beside an empty track just the
       same. **The muted color stays on the slot**, where what is passed in
       inherits it: written on `::slotted(*)`, it beat a slotted component's own
       `:host` color and turned an avatar's initials muted. */
    on({ part: 'start', slotted: '*' }, [
      rule({
        /* The tight icon, a step under the words beside it. */
        '--icon-size': token('size-icon-tight'),
        gridColumn: 2,
        gridRow: '1 / span 2',
        marginInlineEnd: token('space-sm'),
      }),
    ]),
    /* **The label and the description are the row's two lines.** On the web
       the body spans both as a subgrid, so a leading or trailing item taller
       than the two shares its height out between them, as a row with no body
       does. A native view stacks them in a column. */
    on('body', [
      rule({
        alignItems: 'center',
        display: 'grid',
        gridColumn: 3,
        gridRow: '1 / span 2',
        gridTemplateRows: 'subgrid',
        minInlineSize: 0,
      }),
    ]),
    on(
      ['label', 'description'],
      [
        rule({ minInlineSize: 0 }),
        web([
          rule({ lineHeight: fn('round', 'up', product('1em', token('leading-normal')), '1px') }),
        ]),
      ],
    ),
    on('label', [
      rule({
        color: token('color-foreground'),
        display: 'block',
        fontSize: token('text-sm'),
        /* Set by the list at `kind="description"`, where the label is a term,
           and inherited, so the row needs to know nothing about its kind. */
        fontWeight: hook.termWeight,
      }),
    ]),
    on('description', [
      rule({
        color: token('color-foreground-muted'),
        display: 'block',
        fontSize: token('text-xs'),
      }),
    ]),
    /* Browsers give a paragraph passed in a margin, and a native view has
       none. */
    on({ part: ['label', 'description'], slotted: '*' }, [
      web([rule({ margin: token('space-none') })]),
    ]),
    on('end', [rule({ web: { display: 'contents' } })]),
    /* Above the link's cover, a control of its own. */
    on({ part: 'end', slotted: '*' }, [
      rule({ gridColumn: 4, gridRow: '1 / span 2', position: 'relative' }),
    ]),
    /* The link, when the row has somewhere to go, and it must not look like
       one. **It takes the row's first three tracks and both its lines as a
       subgrid**, so the rail, the leading content, and the body sit where they
       sit in a row with no link, and `end` keeps the fourth track outside it. */
    on('link', [
      rule({
        alignItems: 'center',
        color: 'inherit',
        display: 'grid',
        gridColumn: '1 / 4',
        gridRow: '1 / span 2',
        gridTemplateColumns: 'subgrid',
        gridTemplateRows: 'subgrid',
        textDecoration: 'none',
      }),
    ]),
    /* The link covers the whole row, so the row is its target, and its ring is the
       row's. */
    on({ before: 'link' }, [web([rule({ content: '""', inset: 0, position: 'absolute' })])]),
    on('link', [web([rule({ focusVisible: true }, { outline: 'none' })])]),
    /* Written out: the row holding a focused link, which the vocabulary has no `:has()` for. */
    on({ part: 'row', selector: '[part~="row"]:has([part="link"]:focus-visible)' }, [
      web([
        rule({
          borderRadius: token('radii-sm'),
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        }),
      ]),
    ]),
    /* Written out: a row that links somewhere, under the pointer and held. */
    on(
      {
        part: 'row',
        selector: '[part~="row"]:not([part~="row-current"]):has([part="link"][href]):hover',
      },
      [
        web([
          rule(
            { canHover: true },
            { backgroundColor: hook.hoverBackgroundColor, borderRadius: token('radii-sm') },
          ),
        ]),
      ],
    ),
    on(
      {
        part: 'row',
        selector: '[part~="row"]:not([part~="row-current"]):has([part="link"][href]):active',
      },
      [web([rule({ backgroundColor: token('color-press'), borderRadius: token('radii-sm') })])],
    ),
    /* Written out: a row a reader chooses, the cell that takes focus in a list with a
       `selection-mode`, under the pointer and held. */
    on(
      {
        part: 'row',
        selector: ':host(:not([disabled], :state(selected))) [part~="row"][role="gridcell"]:hover',
      },
      [
        web([
          rule(
            { canHover: true },
            { backgroundColor: hook.hoverBackgroundColor, borderRadius: token('radii-sm') },
          ),
        ]),
      ],
    ),
    on({ part: 'row', selector: ':host(:not([disabled])) [part~="row"][role="gridcell"]:active' }, [
      web([rule({ backgroundColor: token('color-press'), borderRadius: token('radii-sm') })]),
    ]),
    on({ part: 'row', selector: '[part~="row"][role="gridcell"]' }, [
      web([rule({ cursor: 'pointer' })]),
    ]),
    on({ part: 'row', selector: ':host([disabled]) [part~="row"][role="gridcell"]' }, [
      web([rule({ cursor: 'not-allowed' })]),
    ]),
    on({ part: 'link', selector: ':host([disabled]) [part="link"]' }, [
      web([rule({ cursor: 'not-allowed' })]),
    ]),
    /* A chosen row and the reader's row that links somewhere press darker, past their wash. */
    on(
      {
        part: 'row',
        selector: ':host(:state(selected):not([disabled])) [part~="row"][role="gridcell"]:active',
      },
      [web([rule({ backgroundColor: token('color-press') })])],
    ),
    on(
      {
        part: 'row',
        selector: ':host(:state(selected):not([disabled])) [part~="row"][role="gridcell"]:hover',
      },
      [web([rule({ canHover: true }, { backgroundColor: token('color-press') })])],
    ),
    on({ part: 'row', selector: '[part~="row-current"]:has([part="link"][href]):hover' }, [
      web([rule({ canHover: true }, { backgroundColor: token('color-press') })]),
    ]),
    on({ part: 'row', selector: '[part~="row-current"]:has([part="link"][href]):active' }, [
      web([rule({ backgroundColor: token('color-press') })]),
    ]),
    /* The grip, in a `reorderable` list: after `end`, quiet until held. */
    on('grip', [
      rule({
        web: { all: 'unset', cursor: 'grab', touchAction: 'none' },
        alignItems: 'center',
        borderRadius: token('radii-sm'),
        boxSizing: 'border-box',
        color: hook.gripColor,
        /* Room above and below the mark, so the mark stays under three quarters of the
           button's height. Along the row it stays the mark's width. */
        paddingBlock: token('space-2xs'),
        display: 'inline-flex',
        gridColumn: 5,
        gridRow: '1 / span 2',
        marginInlineStart: token('space-sm'),
        /* Above the link's cover, a control of its own. */
        position: 'relative',
        /* So a drag on a phone moves the row and does not scroll the page. */
      }),
      rule({ active: true }, { web: { cursor: 'grabbing' } }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on('grip-mark', [rule({ blockSize: '1em', inlineSize: '1em' })]),
  ],
)
