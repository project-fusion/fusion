import printExact from '../../../fragments/print-exact.js'
import row from '../../../fragments/row.js'
import { difference, first, inherited, mix, native, scheme, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import option from './headless.js'

/* The tick, a stencil so its color is a token like every other color here. **Checkbox's
   tick**, the same path at the same stroke, so a chosen option and a ticked box draw one
   mark. */
const tick =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5 10.2 16.7 18 8.4'/%3E%3C/svg%3E\")"

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
    hooks: ({ own }) => ({
      activeBackgroundColor: first(own.optionWash, token('color-hover')),
      blockPadding: token('space-2xs'),
      draggingOpacity: 0.5,
      hoverBackgroundColor: null,
      dropColor: token('color-primary'),
      dropSize: token('border-thick'),
      mediaAspectRatio: '4 / 3',
      mediaRadius: token('radii-sm'),
      padding: token('space-field'),
      radius: token('radii-sm'),
    }),
    own: { optionInk: null, optionPress: null, optionWash: null },
    stylesheet: 'option/root/option-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    include(row),
    on('host', [rule({ display: 'block' })]),
    /* Written out: an owner hides what a filter leaves out with the attribute, and a
       phone's owner draws nothing for it. */
    /* **`danger`, kept quiet**, as a menu item draws it: the words in the danger
       ink, and the highlight a wash of it at the hover wash's own strengths. A
       disabled danger option is a disabled option. */
    on('host', [
      rule(
        { tone: 'danger' },
        {
          own: {
            optionInk: token('color-danger'),
            optionPress: scheme(
              mix(token('color-danger'), 16, 'transparent'),
              mix(token('color-danger'), 20, 'transparent'),
            ),
            optionWash: scheme(
              mix(token('color-danger'), 8, 'transparent'),
              mix(token('color-danger'), 12, 'transparent'),
            ),
          },
        },
      ),
      rule(
        { has: 'disabled', tone: 'danger' },
        { own: { optionInk: 'initial', optionPress: 'initial', optionWash: 'initial' } },
      ),
    ]),
    on({ part: 'host', selector: ':host([hidden])' }, [web([rule({ display: 'none' })])]),
    on('item', [
      rule({
        alignItems: 'center',
        borderRadius: hook.radius,
        color: own.optionInk(token('color-foreground')),
        display: 'flex',
        gap: token('space-xs'),
        paddingBlock: hook.blockPadding,
        paddingInline: inherited('_option-bleed', hook.padding),
        /* Under the listbox's `bleed` the inset is the bleed and the margin is
           the rest of the field's step, so the words do not move. None by
           default. */
        marginInline: difference(hook.padding, inherited('_option-bleed', hook.padding)),
        web: { cursor: 'pointer' },
      }),
      native([
        rule({ part: { 'data-highlight': true } }, { backgroundColor: hook.activeBackgroundColor }),
      ]),
      native([
        rule({ disabled: false, hover: true }, { backgroundColor: hook.activeBackgroundColor }),
      ]),
      rule({ disabled: true }, { opacity: token('opacity-disabled'), web: { cursor: 'default' } }),
      /* A phone's move draws here, and the web's reorder entry adopts a sheet of its own. */
      native([rule({ part: { 'data-dragging': true } }, { opacity: hook.draggingOpacity })]),
    ]),
    /* Written out: `active` in a `when` is the pointer's `:active`, and this is the
       state of the same name. */
    on({ part: 'item', selector: ':host(:state(active)) [part~="item"]' }, [
      web([rule({ backgroundColor: hook.activeBackgroundColor })]),
    ]),
    /* Written out: under the pointer, a row the keys are not on takes the hover wash. */
    on(
      {
        part: 'item',
        selector: ':host(:not([disabled]):not(:state(active))) [part~="item"]:hover',
      },
      [web([rule({ backgroundColor: hook.hoverBackgroundColor(hook.activeBackgroundColor) })])],
    ),
    /* A leading icon at the tight step, as List's and Select's rows draw it. */
    on({ region: 'start', slotted: '*' }, [
      rule({ '--icon-size': token('size-icon-tight'), flex: [0, 0, 'auto'] }),
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
    /* An option with an image is a tile: the image takes a line of its own
       across the row, and the label, the marks either side of it and the check
       sit on the line under it. The row wraps only while `media` is filled, so
       a row with no image keeps one line, and the label's column starts from
       nothing and grows into the line the image leaves it. */
    on('item', [rule({ filled: 'media' }, { flexWrap: 'wrap', rowGap: token('space-xs') })]),
    on('text', [rule({ filled: 'media' }, { flexBasis: 0 })]),
    /* `min-inline-size: 0`, because an image's floor is its own width, which
       would push the tile out of its column. */
    on({ region: 'media', slotted: '*' }, [
      rule({
        aspectRatio: hook.mediaAspectRatio,
        borderRadius: hook.mediaRadius,
        display: 'block',
        flex: '1 0 100%',
        inlineSize: '100%',
        minInlineSize: 0,
        objectFit: 'cover',
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
          maskSize: token('size-checkbox'),
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
      rule(
        { active: true, disabled: false },
        { backgroundColor: own.optionPress(token('color-press')) },
      ),
    ]),
  ],
)
