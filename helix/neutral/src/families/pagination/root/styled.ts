import { difference, list, native, product, quotient, token, web } from '../../../style.js'
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
      currentBackgroundColor: token('color-surface-raised'),
      currentBorderColor: token('color-border'),
      currentFontWeight: token('weight-semibold'),
      currentForegroundColor: token('color-foreground'),
      disabledForegroundColor: token('color-foreground-subtle'),
      disabledOpacity: token('opacity-disabled'),
      ellipsisForegroundColor: token('color-foreground-muted'),
      fontSize: token('text-sm'),
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
      on('list', [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: hook.gap,
          maxInlineSize: '100%',
          overflowX: 'auto',
          paddingBlock: token('space-2xs'),
          web: { listStyle: 'none', scrollbarWidth: 'none' },
          marginBlock: product(token('space-2xs'), '-1'),
          marginInline: token('space-none'),
          paddingInline: token('space-none'),
        }),
      ]),
      on('item', [rule({ display: 'inline-flex' })]),
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
            transition: list(
              ['background-color', token('duration-fast'), token('easing-standard')],
              ['color', token('duration-fast'), token('easing-standard')],
            ),
          }),
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
