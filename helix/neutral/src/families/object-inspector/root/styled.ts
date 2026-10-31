import { fn, measured, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import inspector from './headless.js'

const edge = [token('border-thin'), 'solid'] as const

/* How far a row at the root stands in: the row's gutter, and on a leaf, the
   caret's width and the gap after it. */
const depth = product(measured('object-inspector-level'), token('space-lg'))
const gutter = sum(token('space-sm'), '1em', token('space-2xs'))

/**
 * Object Inspector's styled tier: Code Block's frame, because a value is code a
 * reader happens to be able to fold. The same ground, edge and corner, the name
 * in a bar over it, and the copy button in the corner of the code.
 *
 * **The filter field is a band of the same frame**, under the header where
 * there is one, so the three read as one box.
 *
 * **A definite height under `windowed`, because windowing is measured against
 * it.** A maximum would leave the height a function of the rows drawn while the
 * rows drawn are a function of the height.
 *
 * **One line per entry, and a long string ends in an ellipsis** rather than
 * wrapping, so every row is the same height: that is what lets a windowed tree
 * place ten thousand of them without measuring each. A phone lays a row out in
 * a line, where the web flows its text, and the string is what gives up room.
 *
 * **A branch spends its caret's width on the caret**, where a leaf spends it on
 * an indent, so every key at one depth starts on one line.
 *
 * **Each type in its own ink**, from the syntax set the code blocks use, so a
 * string, a number and a null read as three different things at a glance. The
 * text says the same for a reader who cannot see the color: a string keeps its
 * quotes and a null is spelled.
 *
 * **What stands above another part, a sibling selector on the web, is a flag on
 * a phone**, and so is a key on a matched row, which takes the foreground ink:
 * in the default theme the name ink measures 4.27:1 on the match ground, under
 * the 4.5:1 that text needs.
 */
export default styles(
  inspector,
  {
    prefix: 'object-inspector',
    hooks: {
      backgroundColor: token('color-background'),
      blockSize: '24em',
      borderColor: token('color-border'),
      headerBackgroundColor: token('color-surface-raised'),
      matchBackgroundColor: token('color-accent-subtle'),
      radius: token('radii-lg'),
    },
    stylesheet: 'object-inspector/root/object-inspector-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [rule({ display: 'flex', flexDirection: 'column', fontSize: token('text-sm') })]),
    on('header', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.headerBackgroundColor,
        border: [...edge, hook.borderColor],
        borderBlockEnd: 'none',
        borderStartEndRadius: hook.radius,
        borderStartStartRadius: hook.radius,
        display: 'flex',
        paddingBlock: token('space-xs'),
        paddingInline: token('space-md'),
      }),
    ]),
    /* The name is a name, and code is the mono face's. */
    on('label', [
      rule({
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        fontWeight: token('weight-medium'),
      }),
    ]),
    on('frame', [rule({ position: 'relative' })]),
    on('tree', [
      rule({
        backgroundColor: hook.backgroundColor,
        border: [...edge, hook.borderColor],
        borderRadius: hook.radius,
        fontFamily: token('font-mono'),
        lineHeight: token('leading-normal'),
        paddingBlock: token('space-xs'),
      }),
      rule(
        { windowed: true },
        { blockSize: hook.blockSize, web: { overflowY: 'auto', overscrollBehavior: 'contain' } },
      ),
      rule({ print: true }, { blockSize: 'auto', overflow: 'visible' }),
      native([
        rule(
          { part: { 'data-topped': true } },
          {
            borderStartEndRadius: token('radii-none'),
            borderStartStartRadius: token('radii-none'),
          },
        ),
      ]),
    ]),
    on('search-field', [
      rule({
        backgroundColor: hook.backgroundColor,
        border: [...edge, hook.borderColor],
        borderBlockEnd: 'none',
        borderStartEndRadius: hook.radius,
        borderStartStartRadius: hook.radius,
        color: token('color-foreground'),
        fontFamily: token('font-sans'),
        fontSize: fn('max', token('text-field-min'), token('text-sm')),
        inlineSize: '100%',
        margin: '0',
        paddingBlock: token('space-xs'),
        paddingInline: token('space-md'),
        web: { appearance: 'none', boxSizing: 'border-box' },
      }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      native([
        rule(
          { label: { not: '' } },
          {
            borderStartEndRadius: token('radii-none'),
            borderStartStartRadius: token('radii-none'),
          },
        ),
      ]),
    ]),
    on({ part: 'search-field', selector: '[part="header"] + [part="search-field"]' }, [
      web([
        rule({
          borderStartEndRadius: token('radii-none'),
          borderStartStartRadius: token('radii-none'),
        }),
      ]),
    ]),
    on(
      {
        part: 'tree',
        selector: ':is([part="header"], [part="search-field"]) ~ [part="frame"] [part="tree"]',
      },
      [
        web([
          rule({
            borderStartEndRadius: token('radii-none'),
            borderStartStartRadius: token('radii-none'),
          }),
        ]),
      ],
    ),
    on('row', [
      rule({
        paddingInlineEnd: token('space-2xl'),
        paddingInlineStart: sum(depth, gutter),
        web: {
          cursor: 'default',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }),
      native([
        rule({ alignItems: 'center', display: 'flex', flexDirection: 'row' }),
        rule(
          { part: { 'data-branch': true } },
          { paddingInlineStart: sum(depth, token('space-sm')) },
        ),
      ]),
    ]),
    on('empty', [
      rule({
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        paddingInline: gutter,
      }),
    ]),
    on({ part: 'row', selector: '[part~="row"][aria-expanded]' }, [
      web([rule({ cursor: 'pointer', paddingInlineStart: sum(depth, token('space-sm')) })]),
    ]),
    on({ part: 'row', selector: '[part="tree"]:focus-within [part~="row-active"]' }, [
      web([rule({ backgroundColor: token('color-surface-sunken') })]),
    ]),
    /* The part's second name and no attribute beside it: nothing can follow
       `::part()` with an attribute selector. A phone marks the row once a reader
       has touched the tree, which it holds as the web holds focus. */
    on('row', [
      native([
        rule({ also: { 'row-active': true } }, { backgroundColor: token('color-surface-sunken') }),
      ]),
      /* The row the keys are on holds focus, so the ring is the row's own. */
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      /* What a filter matched, under the ground the active row takes. */
      rule({ also: { 'row-match': true } }, { backgroundColor: hook.matchBackgroundColor }),
    ]),
    on('toggle', [
      rule({
        blockSize: '1em',
        color: token('color-foreground-muted'),
        inlineSize: '1em',
        marginInlineEnd: token('space-2xs'),
        web: { verticalAlign: '-0.125em' },
      }),
    ]),
    on('key', [
      rule({ color: token('color-syntax-name') }),
      native([rule({ part: { 'data-matched': true } }, { color: token('color-foreground') })]),
    ]),
    on({ part: 'key', selector: '[part~="row-match"] [part="key"]' }, [
      web([rule({ color: token('color-foreground') })]),
    ]),
    on('colon', [native([rule({ color: token('color-foreground') })])]),
    on('string', [
      rule({ color: token('color-syntax-string') }),
      native([rule({ flexShrink: '1' })]),
    ]),
    on('number', [rule({ color: token('color-syntax-constant') })]),
    on(['boolean', 'null'], [rule({ color: token('color-syntax-keyword') })]),
    on(['summary', 'count'], [rule({ color: token('color-foreground-muted') })]),
    on('count', [
      rule({
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        marginInlineStart: token('space-xs'),
      }),
      /* The web has a space in the mono face before the count. */
      native([rule({ marginInlineStart: sum(token('space-xs'), '1ch') })]),
    ]),
    on('copy', [
      rule({
        insetBlockStart: token('space-2xs'),
        insetInlineEnd: token('space-2xs'),
        position: 'absolute',
      }),
      rule({ print: true }, { display: 'none' }),
    ]),
    /* What a row does not draw, which a phone keeps in its tree. */
    on(
      ['toggle', 'key', 'colon', 'summary', 'count', 'string', 'number', 'boolean', 'null'],
      [native([rule({ part: { hidden: true } }, { display: 'none' })])],
    ),
  ],
)
