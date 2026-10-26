import {
  difference,
  fn,
  inherit,
  list,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Kbd's styled tier, which writes `helix/styled/src/kbd/root/kbd-root.generated.css`.
 *
 * **Drawn as a physical key**: a hairline border, a sunken fill, and one
 * inset shadow along the bottom edge. Sized in `em`, so it stays in
 * proportion with the words around it, a heading's too.
 *
 * **A phone draws the key as a box in the line of words**, which keeps its
 * size and its border and does not break across lines, its label centered
 * in the box. The web centers the key and its label on the capitals of the
 * words around it. Both draw a cap per key under `caps`.
 */
export default styles(
  root,
  {
    prefix: 'kbd',
    hooks: {
      backgroundColor: token('color-surface-sunken'),
      blockSize: '1.5em',
      borderColor: token('color-border'),
      color: token('color-foreground-muted'),
      fontFamily: token('font-mono'),
      fontSize: '0.85em',
      fontWeight: token('weight-medium'),
      gap: token('space-2xs'),
      paddingInline: '0.4em',
      radius: token('radii-sm'),
      separatorColor: token('color-foreground-muted'),
    },
    own: { kbdHeight: null, kbdInset: null, kbdSize: null },
    stylesheet: 'kbd/root/kbd-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    /* Half the inside of the face, less a pixel, and half the cap height:
       how far the label's baseline sits below the face's top border. */
    const lift = sum(
      quotient(difference(difference(own.kbdHeight, product(token('border-thin'), 2)), '1px'), 2),
      '0.5cap',
    )
    return [
      /* Relative to the words around it, because a key inside a heading has
       to be key-sized in that heading. 0.85 rather than 0.75: three
       quarters of 13px is a 9.75px glyph, and an arrow that small in the
       mono face is a smudge. */
      on('host', [
        rule({
          font: inherit(),
          own: { kbdSize: hook.fontSize, kbdInset: hook.paddingInline },
        }),
        /* **The key is centered on the capitals of the words beside it.** `middle`
         on the face puts its middle half an x-height above this box's baseline,
         and this box goes up by the rest of the way to half the cap height, less
         half the pressed edge, so the inside of the face lands on the capitals.
         The box has no height of its own, so it is the key's height in a line or
         in a flex row. The height is in whole pixels, so the face is drawn at the
         height it is laid out at: unrounded, a 17.85px face drew 17px tall in
         Chromium and 18px in WebKit. */
        web([
          rule({
            display: 'inline-block',
            lineHeight: 0,
            verticalAlign: 'calc(0.5cap - 0.5ex - 0.5px)',
            own: { kbdHeight: fn('round', hook.blockSize, '1px') },
          }),
        ]),
        /* A phone lays the key out as a box in the line of words. */
        native([rule({ display: 'inline-flex', own: { kbdHeight: hook.blockSize } })]),
        rule({ print: true }, { boxShadow: 'none' }),
      ]),
      on('kbd', [
        rule({
          backgroundColor: hook.backgroundColor,
          blockSize: own.kbdHeight,
          border: [token('border-thin'), 'solid', hook.borderColor],
          borderRadius: hook.radius,
          /* One edge rather than a drop shadow: a key is pressed into the page. */
          boxShadow: ['inset', 0, '-1px', 0, 0, hook.borderColor],
          color: hook.color,
          fontFamily: hook.fontFamily,
          /* A key label is literal: `<-` and `=>` must not become arrows. */
          fontFeatureSettings: list(['"liga"', 0], ['"calt"', 0]),
          fontSize: own.kbdSize,
          fontVariantLigatures: 'none',
          fontWeight: hook.fontWeight,
          /* Square at minimum, so one character is not a narrow sliver. */
          minInlineSize: own.kbdHeight,
          paddingInline: own.kbdInset,
          /* The box has a fixed `block-size`, so a wrapped label overflows it. */
          whiteSpace: 'nowrap',
        }),
        /* The label's line takes its height from the empty block below alone. */
        web([
          rule({
            display: 'inline-block',
            lineHeight: 0,
            textAlign: 'center',
            verticalAlign: 'middle',
          }),
        ]),
        /* Centered in the box on a phone, and down by the floor: the inset shadow
         takes a pixel off the bottom, so centering in the box centers in the
         wrong one. */
        native([
          rule({
            alignItems: 'center',
            display: 'inline-flex',
            justifyContent: 'center',
            lineHeight: 1,
            paddingBlockStart: token('border-thin'),
          }),
        ]),
        /* Under `caps` a chord is a key per key: the whole is a row of caps with
         a gap between, and each key takes the cap the whole took. The `+`
         between two keys keeps a line of its own, centered between them. */
        rule(
          { caps: true },
          {
            backgroundColor: 'transparent',
            border: 0,
            boxShadow: 'none',
            display: 'inline-flex',
            gap: hook.gap,
            lineHeight: 1,
            minInlineSize: 0,
            padding: 0,
          },
        ),
      ]),
      /* **The label is centered on its capitals inside the face's edges.** This
       empty block is the tallest thing on the label's line, and it ends on the
       baseline, which puts the baseline half the inside of the face below its
       top border, plus half the label's cap height. A centered line box put
       the capitals where the face's ascent and descent did: 0.66px high for K
       and 0.95px high for Cmd on a 14px line in Chromium. */
      on({ before: 'kbd' }, [
        web([
          rule({
            blockSize: lift,
            content: '""',
            display: 'inline-block',
          }),
          rule({ caps: true }, { content: 'none' }),
        ]),
      ]),
      on({ before: 'key' }, [
        web([
          rule(
            { caps: true },
            {
              blockSize: lift,
              content: '""',
              display: 'inline-block',
            },
          ),
        ]),
      ]),
      on('key', [
        rule(
          { caps: true },
          {
            backgroundColor: hook.backgroundColor,
            blockSize: own.kbdHeight,
            border: [token('border-thin'), 'solid', hook.borderColor],
            borderRadius: hook.radius,
            boxShadow: ['inset', 0, '-1px', 0, 0, hook.borderColor],
            minInlineSize: own.kbdHeight,
            paddingInline: own.kbdInset,
          },
        ),
        web([
          rule({ caps: true }, { display: 'inline-block', lineHeight: 0, textAlign: 'center' }),
        ]),
        native([
          rule(
            { caps: true },
            {
              alignItems: 'center',
              display: 'inline-flex',
              justifyContent: 'center',
              paddingBlockStart: token('border-thin'),
            },
          ),
        ]),
      ]),
      /* The `+` between two caps, where the platform writes one. */
      on('separator', [rule({ color: hook.separatorColor })]),
    ]
  },
)
