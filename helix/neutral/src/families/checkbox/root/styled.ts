import checkboxStrokes from '../../../fragments/checkbox-strokes.js'
import field from '../../../fragments/field.js'
import fieldInline from '../../../fragments/field-inline.js'
import { oneOf } from '../../../render.js'
import { difference, first, fn, list, native, quotient, sum, token, web } from '../../../style.js'
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
/* What a press may change: neither a disabled box nor a read-only one. */
const live = { formDisabled: false, readonly: false } as const

/**
 * Checkbox's styled tier.
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
    own: {
      checkboxSize: null,
      fieldControlBlockSize: null,
      fieldControlInlineSize: null,
      fieldDisabledOpacity: null,
    },
    props: { separation: oneOf(['filled', 'outlined', 'plain']) },
    stylesheet: 'checkbox/root/checkbox-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    /* A card's surface, which the web draws on the row's `::before` and a
       phone on the row, a card's corner as Card draws it. */
    const surface = {
      backgroundColor: hook.cardBackgroundColor,
      border: [token('border-thin'), 'solid', hook.cardBorderColor],
      borderRadius: token('radii-md'),
      transition: list(['background-color', ...ease], ['border-color', ...ease]),
    } as const
    const surfaceStates = [
      /* The wash every filled surface takes, and the edge goes, transparent
         so the box keeps its size. */
      rule(
        { separation: 'filled' },
        {
          backgroundColor: hook.cardBackgroundColor(token('color-surface-filled')),
          borderColor: 'transparent',
        },
      ),
      /* An edge and no fill, as `outlined` is wherever it is offered. */
      rule(
        { separation: 'outlined' },
        { backgroundColor: hook.cardBackgroundColor('transparent') },
      ),
      /* Under a pointer, the edge is muted. */
      rule({ ...live, hover: true, ...card }, { borderColor: token('color-foreground-muted') }),
      /* Chosen, as a chosen radio card is: a ring drawn outside the edge,
         and the fill steps up under `filled` only. */
      rule(
        { ...card, checked: true },
        {
          borderColor: token('color-primary'),
          boxShadow: ['0', '0', '0', token('border-thick'), token('color-primary')],
        },
      ),
      rule(
        { checked: true, separation: 'filled' },
        { backgroundColor: token('color-surface-raised') },
      ),
      /* A read-only card is drawn as a read-only field is: no wash, the
         field edge whether ticked or not, and no ring. */
      rule(
        { ...card, readonly: true },
        {
          backgroundColor: hook.cardBackgroundColor('transparent'),
          borderColor: hook.cardBorderColor,
          boxShadow: 'none',
        },
      ),
    ]
    return [
      include(field),
      include(fieldInline),
      on('host', [
        rule({
          own: {
            checkboxSize: hook.size,
            /* What `field-inline` indents the hint by, so it starts under the
             words, and how tall the mark is, which the row grows past on a
             touch screen. */
            fieldControlBlockSize: own.checkboxSize,
            fieldControlInlineSize: own.checkboxSize,
          },
        }),
        rule({ display: 'inline-flex', flexDirection: 'column', gap: token('space-2xs') }),
        rule(
          { formDisabled: true },
          { own: { fieldDisabledOpacity: 1 }, opacity: token('opacity-disabled') },
        ),
        /* A card is the same checkbox in a bounded surface. Its padding takes it
         past the target, so it adds no band for the hint to rise by. On the
         web the surface is drawn over the whole host, under the words. */
        rule(card, { own: { fieldControlBlockSize: token('size-target') }, display: 'block' }),
        web([rule(card, { isolation: 'isolate', position: 'relative' })]),
        /* A tick that is a fill must print, or the box prints empty. */
        rule({ print: true }, { boxShadow: 'none', web: { printColorAdjust: 'exact' } }),
      ]),
      /* The row is the label, so the whole of it is the target. */
      on('field', [
        rule({ web: { cursor: 'pointer' }, display: 'inline-flex', gap: token('space-xs') }),
        /* The box stays beside the first line of a label that wraps. */
        web([rule({ alignItems: 'start' })]),
        native([rule({ alignItems: 'center' })]),
        web([
          rule({ formDisabled: true }, { cursor: 'not-allowed' }),
          rule({ readonly: true }, { cursor: 'default' }),
        ]),
        /* A phone draws the label's box whatever it holds, so nothing to read closes the gap. */
        native([rule({ hasLabel: false }, { gap: token('space-none') })]),
        rule(card, {
          alignItems: 'start',
          display: 'flex',
          gap: token('space-sm'),
          inlineSize: '100%',
          padding: hook.cardPadding,
        }),
        /* On the web the surface is the row's `::before`, over the whole host,
         so the hint is inside the card; the row's edge is transparent, so the
         words sit where the surface's edge puts them. A phone draws the
         surface on the row itself. */
        web([
          rule(card, {
            border: [token('border-thin'), 'solid', 'transparent'],
            position: 'static',
          }),
        ]),
        native([
          rule(card, surface),
          ...surfaceStates,
          rule(
            { holds: { control: 'focusVisible' }, ...card },
            { outline: ring, outlineOffset: token('size-focus-offset') },
          ),
        ]),
        /* Rows sit against each other, so a box reaching past a row would take the
         press from the row beside it. On a touch screen the row itself reaches the
         target. */
        rule({ position: 'relative' }),
        rule({ coarsePointer: true }, { minBlockSize: token('size-target') }),
      ]),
      on({ before: 'field' }, [
        web([
          rule(card, {
            ...surface,
            boxSizing: 'border-box',
            content: '""',
            inset: 0,
            position: 'absolute',
            zIndex: token('layer-beneath'),
          }),
          ...surfaceStates,
        ]),
      ]),
      /* Written out: no condition names the focus of a part the row holds on
       its pseudo-element. */
      on(
        {
          part: 'field',
          selector:
            ':host(:is([separation="filled"], [separation="outlined"])) [part="field"]:has([part="control"]:focus-visible)::before',
        },
        [web([rule({ outline: ring, outlineOffset: token('size-focus-offset') })])],
      ),
      /* Written out: the row's foot padding goes where a hint or a message
       follows it. */
      on(
        {
          part: 'field',
          selector:
            ':host(:is([separation="filled"], [separation="outlined"])) [part="field"]:has(~ [part="hint"], ~ [part="feedback"])',
        },
        [web([rule({ paddingBlockEnd: token('space-none') })])],
      ),
      /* The hint and the message under the words, inside the card's padding.
       A press on them goes through to the card, which is the target. */
      on(
        ['hint', 'feedback'],
        [
          web([
            rule(card, {
              paddingBlockEnd: sum(hook.cardPadding, token('border-thin')),
              paddingInline: [
                sum(hook.cardPadding, token('border-thin'), own.checkboxSize, token('space-sm')),
                sum(hook.cardPadding, token('border-thin')),
              ],
              pointerEvents: 'none',
            }),
          ]),
        ],
      ),
      on('box', [
        rule({ display: 'grid', flex: '0 0 auto', placeItems: 'center' }),
        /* As tall as the label's first line, where that is taller than the box,
         so the box is centered on the line, at the label's font and leading. */
        web([
          rule({
            fontSize: token('text-control'),
            lineHeight: token('leading-normal'),
            minBlockSize: '1lh',
          }),
        ]),
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
          border: [
            token('border-thin'),
            'solid',
            hook.borderColor(token('color-foreground-subtle')),
          ],
          /* Never past a quarter of the box, so a box stays a box whatever the
           theme's corners. */
          borderRadius: fn('min', token('radii-sm'), quotient(own.checkboxSize, 4)),
          inlineSize: own.checkboxSize,
          margin: token('space-none'),
          transition: list(['background-color', ...ease], ['border-color', ...ease]),
        }),
        /* Being ticked is an answer, which takes no color. */
        rule(marked, { borderColor: first(hook.borderColor, hook.checkedColor) }),
        /* Monotone under a pointer, which would otherwise say "recommended",
         ticked or not. */
        rule(
          { ...live, within: { field: { hover: true } } },
          {
            backgroundColor: token('color-hover'),
            borderColor: hook.borderColor(token('color-foreground')),
          },
        ),
        rule(
          { ...live, within: { field: { active: true } } },
          { backgroundColor: token('color-press') },
        ),
        /* Read-only, and the box says so with its edge, ticked or not, at 3:1;
         the tick keeps its ink, being the value. Before the invalid rule,
         whose red edge still wins. */
        rule({ readonly: true }, { borderColor: hook.borderColor(token('color-border-readonly')) }),
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
        rule(
          [
            { forcedColors: true, checked: true },
            { forcedColors: true, indeterminate: true },
          ],
          { borderColor: 'Highlight' },
        ),
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
        /* A phone's grid has no shared cell, so the mark lies over the box.
         Centered by `inset` and `margin`: under the row's least height, Yoga
         resolved a `top` of 50% against the row and stood the mark below the
         box, measured on iOS on November 2, 2026. */
        native([rule({ inset: 0, margin: 'auto', position: 'absolute' })]),
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
        /* Forced colors paint every background Canvas, so a mark drawn as one
         disappears and a chosen control looks like the others. Measured in
         Chromium on October 31, 2026. */
        rule(
          { forcedColors: true },
          { backgroundColor: 'Highlight', web: { forcedColorAdjust: 'none' } },
        ),
      ]),
      /* A phone strokes the same paths, at the same weight, in the mark's ink. */
      include(checkboxStrokes),
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
        /* The label's first line centered on the box, where the box is taller
         than a line, in every row that is not a card. */
        web([
          rule(
            { separation: { not: ['filled', 'outlined'] } },
            {
              paddingBlockStart: fn(
                'max',
                '0px',
                quotient(difference(token('size-checkbox'), '1lh'), 2),
              ),
            },
          ),
        ]),
      ]),
    ]
  },
)
