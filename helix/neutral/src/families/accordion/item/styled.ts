import { fit, product, sum, token } from '../../../style.js'
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
      chevronColor: token('color-foreground-subtle'),
      chevronHoverColor: token('color-foreground'),
      color: token('color-foreground'),
      contentColor: token('color-foreground-muted'),
      disabledOpacity: token('opacity-disabled'),
      fontSize: token('text-md'),
      fontWeight: token('weight-medium'),
      hoverBackgroundColor: 'transparent',
      padding: [product(token('space-control'), 0.5), token('space-md')],
    },
    stylesheet: 'accordion/item/accordion-item.generated.css',
  },
  ({ hook, on, rule }) => {
    /* Where the chevron stands, how it turns, and its color under the pointer. */
    const placed = [
      rule({ chevronPlacement: { not: 'start' } }, { marginInlineStart: 'auto' }),
      rule({ open: true }, { transform: 'scaleY(-1)' }),
      rule({ within: { trigger: { hover: true } } }, { color: hook.chevronHoverColor }),
    ]
    return [
      on('host', [rule({ display: 'block' })]),
      on('trigger', [
        rule({
          web: { all: 'unset', cursor: 'pointer', overflowWrap: 'anywhere' },
          position: 'relative',
          boxSizing: 'border-box',
          alignItems: 'center',
          color: hook.color,
          display: 'flex',
          fontSize: hook.fontSize,
          fontWeight: hook.fontWeight,
          inlineSize: '100%',
          gap: token('space-xs'),
          minBlockSize: token('size-control'),
          /* A long unbroken word breaks inside the column it was given. */
          minInlineSize: 0,
          padding: hook.padding,
          transition: ['background-color', token('duration-fast'), token('easing-standard')],
        }),
        /* No fill under the pointer, unless a page asks for one. */
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
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        rule({ active: true, lacks: 'disabled' }, { backgroundColor: token('color-press') }),
        /* Rows sit against each other, so a box reaching past a row would take the
           press from the row beside it. On a touch screen the row itself reaches
           the target. */
        rule({ coarsePointer: true }, { minBlockSize: token('size-target') }),
      ]),
      on('chevron', [
        rule({
          blockSize: '1em',
          color: hook.chevronColor,
          flex: '0 0 auto',
          inlineSize: '1em',
          transform: 'scaleY(1)',
          transition: ['transform', token('duration-fast'), token('easing-standard')],
        }),
        ...placed,
      ]),
      /* An icon passed in its place is sized, colored and turned the same way. */
      on({ region: 'chevron', slotted: '*' }, [
        rule({
          blockSize: '1em',
          color: hook.chevronColor,
          flex: '0 0 auto',
          inlineSize: '1em',
          transition: ['transform', token('duration-fast'), token('easing-standard')],
        }),
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
          padding: hook.padding,
          paddingBlockStart: 0,
        }),
        rule(
          { chevronPlacement: 'start' },
          { marginInlineStart: sum(token('text-md'), token('space-xs')) },
        ),
      ]),
    ]
  },
)
