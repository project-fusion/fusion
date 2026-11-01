import {
  difference,
  first,
  fn,
  measured,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import block from './headless.js'

/* What every control here draws around itself while it has focus. */
const FOCUS_RING = [token('size-focus-ring'), 'solid', token('color-focus-ring')]

/**
 * Code Block's styled tier.
 *
 * **A column, so a block given a height spends it on the code.** `display: block`
 * leaves the header and the frame at their content heights and the rest of the
 * host empty: stretched into a 118px row beside a card, the snippet draws 82px of
 * itself and 36px of nothing.
 *
 * **The copy button with no header stands centered on the first line of code**,
 * which is the block's padding and half a line down, and as far from the end as
 * from the top. **A line is `1lh`, read inside the frame**, which sets the code's
 * size and leading. Multiplied out as size times leading, the line was a number
 * only: `--code-block-line-height: 28px` made the product invalid, and the button
 * fell below a one-line block with the block's end padding gone.
 *
 * **The frame has the code's size and leading**, so `1lh` here and in everything
 * inside is one line of code. Nothing in a code frame draws text in the frame's
 * own type. A diff's block holds its code inline, on a line the block's own type
 * would heighten, so a diff reads its line on the code and the button instead.
 *
 * **The header has its hooks because it is half the surface.** With only
 * `--code-block-background-color`, a consumer putting the element on anything other
 * than the page gets a translucent body under an opaque strip. **The corner is a
 * hook** because half of it is on the other part.
 *
 * **The button sets the bar's height, and stands as far from the end as from the
 * top.** At `xs` around a `control-sm` button the bar is 50px with its edges, for
 * one glyph; at `2xs` it is 42px, against 36px for a name alone.
 *
 * **The name is a name**, so it is in the sans face, and a long path wraps before
 * it pushes the copy button off the bar.
 *
 * **The end gutter is reserved only while something stands in it**, which is a
 * block with no header and no `no-copy`.
 *
 * **The code scrolls inside the block's padding.** Scrolled by the `<pre>`, a long
 * line ran under the copy button, because a scroller's end padding exists only at
 * the end of its content: at 390 the button sat on `tone="pri`. A diff keeps the
 * block as its scroller, so its washes run to the edge, and keeps its button in a
 * band above the first hunk.
 *
 * **A band stands behind the code**: the code is its own stacking context, so a
 * band below zero paints over its ground and under its text. On a phone the band
 * is drawn first, and the words stand over it.
 *
 * **A changed line's wash is Tag's resting fill**, the tone at 14% over the ground.
 * `success-surface` is the solid fill a button stands on, and code on it read as an
 * alarm with the `+` vanishing into it. **The `+` is Tag's label ink**: a tone's own
 * ink measured 4.5:1 on its wash against a 4.5 target, and mixed toward the
 * foreground it stays the tone and clears the floor.
 *
 * **A split is two versions side by side where the file has 40rem**, and one above
 * the other where it does not, measured on the file and not the viewport. The rows
 * stay level because every row is one line tall on both sides. **A filler is one
 * line tall by rule**, since a newline at the end of a box starts no line.
 */
export default styles(
  block,
  {
    prefix: 'code-block',
    hooks: {
      addedColor: token('color-success'),
      backdrop: null,
      backgroundColor: token('color-background'),
      borderColor: token('color-border'),
      color: token('color-foreground'),
      expandColor: token('color-foreground-muted'),
      fontFamily: token('font-mono'),
      fontSize: token('text-sm'),
      gutterColor: token('color-foreground-muted'),
      headerBackgroundColor: token('color-surface-raised'),
      labelColor: token('color-foreground-muted'),
      lineHeight: token('leading-normal'),
      markColor: mix(token('color-primary'), 12, 'transparent'),
      markEdgeColor: token('color-primary'),
      maxBlockSize: null,
      radius: token('radii-md'),
      removedColor: token('color-danger'),
    },
    own: {
      codeBlockCopyInset: null,
      codeBlockFace: null,
      codeBlockGutter: null,
      codeBlockLeading: null,
      codeBlockSize: null,
    },
    stylesheet: 'code-block/root/code-block-root.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const edge = [token('border-thin'), 'solid', hook.borderColor]
    const copyInset = sum(
      token('space-sm'),
      quotient(difference('1lh', token('size-control-sm')), 2),
    )
    const addedWash = mix(hook.addedColor, 14, hook.backgroundColor, 'srgb')
    const addedDeep = mix(hook.addedColor, 32, hook.backgroundColor, 'srgb')
    const removedWash = mix(hook.removedColor, 14, hook.backgroundColor, 'srgb')
    const removedDeep = mix(hook.removedColor, 32, hook.backgroundColor, 'srgb')
    const addedInk = mix(hook.addedColor, 55, token('color-foreground'))
    const removedInk = mix(hook.removedColor, 55, token('color-foreground'))
    const flatTop = {
      borderStartEndRadius: token('radii-none'),
      borderStartStartRadius: token('radii-none'),
    } as const
    const roundTop = {
      borderStartEndRadius: hook.radius,
      borderStartStartRadius: hook.radius,
    } as const
    const surface = {
      backgroundColor: hook.backgroundColor,
      border: edge,
      borderRadius: hook.radius,
      margin: token('space-none'),
    } as const
    const backdrop = { backdropFilter: first(hook.backdrop, 'none') } as const
    const ring = { outline: FOCUS_RING, outlineOffset: token('size-focus-offset') } as const
    const ringInside = {
      outline: FOCUS_RING,
      outlineOffset: product(token('size-focus-offset'), '-1'),
    } as const
    const controlWords = {
      color: hook.labelColor,
      fontFamily: token('font-sans'),
      fontSize: token('text-xs'),
      fontWeight: token('weight-medium'),
    } as const
    return [
      on('host', [
        rule({
          display: 'flex',
          flexDirection: 'column',
          own: {
            codeBlockCopyInset: copyInset,
            codeBlockFace: hook.fontFamily,
            codeBlockGutter: sum(token('size-control-sm'), product(own.codeBlockCopyInset, 2)),
            codeBlockLeading: hook.lineHeight,
            codeBlockSize: hook.fontSize,
          },
        }),
        /* What the web's code restates on each part it draws. */
        native([
          rule({
            color: hook.color,
            fontFamily: hook.fontFamily,
            fontSize: hook.fontSize,
            lineHeight: hook.lineHeight,
          }),
        ]),
        rule({ diff: true }, { gap: token('space-md') }),
      ]),
      on('frame', [rule({ flex: 1, position: 'relative' })]),
      on({ part: 'frame', selector: ':host(:not([diff])) [part="frame"]' }, [
        web([rule({ fontSize: own.codeBlockSize, lineHeight: own.codeBlockLeading })]),
      ]),
      on('header', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.headerBackgroundColor,
          border: edge,
          borderEndEndRadius: token('radii-none'),
          borderEndStartRadius: token('radii-none'),
          ...roundTop,
          display: 'flex',
          gap: token('space-sm'),
          paddingBlock: token('space-xs'),
          paddingInline: token('space-md'),
          web: backdrop,
        }),
        native([
          rule(
            { part: { 'data-copied': true } },
            { paddingBlock: token('space-2xs'), paddingInlineEnd: token('space-2xs') },
          ),
          rule({ part: { hidden: true } }, { display: 'none' }),
        ]),
      ]),
      on({ part: 'header', selector: '[part="header"]:has(> [part="copy"])' }, [
        web([
          rule({
            paddingBlock: token('space-2xs'),
            paddingInlineEnd: token('space-2xs'),
          }),
        ]),
      ]),
      on('label', [
        rule({
          ...controlWords,
          minInlineSize: 0,
          web: { overflowWrap: 'anywhere' },
        }),
        native([rule({ flexShrink: 1 }), rule({ part: { hidden: true } }, { display: 'none' })]),
      ]),
      on('block', [
        rule({ blockSize: '100%' }),
        rule({
          ...surface,
          overflowX: 'auto',
          paddingBlock: token('space-sm'),
          paddingInline: token('space-md'),
          web: backdrop,
        }),
        /* The code scrolls on a phone and the block keeps its padding round it. */
        native([
          rule({ display: 'flex', flexDirection: 'row', overflowX: 'visible' }),
          rule({ blockSize: 'auto' }),
          rule({ lineNumbers: true }, { columnGap: token('space-md') }),
          rule({ part: { 'data-beside': true } }, { paddingInlineEnd: own.codeBlockGutter }),
          rule(
            { part: { 'data-flat': true } },
            { borderBlockStartWidth: token('space-none'), ...flatTop },
          ),
          rule({ part: { hidden: true } }, { display: 'none' }),
        ]),
      ]),
      on('copy', [
        native([
          rule({ marginInlineStart: 'auto' }),
          rule({ part: { 'data-after': true } }, { marginInlineStart: token('space-none') }),
          rule(
            { part: { 'data-beside': true } },
            {
              insetBlockStart: own.codeBlockCopyInset,
              insetInlineEnd: own.codeBlockCopyInset,
              marginInlineStart: 0,
              position: 'absolute',
            },
          ),
        ]),
      ]),
      on(
        {
          part: 'copy',
          selector: '[part="copy"]',
        },
        [web([rule({ '--icon-button-size': token('size-control-sm') })])],
      ),
      on({ part: 'copy', selector: '[part="header"] > [part="copy"]' }, [
        web([rule({ marginInlineStart: 'auto' })]),
      ]),
      on('actions', [
        rule({
          alignItems: 'center',
          display: 'flex',
          gap: token('space-2xs'),
          marginInlineStart: 'auto',
        }),
        native([rule({ part: { hidden: true } }, { display: 'none' })]),
      ]),
      on(
        {
          part: 'copy',
          selector:
            '[part="header"] > :is([part="actions"], [part="wrap-toggle"]) ~ :is([part="copy"], [part="wrap-toggle"])',
        },
        [web([rule({ marginInlineStart: token('space-none') })])],
      ),
      on({ part: 'wrap-toggle', selector: ':where(button[part="wrap-toggle"])' }, [
        web([rule({ all: 'unset', boxSizing: 'border-box' })]),
      ]),
      on('wrap-toggle', [
        rule({
          ...controlWords,
          borderRadius: token('radii-sm'),
          marginInlineStart: 'auto',
          paddingBlock: token('space-2xs'),
          paddingInline: token('space-xs'),
          web: { cursor: 'pointer' },
        }),
        rule({ hover: true }, { color: token('color-foreground') }),
        rule({ focusVisible: true }, ring),
        native([
          rule({ part: { 'data-after': true } }, { marginInlineStart: token('space-none') }),
          rule({ part: { 'data-pressed': true } }, { color: token('color-foreground') }),
          rule({ part: { 'data-pressed': true } }, { backgroundColor: token('color-hover') }),
          rule({ part: { 'data-gone': true } }, { display: 'none' }),
        ]),
      ]),
      on({ part: 'wrap-toggle', selector: '[part="wrap-toggle"][aria-pressed="true"]' }, [
        web([
          rule({
            backgroundColor: token('color-hover'),
            color: token('color-foreground'),
          }),
        ]),
      ]),
      on({ part: 'frame', selector: '[part="frame"] > [part="copy"]' }, [
        web([
          rule({
            fontSize: own.codeBlockSize,
            insetBlockStart: own.codeBlockCopyInset,
            insetInlineEnd: own.codeBlockCopyInset,
            lineHeight: own.codeBlockLeading,
            position: 'absolute',
          }),
        ]),
      ]),
      on(
        {
          part: 'block',
          selector:
            ':host(:not([diff], [no-copy])) [part="frame"]:not([part="header"] + *) > [part="block"]',
        },
        [web([rule({ paddingInlineEnd: own.codeBlockGutter })])],
      ),
      on({ part: 'block', selector: '[part="header"] + [part="frame"] [part="block"]' }, [
        web([rule({ borderBlockStartWidth: token('space-none'), ...flatTop })]),
      ]),
      /* File tabs are the header of the files under them, drawn as the header is. */
      on('files', [
        rule({
          backgroundColor: hook.headerBackgroundColor,
          border: edge,
          borderBlockEndWidth: token('space-none'),
          ...roundTop,
          display: 'flex',
          overflowX: 'auto',
          paddingInline: token('space-xs'),
          web: backdrop,
        }),
      ]),
      on('file-tab', [
        rule({
          ...controlWords,
          backgroundColor: 'transparent',
          borderBlockEnd: [token('border-thick'), 'solid', 'transparent'],
          paddingBlock: token('space-xs'),
          paddingInline: token('space-sm'),
          web: { cursor: 'pointer', whiteSpace: 'nowrap' },
        }),
        rule({ hover: true }, { color: token('color-foreground') }),
        native([
          rule(
            { part: { 'data-selected': true } },
            { borderBlockEndColor: token('color-primary'), color: token('color-foreground') },
          ),
        ]),
        rule({ focusVisible: true }, ringInside),
      ]),
      on({ part: 'file-tab', selector: '[part="file-tab"][aria-selected="true"]' }, [
        web([
          rule({ borderBlockEndColor: token('color-primary'), color: token('color-foreground') }),
        ]),
      ]),
      on({ part: 'file-tab', selector: 'button[part="file-tab"]' }, [
        web([rule({ borderBlockStart: 'none', borderInline: 'none' })]),
      ]),
      on(
        { part: 'header', selector: ':host(:state(tabbed)) :is([part="header"], [part="block"])' },
        [web([rule(flatTop)])],
      ),
      on('code', [
        rule({
          color: hook.color,
          web: {
            fontFamily: own.codeBlockFace,
            fontSize: own.codeBlockSize,
            lineHeight: own.codeBlockLeading,
          },
        }),
        rule(
          { diff: false },
          {
            display: 'block',
            isolation: 'isolate',
            maxBlockSize: first(hook.maxBlockSize, 'none'),
            overflowX: 'auto',
            position: 'relative',
          },
        ),
        rule({ expanded: true }, { maxBlockSize: 'none' }),
        rule({ focusVisible: true }, ringInside),
        /* A long file scrolls both ways on a phone, with nothing past a wrap across. */
        native([
          rule({ flex: 1, minInlineSize: 0, overflow: 'auto' }),
          rule({ part: { 'data-wrapped': true } }, { overflowX: 'visible', overflowY: 'auto' }),
        ]),
      ]),
      on({ part: 'code', selector: ':host([wrap]:not([diff])) [part="code"]' }, [
        web([rule({ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' })]),
      ]),
      /* The button under a capped block: a quiet line of text and no second bar. */
      on({ part: 'expand', selector: ':where(button[part="expand"])' }, [
        web([rule({ all: 'unset', boxSizing: 'border-box' })]),
      ]),
      on('expand', [
        rule({
          borderRadius: token('radii-sm'),
          color: hook.expandColor,
          fontSize: token('text-sm'),
          padding: token('space-xs'),
          web: { cursor: 'pointer' },
        }),
        rule({ hover: true }, { color: token('color-foreground') }),
        rule({ focusVisible: true }, ring),
        native([
          rule({ alignSelf: 'flex-start', display: 'flex', flexDirection: 'row' }),
          rule({ fontFamily: token('font-sans') }),
          rule({ part: { 'data-gone': true } }, { display: 'none' }),
        ]),
      ]),
      on({ region: 'expand-icon', slotted: '[slot="expand-icon"]' }, [
        rule({ marginInlineEnd: token('space-xs'), verticalAlign: 'middle' }),
      ]),
      on(
        {
          part: 'block',
          selector:
            '[part="block"]:focus-visible, [part="old"]:focus-visible, [part="new"]:focus-visible',
        },
        [web([rule(ringInside)])],
      ),
      on('mark', [
        rule({
          backgroundColor: hook.markColor,
          blockSize: measured('code-block-mark-size', 0),
          borderInlineStart: [token('border-thick'), 'solid', hook.markEdgeColor],
          boxSizing: 'border-box',
          insetBlockStart: measured('code-block-mark-start', 0),
          insetInlineStart: 0,
          position: 'absolute',
          web: {
            inlineSize: fn('max', '100%', measured('code-block-mark-inline-size', '100%')),
            pointerEvents: 'none',
            zIndex: token('layer-beneath'),
          },
        }),
        rule(
          { also: { 'mark-added': true } },
          {
            backgroundColor: mix(hook.addedColor, 14, 'transparent'),
            borderInlineStartColor: hook.addedColor,
          },
        ),
        rule(
          { also: { 'mark-removed': true } },
          {
            backgroundColor: mix(hook.removedColor, 14, 'transparent'),
            borderInlineStartColor: hook.removedColor,
          },
        ),
        native([rule({ part: { hidden: true } }, { display: 'none' })]),
      ]),
      on({ part: 'block', selector: ':host([line-numbers]:not([diff])) [part="block"]' }, [
        web([
          rule({
            columnGap: token('space-md'),
            display: 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
          }),
        ]),
      ]),
      on('gutter', [
        rule({
          color: hook.gutterColor,
          fontVariantNumeric: 'tabular-nums',
          textAlign: 'end',
          web: {
            fontFamily: own.codeBlockFace,
            fontSize: own.codeBlockSize,
            lineHeight: own.codeBlockLeading,
            userSelect: 'none',
          },
        }),
        native([rule({ part: { hidden: true } }, { display: 'none' })]),
      ]),
      /* The container a split measures itself against, on the file and not the
         host: containment on the host would give a block in a flex row no width. */
      on({ part: 'file', selector: ':host([diff]) [part="file"]' }, [
        web([rule({ containerType: 'inline-size', display: 'flex', flexDirection: 'column' })]),
      ]),
      on(
        {
          part: 'block',
          selector: ':host([diff]) [part="block"], [part="old"], [part="new"]',
        },
        [
          web([
            rule({
              ...surface,
              ...backdrop,
              minInlineSize: 0,
              overflowX: 'auto',
              paddingBlock: [token('space-none'), token('space-sm')],
              paddingInline: token('space-none'),
            }),
          ]),
        ],
      ),
      on('old', [
        native([
          rule({
            ...surface,
            display: 'flex',
            flexDirection: 'column',
            minInlineSize: 0,
            overflow: 'auto',
            paddingBlockEnd: token('space-sm'),
          }),
          rule({ part: { 'data-banded': true } }, { paddingBlockStart: own.codeBlockGutter }),
          rule(
            { part: { 'data-flat': true } },
            { borderBlockStartWidth: token('space-none'), ...flatTop },
          ),
        ]),
      ]),
      on(
        {
          part: 'code',
          selector:
            ':host([diff]:not([no-copy])) [part="frame"]:not([part="header"] + *) :is([part="block"], [part="old"], [part="new"]) > [part="code"]',
        },
        [web([rule({ marginBlockStart: own.codeBlockGutter })])],
      ),
      on(
        {
          part: 'block',
          selector: '[part="header"] + [part="frame"] :is([part="block"], [part="split"] > *)',
        },
        [web([rule({ borderBlockStartWidth: token('space-none'), ...flatTop })])],
      ),
      on('split', [
        rule({
          display: 'grid',
          gap: token('space-xs'),
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        }),
        rule({ inlineSize: { below: '40rem' } }, { gridTemplateColumns: 'minmax(0, 1fr)' }),
        native([
          rule({ inlineSize: { below: '40rem' } }, { display: 'flex', flexDirection: 'column' }),
        ]),
        native([rule({ part: { hidden: true } }, { display: 'none' })]),
      ]),
      on({ part: 'new', selector: '[part="header"] + [part="frame"] [part="new"]' }, [
        web([
          rule(
            { inlineSize: { below: '40rem' } },
            { borderBlockStartWidth: token('border-thin'), ...roundTop },
          ),
        ]),
      ]),
      on(
        {
          part: 'new',
          selector:
            ':host([diff]:not([no-copy])) [part="frame"]:not([part="header"] + *) [part="new"] > [part="code"]',
        },
        [
          web([
            rule({ inlineSize: { below: '40rem' } }, { marginBlockStart: token('space-none') }),
          ]),
        ],
      ),
      on({ part: 'code', selector: ':host([diff]) [part="code"]' }, [
        web([rule({ display: 'inline-block', minInlineSize: '100%' })]),
      ]),
      on(
        ['hunk', 'context', 'filler'],
        [
          rule({
            display: 'flex',
            paddingInline: token('space-md'),
            textDecoration: 'none',
          }),
        ],
      ),
      on('hunk', [
        rule({
          backgroundColor: token('color-surface-sunken'),
          color: token('color-foreground-muted'),
        }),
        native([rule({ part: { hidden: true } }, { display: 'none' })]),
      ]),
      on({ part: 'fold', selector: ':where(button[part="fold"], span[part="fold"])' }, [
        web([rule({ all: 'unset' })]),
      ]),
      on('fold', [
        rule({
          backgroundColor: token('color-surface-sunken'),
          boxSizing: 'border-box',
          color: token('color-foreground-muted'),
          display: 'flex',
          fontFamily: token('font-sans'),
          inlineSize: '100%',
          paddingInline: token('space-md'),
          web: { cursor: 'pointer' },
        }),
        rule({ hover: true }, { color: token('color-foreground') }),
        rule({ focusVisible: true }, ringInside),
        native([rule({ part: { 'data-gone': true } }, { display: 'none' })]),
      ]),
      /* The web draws an `<ins>` and a `<del>` where a phone marks one row. */
      on({ part: 'context', selector: '[part="added"]' }, [
        web([rule({ backgroundColor: addedWash })]),
      ]),
      on({ part: 'context', selector: '[part="removed"]' }, [
        web([rule({ backgroundColor: removedWash })]),
      ]),
      on({ part: 'context', selector: '[part="added"], [part="removed"]' }, [
        web([
          rule({
            display: 'flex',
            paddingInline: token('space-md'),
            textDecoration: 'none',
          }),
        ]),
      ]),
      on('context', [
        native([
          rule({ also: { added: true } }, { backgroundColor: addedWash }),
          rule({ also: { removed: true } }, { backgroundColor: removedWash }),
          rule({ alignSelf: 'stretch' }),
          rule({ part: { hidden: true } }, { display: 'none' }),
        ]),
      ]),
      on({ part: 'added', selector: '[part~="added"] [part="changed"]' }, [
        web([rule({ backgroundColor: addedDeep, borderRadius: token('radii-sm') })]),
      ]),
      on({ part: 'removed', selector: '[part~="removed"] [part="changed"]' }, [
        web([rule({ backgroundColor: removedDeep, borderRadius: token('radii-sm') })]),
      ]),
      on('changed', [
        native([
          rule({ part: { 'data-added': true } }, { backgroundColor: addedDeep }),
          rule({ part: { 'data-removed': true } }, { backgroundColor: removedDeep }),
        ]),
      ]),
      on('marker', [
        rule({
          paddingInlineEnd: token('space-xs'),
          web: { userSelect: 'none' },
        }),
        native([
          rule({ part: { 'data-added': true } }, { color: addedInk }),
          rule({ part: { 'data-removed': true } }, { color: removedInk }),
        ]),
      ]),
      on({ part: 'marker', selector: '[part~="added"] [part="marker"]' }, [
        web([rule({ color: addedInk })]),
      ]),
      on({ part: 'marker', selector: '[part~="removed"] [part="marker"]' }, [
        web([rule({ color: removedInk })]),
      ]),
      on('filler', [
        rule({ backgroundColor: token('color-surface-sunken'), minBlockSize: '1lh' }),
        native([rule({ part: { hidden: true } }, { display: 'none' })]),
      ]),
      on('number', [
        rule({
          color: token('color-foreground-muted'),
          fontVariantNumeric: 'tabular-nums',
          paddingInlineEnd: token('space-sm'),
          web: { userSelect: 'none' },
        }),
      ]),
      /* A diff prints every line, and its washes, which are the meaning. */
      on('host', [web([rule({ print: true }, { backgroundColor: 'transparent' })])]),
      on(
        {
          part: 'block',
          selector: ':host([diff]) [part="block"], [part="old"], [part="new"]',
        },
        [web([rule({ print: true }, { overflow: 'visible', whiteSpace: 'pre-wrap' })])],
      ),
      on(
        {
          part: 'context',
          selector:
            '[part="added"], [part="removed"], [part="changed"], [part="hunk"], [part="filler"]',
        },
        [web([rule({ print: true }, { printColorAdjust: 'exact' })])],
      ),
      on({ part: 'number', selector: '[part="gutter"] > [part="number"]' }, [
        web([
          rule({
            blockSize: measured('code-block-line-size', 'auto'),
            color: 'inherit',
            display: 'block',
            paddingInlineEnd: token('space-none'),
          }),
        ]),
      ]),
    ]
  },
)
