import { difference, fit, fn, native, product, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import item from './headless.js'

/**
 * An accordion section's styled tier.
 *
 * **The section opens to its content's own height.** The web moves the
 * content's one grid row from `0fr` to `1fr`, which reaches the height
 * without measuring it, and a phone measures what the content holds and
 * moves to that height. The motion is off under reduced motion on both.
 *
 * **The chevron turns rather than changing glyph**: opening is a short
 * movement, not a substitution. At the end of the row it is found once at
 * the edge, and every summary starts at the same place.
 *
 * **The content's padding is inside the part that clips**, so a closed
 * section leaves no band of space under its trigger. With the chevron at the
 * start, the content lines up with the summary's words, past the chevron.
 *
 * **The focus ring is inset**, since the trigger runs to the section's edge
 * and an outlined accordion clips what stands outside it.
 */
export default styles(
  item,
  {
    prefix: 'accordion-item',
    hooks: {
      chevronColor: token('color-foreground-muted'),
      chevronHoverColor: token('color-foreground'),
      color: token('color-foreground'),
      contentColor: token('color-foreground-muted'),
      disabledOpacity: token('opacity-disabled'),
      fontSize: token('text-md'),
      fontWeight: token('weight-medium'),
      hoverBackgroundColor: token('color-hover'),
      padding: null,
    },
    own: { accordionPad: null },
    stylesheet: 'accordion/item/accordion-item.generated.css',
  },
  ({ hook, on, own, rule }) => {
    /* Where the chevron stands, how it turns, and its color under the pointer. */
    const inset = sum(token('space-field'), token('space-2xs'))
    const tight = token('size-icon-tight')
    const placed = [
      /* At the end, on the line a field's chevron ends on: the field inset
         and its edge from the trailing side. */
      rule(
        { chevronPlacement: { not: 'start' } },
        {
          marginInlineEnd: difference(token('border-thin'), token('space-2xs')),
          marginInlineStart: 'auto',
        },
      ),
      /* Turned, as Tree's and Megamenu's are, so it never passes through a
         flat line on its way over. A phone turns from a written start. */
      native([rule({ rotate: '0deg' })]),
      rule({ open: true }, { rotate: '180deg' }),
      rule({ within: { trigger: { hover: true } } }, { color: hook.chevronHoverColor }),
    ]
    /* Centered on the first line, from the top of the row it shares with
       the summary. */
    const firstLine = web([
      rule({ marginBlockStart: fn('round', 'down', quotient(difference('1lh', tight), 2), '1px') }),
    ])
    return [
      on('host', [
        rule({ display: 'block' }),
        /* The block inset is a whole pixel, and never more than centers one
           line in the row. A phone has no `round()` or `lh`. */
        web([
          rule({
            own: {
              accordionPad: fn(
                'round',
                'down',
                fn(
                  'min',
                  product(token('space-control'), 0.5),
                  quotient(difference(token('size-control'), '1lh'), 2),
                ),
                '1px',
              ),
            },
          }),
        ]),
        native([rule({ own: { accordionPad: product(token('space-control'), 0.5) } })]),
      ]),
      on('trigger', [
        rule({
          web: { all: 'unset', cursor: 'pointer', overflowWrap: 'anywhere' },
          position: 'relative',
          boxSizing: 'border-box',
          color: hook.color,
          fontSize: hook.fontSize,
          fontWeight: hook.fontWeight,
          inlineSize: '100%',
          minBlockSize: token('size-control'),
          /* A long unbroken word breaks inside the column it was given. */
          minInlineSize: 0,
          /* The inline inset steps with density, as a List row's. */
          padding: hook.padding([own.accordionPad, inset]),
          transition: ['background-color', token('duration-fast'), token('easing-standard')],
        }),
        /* A grid of one row with each item at its top, so the chevron stays
           on the summary's first line. A phone centers them in a row. */
        web([
          rule({
            alignContent: 'center',
            alignItems: 'start',
            columnGap: token('space-xs'),
            display: 'grid',
            gridAutoFlow: 'column',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
          }),
          rule({ chevronPlacement: 'start' }, { gridTemplateColumns: 'auto minmax(0, 1fr)' }),
          rule({ chevronPlacement: 'none' }, { gridTemplateColumns: 'minmax(0, 1fr)' }),
        ]),
        native([rule({ alignItems: 'center', display: 'flex', gap: token('space-xs') })]),
        /* The row's hover wash, as a menu row, a tree row and a tab take. */
        rule({ hover: true, lacks: 'disabled' }, { backgroundColor: hook.hoverBackgroundColor }),
        /* Disabled alone, and not the open section under `single`, which is
           `aria-disabled` and still looks like the others. */
        rule(
          { has: 'disabled' },
          { web: { cursor: 'not-allowed' }, opacity: hook.disabledOpacity },
        ),
        rule(
          { focusVisible: true },
          {
            borderRadius: token('radii-sm'),
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        rule({ active: true, lacks: 'disabled' }, { backgroundColor: token('color-press') }),
        /* Rows sit against each other, so a box reaching past a row would take the
           press from the row beside it. On a touch screen the row itself reaches
           the target, and keeps its density's height where that is taller. */
        rule(
          { coarsePointer: true },
          { minBlockSize: fn('max', token('size-control'), token('size-target')) },
        ),
      ]),
      on('chevron', [
        rule({
          blockSize: tight,
          color: hook.chevronColor,
          flex: '0 0 auto',
          inlineSize: tight,
          transition: ['rotate', token('duration-normal'), token('easing-standard')],
        }),
        firstLine,
        ...placed,
      ]),
      /* An icon passed in its place is sized, colored and turned the same way. */
      on({ region: 'chevron', slotted: '*' }, [
        rule({
          blockSize: tight,
          color: hook.chevronColor,
          flex: '0 0 auto',
          inlineSize: tight,
          transition: ['rotate', token('duration-normal'), token('easing-standard')],
        }),
        firstLine,
        ...placed,
      ]),
      on('content', [
        rule({
          display: 'grid',
          gridTemplateRows: fit(0),
          transition: ['grid-template-rows', token('duration-normal'), token('easing-standard')],
        }),
        rule({ open: true }, { gridTemplateRows: fit(1) }),
      ]),
      on('content-inner', [
        /* The row is what moves, so what it holds may be clipped below its own
           height. */
        rule({ minBlockSize: 0, overflow: 'hidden' }),
      ]),
      /* On the slot and not on the part that clips, whose padding the grid
         keeps at a row of nothing. A phone draws the slot as the region's
         own view. */
      on({ part: 'content-inner', inner: '> slot' }, [
        rule({
          color: hook.contentColor,
          display: 'block',
          lineHeight: token('leading-normal'),
          /* A word longer than the line breaks, since the region clips. */
          web: { overflowWrap: 'break-word' },
          padding: hook.padding([token('space-sm'), inset]),
          paddingBlockStart: 0,
        }),
        rule({ chevronPlacement: 'start' }, { marginInlineStart: sum(tight, token('space-xs')) }),
      ]),
    ]
  },
)
