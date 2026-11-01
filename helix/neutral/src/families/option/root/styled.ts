import printExact from '../../../fragments/print-exact.js'
import row from '../../../fragments/row.js'
import { native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import option from './headless.js'

/* The tick, a stencil so its color is a token like every other color here. */
const tick =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cpath d='M104 192a8 8 0 0 1-5.7-2.3l-56-56a8 8 0 0 1 11.4-11.4L104 172.7 210.3 66.3a8 8 0 0 1 11.4 11.4l-112 112A8 8 0 0 1 104 192Z'/%3E%3C/svg%3E\")"

/**
 * One choice in a list, in its styled tier.
 *
 * **The radius comes from the owner**, which decides whether this row is inset
 * or runs the full width, and only a row with space around it has corners worth
 * rounding.
 *
 * **The height, the type, and the touch reach are `row`'s**, so a row with an icon
 * in it stands as tall as the row above it. The words and the caption stay on one line and are cut, since a list
 * whose rows differ in height is one the keys move through unevenly.
 *
 * **Active and selected are two facts.** Active is a wash of the foreground, as a
 * hover is, and selected a check at the end of the row. The web draws the check
 * as a stencil on the row's `::after`, and a phone as an icon.
 */
export default styles(
  option,
  {
    prefix: 'option',
    hooks: {
      activeColor: token('color-hover'),
      blockPadding: token('space-2xs'),
      draggingOpacity: 0.5,
      dropColor: token('color-primary'),
      dropSize: token('border-thick'),
      padding: token('space-field'),
      radius: token('radii-sm'),
    },
    stylesheet: 'option/root/option-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(row),
    on('host', [rule({ display: 'block' })]),
    /* Written out: an owner hides what a filter leaves out with the attribute, and a
       phone's owner draws nothing for it. */
    on({ part: 'host', selector: ':host([hidden])' }, [web([rule({ display: 'none' })])]),
    on('item', [
      rule({
        alignItems: 'center',
        borderRadius: hook.radius,
        color: token('color-foreground'),
        display: 'flex',
        gap: token('space-xs'),
        paddingBlock: hook.blockPadding,
        paddingInline: hook.padding,
        web: { cursor: 'pointer' },
      }),
      native([rule({ part: { 'data-highlight': true } }, { backgroundColor: hook.activeColor })]),
      rule({ disabled: false, hover: true }, { backgroundColor: hook.activeColor }),
      rule({ disabled: true }, { opacity: token('opacity-disabled'), web: { cursor: 'default' } }),
      /* A phone's move draws here, and the web's reorder entry adopts a sheet of its own. */
      native([rule({ part: { 'data-dragging': true } }, { opacity: hook.draggingOpacity })]),
    ]),
    /* Written out: `active` in a `when` is the pointer's `:active`, and this is the
       state of the same name. */
    on({ part: 'item', selector: ':host(:state(active)) [part~="item"]' }, [
      web([rule({ backgroundColor: hook.activeColor })]),
    ]),
    on('text', [
      rule({ display: 'flex', flex: '1 1 auto', flexDirection: 'column', minInlineSize: 0 }),
    ]),
    on(
      ['description'],
      [
        rule({
          color: token('color-foreground-muted'),
          fontSize: token('text-xs'),
          lineHeight: token('leading-tight'),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
      ],
    ),
    on({ region: 'description', slotted: '*' }, [
      rule({
        color: token('color-foreground-muted'),
        fontSize: token('text-xs'),
        lineHeight: token('leading-tight'),
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
    ]),
    on('label', [
      rule({
        minInlineSize: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
    ]),
    /* What is passed into `indicator` is drawn only on the chosen option,
       where the check would be. */
    on({ region: 'indicator', slotted: '*' }, [
      rule({ display: 'none' }),
      rule(
        { selected: true },
        {
          blockSize: token('size-icon-tight'),
          display: 'block',
          flex: '0 0 auto',
          inlineSize: token('size-icon-tight'),
          marginInlineStart: 'auto',
        },
      ),
    ]),
    on({ after: 'item' }, [
      rule(
        { platform: 'web', selected: true },
        {
          backgroundColor: 'currentColor',
          blockSize: token('size-icon-tight'),
          content: '""',
          flex: '0 0 auto',
          inlineSize: token('size-icon-tight'),
          marginInlineStart: 'auto',
          maskImage: tick,
          maskPosition: 'center',
          maskRepeat: 'no-repeat',
          maskSize: 'contain',
        },
      ),
      rule({ hasIndicator: true, platform: 'web' }, { content: 'none' }),
      /* Forced colors paint every background Canvas, so a mark drawn as one
         disappears and a chosen control looks like the others. */
      rule(
        { forcedColors: true, selected: true },
        { backgroundColor: 'Highlight', forcedColorAdjust: 'none' },
      ),
    ]),
    on('check', [
      native([
        rule({
          blockSize: token('size-icon-tight'),
          flex: '0 0 auto',
          inlineSize: token('size-icon-tight'),
          marginInlineStart: 'auto',
        }),
      ]),
    ]),
    on('drop', [
      native([
        rule({
          backgroundColor: hook.dropColor,
          blockSize: hook.dropSize,
          insetInlineEnd: 0,
          insetInlineStart: 0,
          pointerEvents: 'none',
          position: 'absolute',
        }),
        rule({ part: { 'data-before': true } }, { insetBlockStart: 0 }),
        rule({ part: { 'data-after': true } }, { insetBlockEnd: 0 }),
      ]),
    ]),
    include(printExact),
    on('item', [
      rule({ active: true, disabled: false }, { backgroundColor: token('color-press') }),
    ]),
  ],
)
