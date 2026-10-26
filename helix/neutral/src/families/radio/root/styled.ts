import visuallyHidden from '../../../fragments/visually-hidden.js'
import { oneOf } from '../../../render.js'
import { difference, list, product, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Radio's styled tier, which writes `helix/styled/src/radio/root/radio-root.generated.css`.
 *
 * **A circle with a dot in it.** The dot scales up from nothing when the
 * radio is chosen, as a checkbox's tick does, and takes no color: a chosen
 * radio is an answer. An icon passed into `indicator` takes the dot's place.
 *
 * **A card is the same radio in a bounded surface**, and a chosen card is
 * where the brand color belongs, as a ring drawn outside its edge so a
 * column of cards does not move. **A chip gives up its words**: they name it
 * unseen, and a chosen chip goes solid and comes forward.
 */
export default styles(
  root,
  {
    prefix: 'radio',
    hooks: ({ own }) => ({
      backgroundColor: 'transparent',
      borderColor: null,
      cardBackgroundColor: token('color-surface'),
      cardBorderColor: token('color-border'),
      cardPadding: token('space-md'),
      chipSize: token('size-control'),
      indicatorSize: product(own.size, 0.75),
      markColor: token('color-foreground'),
      size: token('size-checkbox'),
    }),
    own: ['radio-chip-lift', 'radio-size'],
    props: {
      hideControl: false,
      separation: oneOf(['filled', 'outlined', 'plain']),
      variant: oneOf(['chip']),
    },
    stylesheet: 'radio/root/radio-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ own: { size: hook.size } }),
      rule({ display: 'block' }),
      rule({ has: 'disabled' }, { opacity: 0.5 }),
      /* A card is the same radio in a bounded surface. */
      rule({ separation: ['filled', 'outlined'] }, { display: 'block' }),
      /* A chosen dot must print, or the answer prints empty. */
      rule({ print: true }, { boxShadow: 'none', web: { printColorAdjust: 'exact' } }),
    ]),
    /* The row is the button, so the whole of it is the target. */
    on('item', [
      rule({
        all: web('unset'),
        alignItems: 'center',
        boxSizing: 'border-box',
        cursor: web('pointer'),
        display: 'inline-flex',
        gap: token('space-xs'),
      }),
      web([rule({ has: 'disabled' }, { cursor: 'default' })]),
      rule(
        { separation: ['filled', 'outlined'] },
        {
          alignItems: 'start',
          backgroundColor: hook.cardBackgroundColor,
          border: [token('border-thin'), 'solid', hook.cardBorderColor],
          borderRadius: token('radii-sm'),
          display: 'flex',
          gap: token('space-sm'),
          inlineSize: '100%',
          padding: hook.cardPadding,
          transition: list(
            ['background-color', token('duration-fast'), token('easing-standard')],
            ['border-color', token('duration-fast'), token('easing-standard')],
          ),
        },
      ),
      /* The ground carries it and the edge goes, transparent so the card keeps its size. */
      rule({ separation: 'filled' }, { borderColor: 'transparent' }),
      rule(
        { hover: true, lacks: 'disabled', separation: ['filled', 'outlined'] },
        { borderColor: token('color-foreground-muted') },
      ),
      /* Chosen: the brand color, as a ring laid outside the edge. */
      rule(
        { separation: ['filled', 'outlined'], selected: true },
        {
          backgroundColor: token('color-surface-raised'),
          borderColor: token('color-primary'),
          boxShadow: ['0', '0', '0', token('border-thick'), token('color-primary')],
        },
      ),
      /* On the whole card, because the card is the target. */
      rule(
        { focusVisible: true, separation: ['filled', 'outlined'] },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      /* How far a chosen chip comes forward, and a hovered one half of it. */
      rule(
        { variant: 'chip' },
        {
          alignItems: 'center',
          backgroundColor: token('color-surface-sunken'),
          blockSize: hook.chipSize,
          borderRadius: token('radii-full'),
          color: token('color-foreground-muted'),
          web: { cursor: 'pointer' },
          display: 'inline-flex',
          inlineSize: hook.chipSize,
          justifyContent: 'center',
          padding: 0,
          transition: list(
            ['background-color', token('duration-fast'), token('easing-standard')],
            ['box-shadow', token('duration-fast'), token('easing-standard')],
            ['translate', token('duration-fast'), token('easing-standard')],
          ),
          own: { chipLift: '2px' },
        },
      ),
      /* Weight and height carry the choice: solid, and forward. */
      rule(
        { selected: true, variant: 'chip' },
        {
          backgroundColor: token('color-surface-inverse'),
          boxShadow: token('shadow-md'),
          color: token('color-foreground-inverse'),
          translate: ['0', product(own.chipLift, '-1')],
        },
      ),
      rule(
        { hover: true, lacks: 'disabled', variant: 'chip' },
        { translate: ['0', quotient(own.chipLift, '-2')] },
      ),
      rule(
        { focusVisible: true, variant: 'chip' },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      /* Repeating the selector exactly, so the reduced motion wins. */
      rule({ reducedMotion: true, variant: 'chip' }, { transition: 'none' }),
      rule(
        [
          { reducedMotion: true, selected: true, variant: 'chip' },
          { hover: true, lacks: 'disabled', reducedMotion: true, variant: 'chip' },
        ],
        { translate: 'none' },
      ),
    ]),
    /* One cell, so the dot is centered in the circle. No fill of its own, so an
       unchosen circle is an empty ring on whatever it sits on: the page's own
       color read as a solid dark disc on a card in dark mode. The edge in the
       mark ink, not the rule ink, which drew no ring around it there. */
    on('box', [
      rule({
        backgroundColor: hook.backgroundColor,
        blockSize: own.size,
        border: [token('border-thin'), 'solid', hook.borderColor(token('color-foreground-subtle'))],
        borderRadius: token('radii-full'),
        display: 'grid',
        flex: '0 0 auto',
        inlineSize: own.size,
        placeItems: 'center',
        transition: ['border-color', token('duration-fast'), token('easing-standard')],
      }),
      /* The edge firms up and takes no color, through the hook, so a group
         saying "these are wrong" is not undone by a pointer. */
      rule(
        { lacks: 'disabled', within: { item: { hover: true } } },
        { borderColor: hook.borderColor(token('color-foreground-muted')) },
      ),
      rule({ selected: true }, { borderColor: hook.borderColor(token('color-foreground')) }),
      /* Offset, because the ring surrounds a circle whose own edge is not moving. */
      rule(
        { within: { item: { focusVisible: true } } },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      rule(
        { separation: ['filled', 'outlined'], within: { item: { focusVisible: true } } },
        { outline: 'none' },
      ),
      /* The circle centers on the label's first line, by a margin, since a
         band would draw an oval. */
      rule(
        { separation: ['filled', 'outlined'] },
        {
          fontSize: token('text-md'),
          lineHeight: token('leading-normal'),
          marginBlockStart: quotient(difference('1lh', own.size), 2),
        },
      ),
      /* The card is the control, so the circle can go. */
      rule({ hideControl: true, separation: ['filled', 'outlined'] }, { display: 'none' }),
      /* A chip is a card that gave up its words. */
      rule({ variant: 'chip' }, { display: 'none' }),
    ]),
    /* A dot under half the circle, so the pair reads as a mark in a circle. */
    on({ after: 'box' }, [
      rule({
        backgroundColor: hook.markColor,
        blockSize: product(own.size, 0.4),
        borderRadius: token('radii-full'),
        content: '""',
        inlineSize: product(own.size, 0.4),
        scale: 0,
        transition: ['scale', token('duration-fast'), token('easing-emphasized')],
      }),
      rule({ selected: true }, { scale: 1 }),
      /* A slotted indicator is the mark, so the dot goes. */
      rule({ state: 'hasIndicator' }, { content: 'none' }),
    ]),
    on({ region: 'indicator', slotted: '*' }, [
      rule({
        blockSize: hook.indicatorSize,
        color: hook.markColor,
        inlineSize: hook.indicatorSize,
        scale: 0,
        transition: ['scale', token('duration-fast'), token('easing-emphasized')],
      }),
      rule({ state: 'selected' }, { scale: 1 }),
    ]),
    /* A step up from body weight: a radio's label is one of the answers. */
    on('label', [
      rule({
        color: token('color-foreground'),
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        fontWeight: token('weight-medium'),
        lineHeight: token('leading-tight'),
      }),
      /* A card's first line is a sentence somebody reads. */
      rule(
        { separation: ['filled', 'outlined'] },
        { fontSize: token('text-md'), lineHeight: token('leading-normal') },
      ),
      /* The words name the choice without taking room in it. */
      rule({ variant: 'chip' }, [visuallyHidden]),
    ]),
  ],
)
