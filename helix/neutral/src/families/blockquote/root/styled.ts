import printEconomy from '../../../fragments/print-economy.js'
import { inherit, quote, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Blockquote's styled tier, which writes `helix/styled/src/blockquote/root/blockquote-root.generated.css`.
 *
 * **Set in the display face, larger than body text**, to mark a change of
 * voice, with the attribution smaller and quieter under it.
 *
 * **`marks` draws one large opening mark**, in the element's language. On the
 * web it floats beside the passage's first lines, so the passage wraps
 * beside it. A phone has no float, so the mark stands over the passage on a
 * line of its own, as it does on the web under `text-align` `center` or `end`.
 *
 * **`text-wrap` breaks the lines on a phone too**: `balance` and `pretty`
 * choose Android's balanced and high-quality line breaking, and iOS's
 * standard, which has no balance of its own.
 */
export default styles(
  root,
  {
    prefix: 'blockquote',
    hooks: [
      'attribution-color',
      'attribution-font-family',
      'attribution-font-weight',
      'attribution-size',
      'color',
      'font-family',
      'font-weight',
      'gap',
      'letter-spacing',
      'line-height',
      'mark-color',
      'mark-size',
      'size',
    ],
    props: [
      prop('text-align', ['start', 'center', 'end']),
      prop('text-wrap', ['balance', 'pretty']),
    ],
    stylesheet: 'blockquote/root/blockquote-root.generated.css',
  },
  ({ hook, include, on, rule, variants }) => [
    on('host', [
      rule({ display: 'block' }),
      /* Logical values, so `end` is the far edge in a right-to-left column too. */
      variants('text-align', {
        start: { textAlign: 'start' },
        center: { textAlign: 'center' },
        end: { textAlign: 'end' },
      }),
      /* Inherited by the passage and the attribution alike. */
      variants('text-wrap', {
        balance: { textWrap: 'balance' },
        pretty: { textWrap: 'pretty' },
      }),
    ]),
    /* The figure is a frame for the passage and its caption, with no space
       of its own. */
    on('figure', [rule({ margin: token('space-none') })]),
    /* Block, not flex. */
    on('blockquote', [rule({ display: 'block', margin: token('space-none') })]),
    /* **Under `marks`, one large opening mark beside the passage's first
       lines**, floated, so the passage wraps beside it whether it is text or
       paragraphs. Drawn and not read, and closed at the end without a mark,
       so a `Quote` after the passage takes the outer marks again. */
    on({ before: 'blockquote' }, [
      rule(
        { marks: true },
        {
          color: hook.markColor(token('color-foreground-subtle')),
          content: quote('open', '""'),
          float: web('inline-start'),
          fontFamily: hook.fontFamily(token('font-display')),
          fontSize: hook.markSize(token('text-3xl')),
          lineHeight: 1,
          marginInlineEnd: token('space-xs'),
        },
      ),
      /* Centered or at the end, a mark floated to the start would stand apart
         from the first line or pull it off the middle, so it stands over the
         passage on a line of its own, and its line is shortened so the passage
         stays close under it. */
      rule(
        [
          { marks: true, 'text-align': 'center' },
          { marks: true, 'text-align': 'end' },
        ],
        {
          display: 'block',
          float: web('none'),
          lineHeight: 0.75,
          marginInlineEnd: token('space-none'),
        },
      ),
    ]),
    on({ after: 'blockquote' }, [rule({ marks: true }, { content: quote('no-close') })]),
    /* On the region, not on what was passed into it: a step back from full
       strength, in the display face. */
    on({ region: 'default' }, [
      rule({
        color: hook.color(token('color-foreground-muted')),
        fontFamily: hook.fontFamily(token('font-display')),
        fontSize: hook.size(token('text-xl')),
        fontWeight: hook.fontWeight(token('weight-medium')),
        letterSpacing: hook.letterSpacing(token('tracking-tight')),
        lineHeight: hook.lineHeight(token('leading-tight')),
      }),
    ]),
    on({ region: 'default', slotted: '*' }, [rule({ margin: token('space-none') })]),
    on('attribution', [
      rule({
        color: hook.attributionColor(token('color-foreground-muted')),
        fontFamily: hook.attributionFontFamily(inherit()),
        fontSize: hook.attributionSize(token('text-sm')),
        fontWeight: hook.attributionFontWeight(inherit()),
        /* Room to be a separate thing. */
        marginBlockStart: hook.gap(token('space-sm')),
      }),
      /* Nothing said it, so no caption and no gap under the passage. The web
         element marks the caption empty once it sees it is; a phone reads the
         same from the attribution it is given. */
      rule({ part: { 'data-empty': true } }, { display: 'none' }),
      rule({ part: { hidden: true }, platform: 'native' }, { display: 'none' }),
    ]),
    include(printEconomy),
  ],
)
