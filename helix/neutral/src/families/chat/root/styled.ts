import chatTyping from '../../../fragments/chat-typing.js'
import {
  difference,
  fn,
  hookOf,
  list,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import chat from './headless.js'

const rule_ = [token('border-thin'), 'solid'] as const

/**
 * Chat's styled tier: five rows, the header, the transcript that scrolls, the way
 * back over it, the status band, and the composer. Only the transcript scrolls, so
 * the composer stays in view while a reader goes back to read.
 *
 * **Each region names its own row**, because a hidden grid item leaves the grid and
 * the rows below it would move up a track with that track's sizing. A phone stands
 * the same five in a column, the transcript taking what is left.
 *
 * **Too few turns to fill the transcript sit at its bottom**, as a conversation
 * looks. `safe` keeps the overflow at the end a scroll reaches.
 *
 * **The way back sits over the transcript**, so offering it moves nothing a reader
 * is reading, with the edge and the lift of a surface over content.
 *
 * **Turns from data carry the space between them inside themselves**, since a
 * window places a turn by the height it measured, and a gap is room no turn measures.
 *
 * **The status band is emptied and never hidden**, because it is a live region, and
 * one that is `display: none` is out of the accessibility tree.
 *
 * **The turns in outline take the places turns take**, each a message's bubble with
 * its corner, its padding, and its widest measure, and the reader's own against the
 * end edge. A phone draws them in a column of their own at the log's gap.
 */
export default styles(
  chat,
  {
    prefix: 'chat',
    hooks: {
      gap: token('space-md'),
      maxBlockSize: 'none',
      paddingInline: token('space-md'),
      resumeBorderColor: token('color-border'),
      resumeBorderWidth: token('border-floating'),
      resumeShadow: token('shadow-floating'),
      rule: token('color-border'),
      scrollbarThumbColor: token('scrollbar-thumb-color'),
      scrollbarThumbHoverColor: token('scrollbar-thumb-hover-color'),
      scrollbarTrackColor: token('scrollbar-track-color'),
      typingColor: token('color-foreground-muted'),
      typingGap: token('space-xs'),
    },
    own: {
      collectionInsetBlock: null,
      collectionInsetInline: null,
      chatLeading: null,
      chatTypingCycle: null,
    },
    stylesheet: 'chat/root/chat-root.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => [
    on('host', [
      rule({
        display: 'grid',
        maxBlockSize: hook.maxBlockSize,
        minBlockSize: 0,
        web: { gridTemplateRows: 'auto minmax(0, 1fr) auto auto auto' },
      }),
      web([rule({ print: true }, { maxBlockSize: 'none' })]),
      native([rule({ display: 'flex', flexDirection: 'column' })]),
    ]),
    on('header', [
      rule({
        '--helix-size-tag': token('size-tag-sm'),
        alignItems: 'center',
        borderBlockEnd: [...rule_, hook.rule],
        display: 'flex',
        gap: token('space-sm'),
        justifyContent: 'space-between',
        minBlockSize: token('size-control'),
        paddingBlock: token('space-2xs'),
        paddingInline: hook.paddingInline,
        web: { gridRow: 1 },
      }),
      native([rule({ flexDirection: 'row' })]),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    on('actions', [
      rule({
        '--helix-size-control': token('size-control-sm'),
        '--helix-size-control-loose': fn('round', product(token('size-control'), 1.2), '1px'),
        '--helix-size-control-tight': fn('round', product(token('size-control'), '0.8'), '1px'),
        '--helix-size-checkbox': token('size-checkbox-sm'),
        '--helix-size-checkbox-loose': fn('round', product(token('size-checkbox'), 1.2), '1px'),
        '--helix-size-checkbox-tight': fn('round', product(token('size-checkbox'), 0.8), '1px'),
        '--helix-size-switch': token('size-switch-sm'),
        '--helix-size-tag': token('size-tag-sm'),
        '--helix-text-control': token('text-control-sm'),
        '--helix-space-control': token('space-sm'),
        '--helix-text-field': token('text-sm'),
        '--helix-text-field-label': token('text-xs'),
        '--helix-space-field': token('space-xs'),
        '--helix-space-row-bleed': token('space-2xs'),
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': fn('round', product(token('size-icon'), 1.2), '2px'),
        '--helix-size-icon-tight': fn('round', product(token('size-icon'), 0.8), '2px'),
        alignItems: 'center',
        display: 'flex',
        flex: '0 0 auto',
        gap: token('space-2xs'),
      }),
      native([rule({ flexDirection: 'row' })]),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    on('log', [
      rule({
        display: 'flex',
        flexDirection: 'column',
        gap: hook.gap,
        justifyContent: web('safe flex-end'),
        paddingBlock: token('space-md'),
        paddingInline: hook.paddingInline,
        web: {
          gridRow: 2,
          overflowY: 'auto',
          scrollbarColor: [hook.scrollbarThumbColor, hook.scrollbarTrackColor],
          scrollbarWidth: 'thin',
        },
      }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      web([
        rule(
          { hover: true },
          { scrollbarColor: [hook.scrollbarThumbHoverColor, hook.scrollbarTrackColor] },
        ),
        rule({ part: { 'data-windowed': true } }, { gap: token('space-none') }),
        rule({ print: true }, { overflowY: 'visible' }),
      ]),
      /* The turns take what is left of the box, and stand at its end while they
         are too few to fill it. Turns from data have a list of their own in it, and
         turns passed in scroll in the part. */
      native([
        rule({ flexGrow: 1, flexShrink: 1, justifyContent: 'flex-end', minBlockSize: 0 }),
        rule({ part: { 'data-scrolls': true } }, { overflowY: 'auto' }),
        rule({ part: { 'data-windowed': true } }, { gap: token('space-none'), paddingBlock: 0 }),
      ]),
    ]),
    on('turn', [
      rule({ flex: 'none' }),
      /* A list scrolls past the box's own padding, so the first and last turns hold it. */
      native([
        rule({ paddingBlockStart: token('space-md') }),
        rule({ part: { 'data-later': true } }, { paddingBlockStart: hook.gap }),
        rule({ part: { 'data-last': true } }, { paddingBlockEnd: token('space-md') }),
      ]),
    ]),
    /* Written out: the vocabulary reads no attribute's value by a part's index. */
    on({ part: 'turn', selector: '[part="turn"]:not([data-index="0"])' }, [
      web([rule({ paddingBlockStart: hook.gap })]),
    ]),
    /* A turn arriving rises into place, a step below where it lands, and fades
       in. Only a turn added at the end, which the web's headless tier marks
       `data-arriving` for the render it arrives in: not the conversation the page
       came with, not history loaded above, not a turn scrolled back into view. A
       phone's turn stands in its place at once. */
    on('turn', [
      web([
        rule(
          { part: { 'data-arriving': true } },
          {
            transition: list(
              ['opacity', token('duration-normal'), token('easing-decelerate')],
              ['translate', token('duration-normal'), token('easing-decelerate')],
            ),
          },
        ),
        rule(
          { part: { 'data-arriving': true }, startingStyle: true },
          { opacity: 0, translate: [0, token('space-sm')] },
        ),
        rule({ part: { 'data-arriving': true }, reducedMotion: true }, { transition: 'none' }),
      ]),
    ]),
    on('resume', [
      rule({
        marginBlockStart: product(token('space-xl'), '-1'),
        pointerEvents: 'none',
        position: 'relative',
        web: { display: 'grid', gridRow: 3, justifyItems: 'center' },
      }),
      native([
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          /* The button inside still takes a press, as the web's `auto` gives it. */
          pointerEvents: 'box-none',
        }),
      ]),
      rule({ part: { hidden: true } }, { display: 'none' }),
      rule({ print: true }, { display: 'none' }),
    ]),
    on({ part: 'resume', selector: '[part="resume"] > *' }, [
      web([rule({ pointerEvents: 'auto' })]),
    ]),
    on({ region: 'resume', slotted: '*' }, [
      rule({
        border: [hook.resumeBorderWidth, 'solid', hook.resumeBorderColor],
        boxShadow: hook.resumeShadow,
      }),
    ]),
    on('resume-button', [
      rule({
        all: 'unset',
        boxSizing: 'border-box',
        alignItems: 'center',
        backgroundColor: token('color-surface-raised'),
        blockSize: token('size-control'),
        border: [hook.resumeBorderWidth, 'solid', hook.resumeBorderColor],
        borderRadius: token('radii-sm'),
        boxShadow: hook.resumeShadow,
        color: token('color-foreground'),
        display: 'inline-flex',
        fontFamily: token('font-sans'),
        fontSize: token('text-control'),
        fontWeight: token('weight-medium'),
        gap: token('space-xs'),
        lineHeight: token('leading-tight'),
        paddingInline: token('space-control'),
        pointerEvents: 'auto',
        web: { cursor: 'pointer', whiteSpace: 'nowrap' },
      }),
      native([rule({ flexDirection: 'row' })]),
      rule(
        { hover: true },
        { backgroundColor: mix(token('color-foreground'), 6, token('color-surface-raised')) },
      ),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on('resume-mark', [
      rule({
        blockSize: token('size-icon-sm'),
        display: 'inline-flex',
        inlineSize: token('size-icon-sm'),
      }),
    ]),
    on({ part: 'resume-mark', inner: 'svg' }, [
      web([rule({ blockSize: '100%', inlineSize: '100%' })]),
    ]),
    on('status', [
      rule({
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        paddingBlockEnd: token('space-2xs'),
        paddingBlockStart: token('space-xs'),
        paddingInline: hook.paddingInline,
        web: { gridRow: 4 },
      }),
      rule({ part: { 'data-empty': true } }, { paddingBlock: 0 }),
    ]),
    on('typing', [
      rule({
        alignItems: 'center',
        color: hook.typingColor,
        display: 'inline-flex',
        gap: hook.typingGap,
      }),
      native([rule({ flexDirection: 'row' })]),
    ]),
    on('indicator', [
      rule([chatTyping]),
      native([
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'row',
          gap: token('space-2xs'),
        }),
      ]),
      web([
        rule({
          animation: ['helix-chat-typing', own.chatTypingCycle, 'infinite', token('easing-cycle')],
          /* A turn and a half, from the rate every loop in the library is built on. */
          own: { chatTypingCycle: product(token('duration-turn'), 1.5) },
        }),
        rule({ reducedMotion: true }, { animation: 'none' }),
      ]),
    ]),
    on(
      ['indicator-first', 'indicator-second', 'indicator-third'],
      [
        native([
          rule({
            animationDuration: product(token('duration-turn'), 1.5),
            animationIterationCount: 'infinite',
            animationName: 'helix-chat-typing-dot',
            animationTimingFunction: token('easing-cycle'),
            backgroundColor: 'currentColor',
            blockSize: '0.3em',
            borderRadius: token('radii-full'),
            inlineSize: '0.3em',
          }),
          rule({ reducedMotion: true }, { animationName: 'none' }),
        ]),
      ],
    ),
    on('indicator-second', [native([rule({ animationDelay: '160ms' })])]),
    on('indicator-third', [native([rule({ animationDelay: '320ms' })])]),
    on('composer', [
      rule({
        paddingBlock: token('space-sm'),
        paddingInline: hook.paddingInline,
        web: { gridRow: 5 },
      }),
      rule({ part: { hidden: true } }, { display: 'none' }),
      rule({ print: true }, { display: 'none' }),
    ]),
    on(
      ['empty', 'loading'],
      [
        rule({
          own: {
            collectionInsetBlock: token('space-lg'),
            collectionInsetInline: token('space-none'),
          },
        }),
        native([
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-sm'),
            margin: token('space-none'),
            paddingBlock: own.collectionInsetBlock,
            paddingInline: own.collectionInsetInline,
            textAlign: 'center',
          }),
        ]),
      ],
    ),
    /* The wrapper draws no box on the web, so each placeholder is a turn in the
       log's own column, at the log's gap. */
    on('placeholder', [
      web([rule({ display: 'contents' })]),
      native([rule({ display: 'flex', flexDirection: 'column', gap: hook.gap })]),
    ]),
    on('placeholder-turn', [
      rule({
        /* The leading of a line of the turn's text, as a skeleton reads it: its line
           height less its type, half above the glyphs and half below. A phone's
           `calc()` reads no `lh`, so it takes the half em of a line at 1.5. */
        own: { chatLeading: web(difference('1lh', '1em')) },
        borderRadius: hookOf('chat', 'message-radius', token('radii-md')),
        boxSizing: 'border-box',
        display: 'flex',
        flex: 'none',
        flexDirection: 'column',
        gap: own.chatLeading,
        inlineSize: web(fn('min', '28em', '80%')),
        paddingBlock: web(
          sum(
            hookOf('chat', 'message-padding-block', token('space-xs')),
            quotient(own.chatLeading, 2),
          ),
        ),
        paddingInline: hookOf('chat', 'message-padding-inline', token('space-sm')),
      }),
      rule(
        { part: { 'data-author': 'me' } },
        {
          alignSelf: 'flex-end',
          inlineSize: web(fn('min', '12em', '80%')),
        },
      ),
      native([
        rule({
          own: { chatLeading: '0.5em' },
          inlineSize: '28em',
          maxInlineSize: '80%',
          paddingBlock: sum(hookOf('chat', 'message-padding-block', token('space-xs')), '0.25em'),
        }),
        rule({ part: { 'data-author': 'me' } }, { inlineSize: '12em' }),
      ]),
    ]),
    /* A skeleton's fill: 8% of the ink, light enough to read as a shape. */
    on('placeholder-line', [
      rule({
        backgroundColor: mix(token('color-foreground'), 8, 'transparent'),
        blockSize: '1em',
        borderRadius: token('radii-sm'),
      }),
      native([rule({ part: { 'data-last': true } }, { inlineSize: '60%' })]),
    ]),
    /* Written out: the vocabulary reads no position among siblings. */
    on(
      {
        part: 'placeholder-line',
        selector: '[part="placeholder-line"]:last-child:not(:first-child)',
      },
      [web([rule({ inlineSize: '60%' })])],
    ),
    /* The loading words stay for a screen reader and leave the picture to the
       outline, clipped as the live region is. Written out: the vocabulary reads no
       following sibling. A phone marks the words `data-outlined`. */
    on({ part: 'loading', selector: '[part="loading"]:has(+ [part="placeholder"])' }, [
      web([
        rule({
          blockSize: '1px',
          clipPath: 'inset(50%)',
          inlineSize: '1px',
          insetBlockStart: 0,
          insetInlineStart: 0,
          overflow: 'hidden',
          position: 'absolute',
          whiteSpace: 'nowrap',
        }),
      ]),
    ]),
    on('loading', [
      native([
        rule(
          { part: { 'data-outlined': true } },
          {
            blockSize: 1,
            inlineSize: 1,
            insetBlockStart: 0,
            insetInlineStart: 0,
            overflow: 'hidden',
            paddingBlock: 0,
            position: 'absolute',
          },
        ),
      ]),
    ]),
    on('history', [
      rule({
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        margin: token('space-none'),
        paddingBlock: token('space-lg'),
        textAlign: 'center',
      }),
    ]),
    keyframes('helix-chat-typing', {
      '0%, 60%, 100%': { backgroundPosition: '0% 50%, 50% 50%, 100% 50%' },
      '20%': { backgroundPosition: '0% 10%, 50% 50%, 100% 50%' },
      '33%': { backgroundPosition: '0% 50%, 50% 10%, 100% 50%' },
      '46%': { backgroundPosition: '0% 50%, 50% 50%, 100% 10%' },
    }),
    keyframes('helix-chat-typing-dot', {
      '0%, 60%, 100%': { translate: '0 0' },
      '20%': { translate: '0 -0.25em' },
    }),
  ],
)
