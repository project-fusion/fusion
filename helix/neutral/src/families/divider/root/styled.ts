import printEconomy from '../../../fragments/print-economy.js'
import { inherit, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Divider's styled tier, which writes `helix/styled/src/divider/root/divider-root.generated.css`.
 *
 * **A line, whatever is set into it, and a line**, in a flex line with no
 * gap, so the two halves take what the content leaves and a divider with
 * nothing in it is one continuous line. The space belongs to the content,
 * which takes it away with it when there is none.
 *
 * **The inset is space taken off both ends of the line**, so a divider
 * between list rows can start where the text starts.
 *
 * **Content toward one end** keeps a short length of line before it under
 * `content-placement="start"` and after it under `end`. The web gives the
 * length only where content is set in. A phone gives it to the first or the
 * last line whether or not there is content, which draws the same line,
 * since the two halves meet with no gap.
 */
export default styles(
  root,
  {
    prefix: 'divider',
    hooks: [
      'color',
      'content-color',
      'content-font-family',
      'content-font-size',
      'content-font-weight',
      'content-gap',
      'content-offset',
      'length',
      'padding',
      'padding-end',
      'padding-start',
      'thickness',
    ],
    own: ['divider-thickness'],
    props: [prop('content-placement', ['end', 'start'])],
    stylesheet: 'divider/root/divider-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        display: 'flex',
        own: { thickness: hook.thickness(token('border-thin')) },
      }),
      rule({
        paddingInlineEnd: hook.paddingEnd(hook.padding(token('space-none'))),
        paddingInlineStart: hook.paddingStart(hook.padding(token('space-none'))),
      }),
      /* Stretched to the flex or grid parent, so a divider between toolbar
         items matches them without being told how tall they are, unless
         `--divider-length` says how long it is. */
      rule(
        { state: 'vertical' },
        {
          paddingBlockEnd: hook.paddingEnd(hook.padding(token('space-none'))),
          paddingBlockStart: hook.paddingStart(hook.padding(token('space-none'))),
          paddingInline: token('space-none'),
          alignSelf: 'stretch',
          display: 'inline-flex',
          flexDirection: 'column',
          blockSize: hook.length('auto'),
        },
      ),
    ]),
    /* What is set into the line, and the space either side of it. */
    on('content', [
      rule({
        color: hook.contentColor(token('color-foreground-muted')),
        marginInline: hook.contentGap(token('space-sm')),
        display: 'inline-flex',
        flex: '0 0 auto',
        fontFamily: hook.contentFontFamily(token('font-sans')),
        fontSize: hook.contentFontSize(token('text-xs')),
        fontWeight: hook.contentFontWeight(inherit()),
        lineHeight: token('leading-tight'),
        whiteSpace: 'nowrap',
      }),
      /* Nothing set in: no region, and no gap either side of it. */
      rule({ part: { 'data-empty': true } }, { display: 'none' }),
      rule({ part: { hidden: true }, platform: 'native' }, { display: 'none' }),
      rule(
        { state: 'vertical' },
        { marginBlock: hook.contentGap(token('space-sm')), marginInline: token('space-none') },
      ),
    ]),
    /* An element set in keeps to one line too, over a white-space of its
       own. The words a phone sets in take the content's one line. */
    on({ part: 'content', inner: 'slot::slotted(*)' }, [
      rule({ platform: 'web' }, { whiteSpace: 'nowrap' }),
    ]),
    on('line', [
      rule({ backgroundColor: hook.color(token('color-border')) }),
      /* `flex: 1` and no full width, so the two halves share what the content
         leaves. */
      rule({ state: { vertical: false } }, { blockSize: own.thickness, flex: '1 1 0' }),
      /* One line of text is the least a stretched line is, where its parent
         resolves to no height. */
      rule(
        { state: 'vertical' },
        { flex: '1 1 0', inlineSize: own.thickness, minBlockSize: '1em' },
      ),
      rule(
        [
          { child: 'first', 'content-placement': 'start', platform: 'native' },
          { child: 'last', 'content-placement': 'end', platform: 'native' },
        ],
        { flex: ['0', '0', hook.contentOffset(token('space-lg'))] },
      ),
      /* Forced colors paint every background the page's Canvas color, so the
         line keeps the text color, as an `<hr>` does there. */
      rule(
        { forcedColors: true },
        { backgroundColor: web('CanvasText'), forcedColorAdjust: web('none') },
      ),
    ]),
    on(
      {
        part: 'line',
        selector:
          ':host([content-placement="start"]) [part="line"]:has(+ [part="content"]:not([data-empty])),\n:host([content-placement="end"]) [part="content"]:not([data-empty]) + [part="line"]',
      },
      [rule({ platform: 'web' }, { flex: ['0', '0', hook.contentOffset(token('space-lg'))] })],
    ),
    /* A rule, which prints. */
    include(printEconomy),
  ],
)
