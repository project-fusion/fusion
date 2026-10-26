import field from '../../../fragments/field.js'
import fieldInline from '../../../fragments/field-inline.js'
import { oneOf } from '../../../render.js'
import { first, list, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import checkbox from './headless.js'

/* The two masks, named once, since each is a line of percent-encoding. */
const tick = web(
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5 10.2 16.7 18 8.4'/%3E%3C/svg%3E\")",
)
const dash = web(
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M7 12h10'/%3E%3C/svg%3E\")",
)
const ease = [token('duration-fast'), token('easing-standard')] as const
/* A card: either separation that draws a bounded surface. */
const card = { separation: ['filled', 'outlined'] } as const
const marked = [{ checked: true }, { indeterminate: true }] as const
const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const

/**
 * Checkbox's styled tier, which writes `helix/styled/src/checkbox/root/checkbox-root.generated.css`.
 *
 * **The box is the input with its own drawing turned off**, so it stays a
 * real control for assistive technology, and the mark lies over it in the
 * same cell. **No color for an answer**: a ticked box firms its edge to the
 * foreground, and only a wrong one takes the danger color. The mark keeps
 * its ink when the field is wrong, since the edge says so already.
 *
 * **The tick and the dash are masks on the web**, so their weight is ours.
 * A phone draws the same paths as vectors, stroked in the mark's color, and
 * lays the mark over the box, since a phone's grid has no shared cell.
 *
 * **A card is the same checkbox in a bounded surface**, through hooks, the
 * way `Card` is. A checked card looks as a chosen radio card does, with a
 * ring drawn outside the edge so nothing moves, and the box centers on the
 * card's first line.
 */
export default styles(
  checkbox,
  {
    prefix: 'checkbox',
    hooks: {
      backgroundColor: 'transparent',
      borderColor: null,
      cardBackgroundColor: token('color-surface'),
      cardBorderColor: token('color-border'),
      cardPadding: token('space-md'),
      checkedColor: token('color-foreground'),
      iconSize: '100%',
      markColor: token('color-foreground'),
      size: token('size-checkbox'),
    },
    own: { checkboxSize: null, fieldControlInlineSize: null },
    props: { separation: oneOf(['filled', 'outlined', 'plain']) },
    stylesheet: 'checkbox/root/checkbox-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    include(field),
    include(fieldInline),
    on('host', [
      rule({
        own: {
          checkboxSize: hook.size,
          /* What `field-inline` indents the hint by, so it starts under the words. */
          fieldControlInlineSize: own.checkboxSize,
        },
      }),
      rule({ display: 'inline-flex', flexDirection: 'column', gap: token('space-2xs') }),
      rule({ formDisabled: true }, { opacity: 0.5 }),
      /* A card is the same checkbox in a bounded surface. */
      rule(card, { display: 'block' }),
      /* A tick that is a fill must print, or the box prints empty. */
      rule({ print: true }, { boxShadow: 'none', web: { printColorAdjust: 'exact' } }),
    ]),
    /* The row is the label, so the whole of it is the target. */
    on('field', [
      rule({
        alignItems: 'center',
        web: { cursor: 'pointer' },
        display: 'inline-flex',
        gap: token('space-xs'),
      }),
      web([rule({ formDisabled: true }, { cursor: 'default' })]),
      rule(card, {
        alignItems: 'start',
        backgroundColor: hook.cardBackgroundColor,
        border: [token('border-thin'), 'solid', hook.cardBorderColor],
        borderRadius: token('radii-sm'),
        display: 'flex',
        gap: token('space-sm'),
        inlineSize: '100%',
        padding: hook.cardPadding,
        transition: list(['background-color', ...ease], ['border-color', ...ease]),
      }),
      /* The ground carries it and the edge goes, transparent so the box keeps its size. */
      rule({ separation: 'filled' }, { borderColor: 'transparent' }),
      /* Chosen, as a chosen radio card is: a ring drawn outside the edge. */
      rule(
        { ...card, checked: true },
        {
          backgroundColor: token('color-surface-raised'),
          borderColor: token('color-primary'),
          boxShadow: ['0', '0', '0', token('border-thick'), token('color-primary')],
        },
      ),
      /* Under a pointer, the edge is muted, chosen or not: the ring says it is chosen. */
      rule(
        { formDisabled: false, hover: true, ...card },
        { borderColor: token('color-foreground-muted') },
      ),
      /* The ring goes on the card, because the card is the target. */
      rule(
        { holds: { control: 'focusVisible' }, ...card },
        { outline: ring, outlineOffset: token('size-focus-offset') },
      ),
    ]),
    on('box', [
      rule({ display: 'grid', flex: '0 0 auto', placeItems: 'center' }),
      /* The box centers on the label's first line: a band one line tall, at
         the card's own line height. */
      rule(card, {
        fontSize: token('text-md'),
        lineHeight: token('leading-normal'),
        minBlockSize: '1lh',
      }),
    ]),
    /* One cell, both children in it, so the mark is centered over the input. */
    on({ part: 'box', inner: '> *' }, [web([rule({ gridArea: '1 / 1' })])]),
    /* No fill of its own, as the radio's, so an unticked box is an empty square
       on whatever it sits on. The page's own color read as a solid dark square
       on a card in dark mode. The edge is in the mark ink, as the radio's: the
       rule's color drew no edge around the box in a card in dark mode. */
    on('control', [
      rule({
        web: { appearance: 'none', cursor: 'inherit' },
        backgroundColor: hook.backgroundColor,
        blockSize: own.checkboxSize,
        border: [token('border-thin'), 'solid', hook.borderColor(token('color-foreground-subtle'))],
        borderRadius: token('radii-sm'),
        inlineSize: own.checkboxSize,
        margin: token('space-none'),
        transition: list(['background-color', ...ease], ['border-color', ...ease]),
      }),
      /* Being ticked is an answer, which takes no color. */
      rule(marked, { borderColor: first(hook.borderColor, hook.checkedColor) }),
      /* Monotone under a pointer, which would otherwise say "recommended",
         ticked or not. */
      rule(
        { formDisabled: false, within: { field: { hover: true } } },
        { borderColor: hook.borderColor(token('color-foreground-muted')) },
      ),
      /* Offset, because the ring surrounds a box whose own edge is not moving. */
      rule({ focusVisible: true }, { outline: ring, outlineOffset: token('size-focus-offset') }),
      /* Wrong, and the reader knows it: the box's own edge. */
      rule({ invalid: true }, { borderColor: token('color-danger') }),
      rule(
        [
          { invalid: true, checked: true },
          { invalid: true, indeterminate: true },
        ],
        {
          borderColor: token('color-danger'),
        },
      ),
      rule({ focusVisible: true, ...card }, { outline: 'none' }),
    ]),
    /* The tick by default, and not only when the box is ticked, which stops
       the mark flashing on the way out. Nothing to see until it is checked.
       The dash is the same node, `mark mark-dash` while the box is mixed, so
       its rules are written here, under `also`, after the rules they
       override, and not in a group of their own. */
    on('mark', [
      rule({
        backgroundColor: web(hook.markColor),
        blockSize: own.checkboxSize,
        inlineSize: own.checkboxSize,
        maskImage: tick,
        web: { maskPosition: 'center', maskRepeat: 'no-repeat', maskSize: '100%' },
        pointerEvents: 'none',
        scale: 0,
        transition: ['scale', token('duration-fast'), token('easing-emphasized')],
      }),
      /* A phone's grid has no shared cell, so the mark lies over the box. */
      native([
        rule({
          insetBlockStart: '50%',
          insetInlineStart: '50%',
          position: 'absolute',
          translate: '-50% -50%',
        }),
      ]),
      rule(marked, { scale: 1 }),
      /* The dash wins where both are set, and `mark-dash` outlasts the mixed
         state, so emptying a mixed set does not flash a tick. */
      rule({ also: { 'mark-dash': true } }, { maskImage: dash }),
      /* A slotted icon is the mark for its shape, so the mask and the fill go
         and the icon takes the ink. It still scales in and out with the mark. */
      rule(
        [
          { also: { 'mark-dash': false }, hasCheck: true },
          { also: { 'mark-dash': true }, hasDash: true },
        ],
        {
          backgroundColor: 'transparent',
          color: hook.markColor,
          display: 'grid',
          web: { maskImage: 'none' },
          placeItems: 'center',
        },
      ),
    ]),
    /* A phone strokes the same paths, at the same weight, in the mark's ink. */
    on(['tick', 'dash-mark'], [native([rule({ blockSize: '100%', inlineSize: '100%' })])]),
    on(
      ['tick-line', 'dash-line'],
      [
        native([
          rule({
            fill: 'none',
            stroke: hook.markColor,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            strokeWidth: 2.5,
          }),
        ]),
      ],
    ),
    on({ region: ['check', 'dash'], slotted: '*' }, [
      rule({ blockSize: hook.iconSize, inlineSize: hook.iconSize }),
    ]),
    on('label', [
      /* Nothing to read, so nothing to space away from the box. A label drawn
         to carry the host's `aria-label` is kept, clipped by the field's rule.
         A phone draws the label's box whatever it holds. */
      web([rule({ part: { 'data-hidden': false }, hasLabel: false }, { display: 'none' })]),
      /* A card's first line is a sentence somebody reads. */
      rule(card, { fontSize: token('text-md'), lineHeight: token('leading-normal') }),
    ]),
  ],
)
