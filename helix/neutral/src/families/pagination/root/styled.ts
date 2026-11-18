import {
  difference,
  fn,
  list,
  measured,
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
 * Pagination's styled tier.
 *
 * **It wraps**, as a list of links can, and its pages stay on one line that
 * scrolls in a column too narrow for it. **Every control takes one box**, square
 * by default and growing for a long number, so the arrows line up with the
 * numbers. **The page you are on is a raised chip with an edge**, since a shadow
 * this size cannot part it from the page under the pointer. A gap is quieter than
 * a page. With a single page the row draws nothing.
 *
 * Each control's press reaches `size-target` in a transparent box, and nothing
 * drawn moves.
 */
export default styles(
  root,
  {
    prefix: 'pagination',
    hooks: {
      /* **The page you are on is a raised chip with an edge**, `surface-raised` and
         `border`, beside the hover wash on the others. The selected wash was
         tried in its place, and the owner chose the chip from before the
         rounds, November 10, 2026. */
      currentBackgroundColor: token('color-surface-raised'),
      currentBorderColor: token('color-border'),
      currentFontWeight: token('weight-semibold'),
      currentForegroundColor: token('color-foreground'),
      disabledForegroundColor: token('color-foreground-subtle'),
      disabledOpacity: token('opacity-disabled'),
      ellipsisForegroundColor: token('color-foreground-muted'),
      moveDuration: null,
      moveEasing: null,
      /* The control step, as the buttons it labels step. */
      fontSize: token('text-control'),
      fontWeight: token('weight-medium'),
      foregroundColor: token('color-foreground-muted'),
      gap: token('space-2xs'),
      hoverBackgroundColor: token('color-hover'),
      hoverForegroundColor: token('color-foreground'),
      iconSize: token('size-icon-tight'),
      padding: token('space-2xs'),
      radius: token('radii-sm'),
      size: token('size-control-tight'),
      statusForegroundColor: token('color-foreground-muted'),
    },
    stylesheet: 'pagination/root/pagination-root.generated.css',
  },
  ({ hook, on, rule }) => {
    const glyph = { blockSize: hook.iconSize, inlineSize: hook.iconSize }
    const spent = {
      color: hook.disabledForegroundColor,
      web: { cursor: 'default', pointerEvents: 'none' },
      opacity: hook.disabledOpacity,
    }
    const reach = {
      content: '""',
      inset: quotient(difference(token('size-target'), '100%'), '-2'),
      position: 'absolute',
    }
    return [
      on('host', [
        rule({
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          fontSize: hook.fontSize,
          gap: hook.gap,
        }),
        rule({ empty: true }, { display: 'none' }),
        rule({ print: true }, { display: 'none' }),
      ]),
      /* **The pages slide along the run as it moves**, at the pace and on the
         curve the chip moves by. The web element reads these from its script,
         so they are set here rather than read with a fallback, and a page
         setting either on the element wins over this rule. A phone moves
         nothing: its pages stand in their new places at once. */
      on('host', [
        web([
          rule({
            '--pagination-move-duration': token('duration-normal'),
            '--pagination-move-easing': token('easing-emphasized'),
          }),
        ]),
      ]),
      on('list', [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: hook.gap,
          /* Room either side for a focus ring the scroll would clip. */
          maxInlineSize: sum('100%', product(token('space-2xs'), 2)),
          overflowX: 'auto',
          paddingBlock: token('space-2xs'),
          web: { listStyle: 'none', scrollbarWidth: 'none' },
          marginBlock: product(token('space-2xs'), '-1'),
          marginInline: product(token('space-2xs'), '-1'),
          paddingInline: token('space-2xs'),
        }),
      ]),
      on('item', [rule({ display: 'inline-flex' })]),
      /* **One chip that travels to the page you are on**, drawn as the current
         page's own was, so changing page moves one thing along the run, as
         Toggle Group's selection does. Once it is placed the current page's
         own fill and edge stand aside for it; until then, and in a server's
         first paint, the page draws its own. Behind the pages, which sit above
         it. A phone draws the current page's own chip. */
      on('list', [web([rule({ position: 'relative' })])]),
      on('item', [web([rule({ position: 'relative', zIndex: token('layer-raised') })])]),
      on('indicator', [
        web([
          rule({
            backgroundColor: hook.currentBackgroundColor,
            blockSize: measured('indicator-block-size', 0),
            border: [token('border-thin'), 'solid', hook.currentBorderColor],
            borderRadius: hook.radius,
            boxSizing: 'border-box',
            display: 'block',
            inlineSize: measured('indicator-inline-size', 0),
            insetBlockStart: 0,
            insetInlineStart: 0,
            opacity: 0,
            pointerEvents: 'none',
            position: 'absolute',
            transition: list(
              ['translate', token('duration-normal'), token('easing-emphasized')],
              ['inline-size', token('duration-normal'), token('easing-emphasized')],
              ['opacity', token('duration-fast'), token('easing-standard')],
            ),
            translate: [measured('indicator-x', '0px'), measured('indicator-y', '0px')],
            zIndex: token('layer-base'),
          }),
          rule({ part: { 'data-placed': true } }, { opacity: 1 }),
          /* The page draws its own in forced colors, at the weight that would
             have handed it to the chip, which a Canvas fill would hide. */
          rule({ forcedColors: true }, { display: 'none' }),
        ]),
      ]),
      on(
        ['first', 'gap', 'last', 'page', 'previous', 'next'],
        [
          web([rule({ appearance: 'none', cursor: 'pointer', font: 'inherit' })]),
          rule({
            alignItems: 'center',
            backgroundColor: 'transparent',
            blockSize: hook.size,
            border: [token('border-thin'), 'solid', 'transparent'],
            borderRadius: hook.radius,
            color: hook.foregroundColor,
            display: 'inline-flex',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: hook.fontWeight,
            justifyContent: 'center',
            minInlineSize: hook.size,
            paddingInline: hook.padding,
            textDecoration: 'none',
            /* And the edge, so a page becoming the current one takes its
               frame over the same beat as its fill. */
            transition: list(
              ['background-color', token('duration-fast'), token('easing-standard')],
              ['border-color', token('duration-fast'), token('easing-standard')],
              ['color', token('duration-fast'), token('easing-standard')],
            ),
          }),
          /* Pages sit against each other, so on a touch screen the page itself
             grows to the target. */
          rule(
            { coarsePointer: true },
            {
              blockSize: fn('max', hook.size, token('size-target')),
              minInlineSize: fn('max', hook.size, token('size-target')),
            },
          ),
          rule(
            { hover: true },
            { backgroundColor: hook.hoverBackgroundColor, color: hook.hoverForegroundColor },
          ),
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ],
      ),
      on(
        ['first', 'gap', 'last', 'previous', 'next'],
        [rule({ active: true }, { backgroundColor: token('color-press') })],
      ),
      /* One press machine runs every copy of a page, and a gap pressed can leave the
         row while it is held, so a phone marks the copy under the finger itself. */
      on('page', [
        web([rule({ active: true }, { backgroundColor: token('color-press') })]),
        native([
          rule({ part: { 'data-pressed': true } }, { backgroundColor: token('color-press') }),
        ]),
      ]),
      /* The page you are on stands over the fill of a page under the pointer. On the
         web a page says so with `aria-current`, which the vocabulary reads on no part. */
      on({ part: 'page', selector: '[part~="page"][aria-current="page"]' }, [
        web([
          rule({
            backgroundColor: hook.currentBackgroundColor,
            borderColor: hook.currentBorderColor,
            color: hook.currentForegroundColor,
            fontWeight: hook.currentFontWeight,
          }),
        ]),
      ]),
      /* Once the chip is placed, the current page's own fill and edge stand aside for it. */
      on(
        {
          part: 'page',
          selector:
            '[part="indicator"][data-placed] ~ [part="item"] [part~="page"][aria-current="page"]',
        },
        [
          web([
            rule({ backgroundColor: 'transparent', borderColor: 'transparent' }),
            rule(
              { forcedColors: true },
              {
                backgroundColor: 'Highlight',
                borderColor: 'Highlight',
                color: 'HighlightText',
                forcedColorAdjust: 'none',
              },
            ),
          ]),
        ],
      ),
      on({ part: 'page', selector: '[part~="page"][aria-current="page"]' }, [
        web([
          rule(
            { forcedColors: true },
            {
              backgroundColor: 'Highlight',
              borderColor: 'Highlight',
              color: 'HighlightText',
              forcedColorAdjust: 'none',
            },
          ),
        ]),
      ]),
      /* A phone draws a page and a gap as one press. */
      on('page', [
        native([
          rule(
            { part: { 'data-current': true } },
            {
              backgroundColor: hook.currentBackgroundColor,
              borderColor: hook.currentBorderColor,
              color: hook.currentForegroundColor,
              fontWeight: hook.currentFontWeight,
            },
          ),
          rule({ part: { 'data-gap': true } }, { color: hook.ellipsisForegroundColor }),
        ]),
      ]),
      on(['first', 'last', 'previous', 'next'], [rule({ disabled: true }, spent)]),
      on('mark', [rule(glyph)]),
      on({ region: 'first-icon', slotted: '*' }, [
        rule(glyph),
        web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
      ]),
      on({ region: 'last-icon', slotted: '*' }, [
        rule(glyph),
        web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
      ]),
      on({ region: 'previous-icon', slotted: '*' }, [
        rule(glyph),
        web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
      ]),
      on({ region: 'next-icon', slotted: '*' }, [
        rule(glyph),
        web([rule({ dir: 'rtl' }, { scale: '-1 1' })]),
      ]),
      on('gap', [rule({ color: hook.ellipsisForegroundColor, web: { userSelect: 'none' } })]),
      on('status', [
        rule({
          color: hook.statusForegroundColor,
          fontVariantNumeric: 'tabular-nums',
          fontWeight: hook.fontWeight,
          paddingInline: token('space-xs'),
        }),
      ]),
      on(['first', 'last', 'page', 'previous', 'next'], [rule({ position: 'relative' })]),
      on({ after: 'first' }, [web([rule(reach)])]),
      on({ after: 'last' }, [web([rule(reach)])]),
      on({ after: 'page' }, [web([rule(reach)])]),
      on({ after: 'previous' }, [web([rule(reach)])]),
      on({ after: 'next' }, [web([rule(reach)])]),
    ]
  },
)
