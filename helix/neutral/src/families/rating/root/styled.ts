import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import { oneOf } from '../../../render.js'
import { difference, measured, native, product, quotient, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import rating from './headless.js'

/**
 * The star the stylesheet draws where no shape is passed, as a mask: the
 * same path a phone draws as a vector.
 */
const star = web(
  'url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>\')',
)

/**
 * Rating's styled tier.
 *
 * **Two rows of the same marks, one over the other, the top one cut off
 * partway.** The track draws every mark in the unfilled color, and the
 * fill over it draws them in the filled color, as wide as the score: whole
 * marks at the full pitch, a mark and its gap, and the rest across the mark
 * itself, so 4.2 fills a fifth of the fifth mark and not the gap after the
 * fourth. A half score needs no second shape, and any shape passed in gets
 * halves too.
 *
 * **The web masks a star**, or the shape `--rating-mark` names, painted in
 * the mark's color; a phone draws the same star as a vector. `dots` draws
 * plain circles, a size smaller. A shape passed in is drawn as itself.
 *
 * **The label stacks over the row, and the hint under it**, as every field
 * has them, and the score sits beside the marks under `show-value`, in
 * tabular figures, so the row does not twitch as it changes.
 *
 * **On the web each score is a target laid over its share of the row**,
 * centered on its mark, a half-gap past each end, so no pixel between the
 * marks ignores a press.
 */
export default styles(
  rating,
  {
    prefix: 'rating',
    hooks: {
      color: token('color-warning'),
      emptyColor: token('color-border'),
      gap: token('space-2xs'),
      mark: null,
      size: token('size-icon-md'),
    },
    own: { ratingMarkGap: null, ratingMarkSize: null, ratingPitch: null, ratingStar: null },
    props: { shape: oneOf(['dots']) },
    stylesheet: 'rating/root/rating-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    include(field),
    include(fieldStacked),
    /* The stack every other field is, and inline, so a rating sits in a
       card, a table cell, or a line of prose at its own width. The marks'
       size and gap are read once, so the fill's arithmetic and the targets
       move with them. */
    on('host', [
      rule({
        display: 'inline-flex',
        flexDirection: 'column',
        gap: token('space-2xs'),
        own: { ratingMarkGap: hook.gap, ratingMarkSize: hook.size },
      }),
    ]),
    /* The marks and the score beside them, a step further apart than the marks. */
    on('field', [rule({ alignItems: 'center', display: 'inline-flex', gap: token('space-xs') })]),
    /* A drag along the row is the rating's, and a swipe down the page past it the page's. */
    on('marks', [
      rule({ display: 'inline-flex', position: 'relative', web: { touchAction: 'pan-y' } }),
    ]),
    on(['track', 'fill'], [rule({ display: 'inline-flex', gap: own.ratingMarkGap })]),
    on('track', [rule({ color: hook.emptyColor })]),
    /* The filled marks, clipped to the score: whole marks at the full pitch,
       and the rest across the mark itself. */
    on('fill', [
      rule({
        color: hook.color,
        inlineSize: sum(
          product(measured('rating-full', 0), sum(own.ratingMarkSize, own.ratingMarkGap)),
          product(measured('rating-part', 0), own.ratingMarkSize),
        ),
        insetBlock: 0,
        insetInlineStart: 0,
        overflow: 'hidden',
        position: 'absolute',
      }),
    ]),
    /* A shape painted in the mark's color, which never shrinks, so the clip
       cuts it and does not squash it. */
    on('mark', [
      rule({
        backgroundColor: web('currentcolor'),
        blockSize: own.ratingMarkSize,
        flex: '0 0 auto',
        inlineSize: own.ratingMarkSize,
        maskImage: web(hook.mark(own.ratingStar)),
        own: { ratingStar: star },
        web: { maskPosition: 'center', maskRepeat: 'no-repeat', maskSize: 'contain' },
      }),
    ]),
    /* The places a reader presses, laid over the marks, each a mark's share
       of the row in order, starting half a gap early so it is centered on
       its mark. Transparent: what a reader sees is the row under it. */
    on('option', [
      rule({
        web: { all: 'unset', cursor: 'pointer' },
        boxSizing: 'border-box',
        insetBlock: 0,
        position: 'absolute',
      }),
      rule({
        inlineSize: own.ratingPitch,
        insetInlineStart: difference(
          product(difference(measured('rating-step', 1), 1), own.ratingPitch),
          quotient(own.ratingMarkGap, 2),
        ),
        own: {
          ratingPitch: quotient(sum('100%', own.ratingMarkGap), measured('rating-steps', 1)),
        },
      }),
    ]),
    /* The score in figures, beside the marks that show it roughly. */
    on('value', [
      rule({
        color: token('color-foreground-muted'),
        fontSize: token('text-sm'),
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1,
      }),
    ]),
    /* A circle, a size smaller, for a level and not a judgment. */
    on('host', [
      rule({ shape: 'dots' }, { own: { ratingMarkSize: hook.size(token('size-icon-sm')) } }),
    ]),
    on('mark', [
      rule({ shape: 'dots' }, { borderRadius: token('radii-full'), maskImage: web('none') }),
    ]),
    on('option', [
      rule(
        { focusVisible: true },
        {
          borderRadius: token('radii-sm'),
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      rule({ formDisabled: true }, { web: { cursor: 'not-allowed' } }),
    ]),
    on('marks', [
      rule({ formDisabled: true }, { opacity: 0.5 }),
      /* A readout is not a control: nothing to press, so nothing that looks pressable. */
      rule({ readonly: true }, { web: { cursor: 'default' } }),
    ]),
    /* A shape passed in, drawn as itself: no mask, and no paint behind it. */
    on({ part: 'mark', selector: '[data-slotted] [part="mark"]' }, [
      web([rule({ backgroundColor: 'transparent', maskImage: 'none' })]),
    ]),
    include(printExact),
    /* Forced colors paint every background Canvas, and a mark is a
       background seen through its shape, so the filled marks take Highlight
       and the empty ones GrayText. */
    on(['track', 'fill'], [rule({ forcedColors: true }, { forcedColorAdjust: 'none' })]),
    on('track', [rule({ forcedColors: true }, { color: 'GrayText' })]),
    on('fill', [rule({ forcedColors: true }, { color: 'Highlight' })]),
    /* A phone draws the star as a vector the mark's size, in its color, and
       a circle as the mark itself. */
    on('star', [
      native([
        rule({ blockSize: '100%', inlineSize: '100%' }),
        rule({ shape: 'dots' }, { display: 'none' }),
      ]),
    ]),
    on('star-shape', [native([rule({ fill: 'currentColor' })])]),
    on('mark', [native([rule({ shape: 'dots' }, { backgroundColor: 'currentColor' })])]),
    /* A phone's row is one control, ringed while the keyboard brings focus to it. */
    on('marks', [
      native([
        rule(
          { focusVisible: true },
          {
            borderRadius: token('radii-sm'),
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
      ]),
    ]),
  ],
)
