import { number, oneOf } from '../../../render.js'
import {
  difference,
  fn,
  mix,
  native,
  product,
  quotient,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Skeleton's styled tier.
 *
 * **The shape holds still and its sheen moves.** A block fading in and out
 * reads as something broken, and a highlight traveling across it reads as
 * work going on, so the sweep is a layer twice the shape's width, moved from
 * half off one side to half off the other and clipped by the shape. `pulse`
 * fades the shape instead, and `none` sits still. Reduced motion, and an app
 * that pauses its motion on a phone, still both.
 *
 * **A paragraph is its lines**, each one an `em` tall and a line's leading
 * apart, the last one shorter, as the end of a paragraph is. **On the web a
 * line of text stands in a line box**, its shape an `em` tall in the middle of
 * the line height, so a placeholder takes the height its words will.
 *
 * **Around content, the skeleton is the content's size.** The host takes the
 * content's box, the content keeps its place and is hidden while `loading`,
 * and the shape lies over that box: the single shape, and the paragraph's
 * column, never each line. A page served before the element upgrades has no
 * `wrapping` state yet, so on the web content written inside it stands in for
 * the state until then.
 *
 * **Around a field, its pieces.** The web's element measures a wrapped field
 * and draws a shape over its label, its box, and its hint, each a `piece`,
 * a line rounded fully; a phone draws the one shape over the field.
 */
export default styles(
  root,
  {
    prefix: 'skeleton',
    hooks: ({ own }) => ({
      blockSize: token('size-control'),
      color: scheme(
        mix(token('color-foreground'), 12, 'transparent'),
        mix(token('color-foreground'), 14, 'transparent'),
      ),
      duration: product(token('duration-slow'), 4),
      lastLineSize: '60%',
      /* A piece over a field takes the corner the web's element measured on it. */
      radius: own.skeletonCorner(token('radii-sm')),
      sheenColor: mix(token('color-foreground'), 8, 'transparent'),
      size: token('size-avatar'),
    }),
    own: { skeletonCorner: null, skeletonLeading: null },
    props: {
      effect: oneOf(['none', 'pulse']),
      /* A number on the web, which reads the attribute as one, reflected so
         the sheet sizes a paragraph by it. */
      lines: number(),
      shape: oneOf(['circle', 'text']),
    },
    stylesheet: 'skeleton/root/skeleton-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => {
    /* The leading of a line, half above its words and half below, on the web. */
    const leading = own.skeletonLeading
    return [
      on('host', [
        rule({
          display: 'block',
          inlineSize: '100%',
          own: { skeletonLeading: web(difference('1lh', '1em')) },
        }),
        /* A block stands in for something with no line height to borrow, so it
         takes the control step until a page sizes it. With no height it drew
         nothing. */
        rule({ shape: false }, { blockSize: hook.blockSize }),
        /* A line of text is one line tall whatever it is standing in for. */
        native([rule({ shape: 'text' }, { blockSize: '1em' })]),
        web([
          rule(
            { shape: 'text' },
            { blockSize: '1lh', boxSizing: 'border-box', paddingBlock: quotient(leading, 2) },
          ),
        ]),
        native([rule({ paragraph: true }, { blockSize: 'auto' })]),
        /* The control step, not the bare `2.5rem` it works out to, so a circle
         standing in for an avatar keeps its size inside a `data-density`
         region as the avatar does. */
        rule({ shape: 'circle' }, { aspectRatio: '1 / 1', inlineSize: hook.size }),
        /* Around content: the host takes the content's box. */
        rule(
          { wrapping: true },
          {
            blockSize: 'auto',
            inlineSize: 'fit-content',
            maxInlineSize: '100%',
            paddingBlock: 0,
            position: 'relative',
          },
        ),
        /* Content that is a block fills its line, and the skeleton with it. */
        rule({ wrappingBlock: true }, { inlineSize: '100%' }),
        /* A placeholder for content that never arrives on paper. */
        rule({ print: true }, { display: 'none' }),
      ]),
      /* A paragraph is as tall as its lines. One line, or a count the element
       reads as none, is the single line above. The web's selector keeps the
       shape before the count, and a phone reads the paragraph the element
       works out. */
      /* Written out: a prop's values are refused as one `:not()`, and this writes one for each. */
      on(
        {
          part: 'host',
          selector: ':host([shape="text"][lines]:not([lines="1"]):not([lines="0"]))',
        },
        [web([rule({ blockSize: 'auto', paddingBlock: 0 })])],
      ),
      /* The base fill, the containing block for the sweep, and the clip that
       keeps it inside the corner radius. Nothing on it moves. */
      on('skeleton', [
        rule({
          backgroundColor: hook.color,
          blockSize: '100%',
          borderRadius: hook.radius,
          display: 'block',
          inlineSize: '100%',
          overflow: 'hidden',
          position: 'relative',
        }),
        rule({ shape: 'text' }, { borderRadius: token('radii-full') }),
        rule(
          { effect: 'pulse' },
          {
            animation: ['helix-skeleton-pulse', hook.duration, token('easing-cycle'), 'infinite'],
          },
        ),
        rule({ effect: 'pulse', reducedMotion: true }, { animation: 'none' }),
        /* Forced colors paint every background the page's Canvas color, so the
         placeholder is outlined in GrayText, the system's color for what is not
         there yet, and its sweep is a GrayText band, kept from adjustment so
         the gradient survives. With motion reduced it stays off. */
        rule(
          { forcedColors: true },
          {
            outline: [token('border-thin'), 'solid', 'GrayText'],
            outlineOffset: product(token('border-thin'), '-1'),
          },
        ),
        /* A paragraph's line is a skeleton as well, so its rules are the
         skeleton's, on the shape that is a line. */
        rule({ also: { line: true } }, { blockSize: '1em' }),
        rule({ also: { line: true }, child: ['last', 'later'] }, { inlineSize: hook.lastLineSize }),
      ]),
      on('lines', [
        native([
          rule({
            display: 'flex',
            flexDirection: 'column',
            gap: product(difference(token('leading-normal'), 1), '1em'),
          }),
        ]),
        web([
          rule({
            display: 'flex',
            flexDirection: 'column',
            gap: leading,
            paddingBlock: quotient(leading, 2),
          }),
        ]),
        rule({ wrapping: true }, { blockSize: 'auto', inset: 0, position: 'absolute' }),
        rule({ loading: false, wrapping: true }, { display: 'none' }),
      ]),
      /* The sweep, on a layer of its own so it is moved and not drawn again,
       and an element rather than `::after`, so a page reaches it as
       `::part(sheen)`. */
      on('sheen', [
        rule({
          animation: ['helix-skeleton-sweep', hook.duration, token('easing-cycle'), 'infinite'],
          backgroundImage: fn(
            'linear-gradient',
            '90deg',
            'transparent 0%',
            [hook.sheenColor, '50%'],
            'transparent 100%',
          ),
          display: 'block',
          inlineSize: '200%',
          insetBlock: 0,
          insetInlineStart: 0,
          position: 'absolute',
        }),
        /* The sweep is the whole effect, so with motion reduced the placeholder
         sits there, with nothing animated in its place. */
        rule({ reducedMotion: true }, { animation: 'none', backgroundImage: 'none' }),
        rule(
          { forcedColors: true, reducedMotion: false },
          {
            backgroundImage: fn(
              'linear-gradient',
              '90deg',
              'transparent 35%',
              'GrayText 50%',
              'transparent 65%',
            ),
            web: { forcedColorAdjust: 'none' },
          },
        ),
        /* `effect` picks how the placeholder says it is waiting: the sweep when
         unset, `pulse` fading the fill instead, or `none` sitting still, in
         forced colors too. */
        rule([{ effect: 'pulse' }, { effect: 'none' }], {
          animation: 'none',
          backgroundImage: 'none',
        }),
      ]),
      /* The full radius token, not a bare 50%: `radii-full` is what every
       other circle in the library names. */
      on({ part: 'skeleton', exact: true }, [
        rule({ shape: 'circle' }, { borderRadius: token('radii-full') }),
        /* The shape lies over the content's box. */
        rule({ wrapping: true }, { blockSize: 'auto', inset: 0, position: 'absolute' }),
        /* Once `loading` goes, the shape goes. */
        rule({ loading: false, wrapping: true }, { display: 'none' }),
      ]),
      keyframes('helix-skeleton-pulse', { '50%': { opacity: 0.4 } }),
      /* Written out: the vocabulary names no `:empty`. */
      on({ part: 'host', selector: ':host(:not(:defined):not(:empty))' }, [
        web([
          rule({
            blockSize: 'auto',
            inlineSize: 'fit-content',
            maxInlineSize: '100%',
            position: 'relative',
          }),
        ]),
      ]),
      on('content', [
        rule({ wrapping: true }, { display: 'block' }),
        native([rule({ loading: true, wrapping: true }, { visibility: 'hidden' })]),
      ]),
      /* Written out: the vocabulary names no `:empty`. */
      on({ part: 'content', selector: ':host(:not(:defined):not(:empty)) [part="content"]' }, [
        web([rule({ display: 'block' })]),
      ]),
      /* Written out: the vocabulary names no `:empty`. */
      on({ part: 'skeleton', selector: ':host(:not(:defined):not(:empty)) [part="skeleton"]' }, [
        web([rule({ blockSize: 'auto', inset: 0, position: 'absolute' })]),
      ]),
      /* Written out: the vocabulary names no `:empty`. */
      on({ part: 'lines', selector: ':host(:not(:defined):not(:empty)) [part="lines"]' }, [
        web([rule({ blockSize: 'auto', inset: 0, position: 'absolute' })]),
      ]),
      /* Written out: the vocabulary names no `:empty`. */
      on(
        {
          part: 'skeleton',
          selector: ':host(:not(:defined):not(:empty):not([loading])) [part="skeleton"]',
        },
        [web([rule({ display: 'none' })])],
      ),
      /* Written out: the vocabulary names no `:empty`. */
      on(
        {
          part: 'lines',
          selector: ':host(:not(:defined):not(:empty):not([loading])) [part="lines"]',
        },
        [web([rule({ display: 'none' })])],
      ),
      /* While it loads, the content keeps its place unseen. The web's
       selector keeps the attribute before the state. */
      on({ part: 'content', selector: ':host([loading]:state(wrapping)) [part="content"]' }, [
        web([rule({ visibility: 'hidden' })]),
      ]),
      /* Written out: the vocabulary names no `:empty`. */
      on(
        {
          part: 'content',
          selector: ':host([loading]:not(:defined):not(:empty)) [part="content"]',
        },
        [web([rule({ visibility: 'hidden' })])],
      ),
      keyframes('helix-skeleton-sweep', {
        from: { translate: '-50% 0' },
        to: { translate: '50% 0' },
      }),
      /* The shapes over a wrapped field, each placed where its piece is. */
      on('pieces', [web([rule({ inset: 0, position: 'absolute' })])]),
      on('skeleton', [
        web([
          /* The house corner, which the web's element replaces on each piece, inline,
             with the one it measured on the field. */
          rule(
            { also: { piece: true } },
            { own: { skeletonCorner: token('radii-sm') }, position: 'absolute' },
          ),
          rule(
            { also: { piece: true }, part: { 'data-line': true } },
            { borderRadius: token('radii-full') },
          ),
        ]),
      ]),
    ]
  },
)
