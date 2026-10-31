import chatTyping from '../../../fragments/chat-typing.js'
import { fn, mix, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import message from './headless.js'

/**
 * Chat Message's styled tier: the avatar, and everything else beside it.
 *
 * **`author="me"` is the only paint that says whose turn it is**: the turn sits
 * against the trailing edge, in a wash of the brand. A bubble is a wash of the
 * foreground and never a rung on the surface ladder, so it holds its contrast on
 * whatever ground it sits on.
 *
 * **`plain` takes the ground away and leaves the words**, for an assistant's side of
 * a conversation, and the width goes with the bubble.
 *
 * **Only a failed turn takes a tone**, because a failure has to be found.
 *
 * **The controls are there when the turn is**, under a pointer or focus, and always
 * where nothing hovers, as on a phone.
 */
export default styles(
  message,
  {
    prefix: 'chat',
    hooks: {
      indicatorBackgroundColor: token('color-surface-sunken'),
      messageBackgroundColor: mix(token('color-foreground'), 14, 'transparent'),
      messageBackgroundColorMe: mix(token('color-primary'), 28, 'transparent'),
      messageColor: token('color-foreground'),
      messageColorMe: null,
      messageMeasure: '42rem',
      messageMetaColor: token('color-foreground-muted'),
      messagePaddingBlock: token('space-xs'),
      messagePaddingInline: token('space-sm'),
      messageRadius: token('radii-md'),
    },
    own: { chatTypingCycle: null },
    stylesheet: 'chat/message/chat-message.generated.css',
  },
  ({ hook, keyframes, on, own, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      web([
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
      ]),
    ]),
    on('message', [
      rule({
        alignItems: 'start',
        display: 'grid',
        web: { gridTemplateColumns: 'auto minmax(0, 1fr)' },
      }),
      native([
        rule({ alignItems: 'flex-start', display: 'flex', flexDirection: 'row' }),
        rule({ author: 'me' }, { justifyContent: 'flex-end' }),
      ]),
    ]),
    on({ region: 'avatar', slotted: '*' }, [rule({ marginInlineEnd: token('space-sm') })]),
    on('avatar', [
      rule({
        alignItems: 'center',
        display: 'flex',
        fontSize: token('text-sm'),
        lineHeight: token('leading-normal'),
        minBlockSize: web(sum('1lh', product(token('space-xs'), '2'))),
        web: { gridColumn: 1 },
      }),
      rule({ author: 'me' }, { display: 'none' }),
    ]),
    on('body', [
      rule({
        display: 'grid',
        gap: token('space-2xs'),
        justifyItems: 'start',
        maxInlineSize: web(fn('min', hook.messageMeasure, '80%')),
        web: { gridColumn: 2 },
      }),
      native([
        rule({
          alignItems: 'flex-start',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 1,
          maxInlineSize: '80%',
        }),
        rule({ author: 'me' }, { alignItems: 'flex-end' }),
        rule({ separation: 'plain' }, { alignItems: 'stretch', flexGrow: 1 }),
      ]),
      rule({ author: 'me' }, { justifyItems: 'end', justifySelf: 'end' }),
      rule({ separation: 'plain' }, { justifyItems: 'stretch', maxInlineSize: '100%' }),
    ]),
    on('actions', [
      rule({
        '--helix-size-control': sum(token('size-control-sm'), product(token('space-2xs'), '-1')),
        '--helix-size-control-loose': product(token('size-control'), '1.2'),
        '--helix-size-control-tight': product(token('size-control'), '0.8'),
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': product(token('size-icon'), '1.2'),
        '--helix-size-icon-tight': product(token('size-icon'), '0.8'),
        alignItems: 'center',
        display: 'inline-flex',
        gap: token('space-2xs'),
      }),
      native([rule({ flexDirection: 'row' })]),
      web([
        rule({
          opacity: 0,
          pointerEvents: 'none',
          transition: ['opacity', token('duration-fast'), token('easing-standard')],
        }),
        rule({ within: { host: ['hover', 'focusWithin'] } }, { opacity: 1, pointerEvents: 'auto' }),
        rule({ canHover: false }, { opacity: 1, pointerEvents: 'auto' }),
        rule({ print: true }, { display: 'none' }),
      ]),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    on('sources', [
      rule({
        '--helix-size-avatar': token('size-avatar-sm'),
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': product(token('size-icon'), '1.2'),
        '--helix-size-icon-tight': product(token('size-icon'), '0.8'),
        '--helix-size-tag': token('size-tag-sm'),
        alignItems: 'center',
        color: token('color-foreground-muted'),
        display: 'flex',
        flexWrap: 'wrap',
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        gap: token('space-2xs'),
        lineHeight: token('leading-normal'),
      }),
      native([rule({ flexDirection: 'row' })]),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    on('work', [
      rule({
        color: token('color-foreground-muted'),
        justifySelf: 'stretch',
        minInlineSize: 0,
      }),
      native([rule({ alignSelf: 'stretch' })]),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    on('attachments', [
      rule({
        display: 'flex',
        flexWrap: 'wrap',
        gap: token('space-2xs'),
        maxInlineSize: '100%',
        minInlineSize: 0,
      }),
      native([rule({ flexDirection: 'row' })]),
      rule({ author: 'me' }, { justifyContent: 'flex-end' }),
      rule({ part: { hidden: true } }, { display: 'none' }),
    ]),
    on('content', [
      rule({
        backgroundColor: hook.messageBackgroundColor,
        borderRadius: hook.messageRadius,
        color: hook.messageColor,
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        inlineSize: web('fit-content'),
        lineHeight: token('leading-normal'),
        maxInlineSize: '100%',
        minInlineSize: 0,
        paddingBlock: hook.messagePaddingBlock,
        paddingInline: hook.messagePaddingInline,
        web: { overflowWrap: 'break-word', overflowX: 'auto' },
      }),
      rule(
        { separation: 'plain' },
        {
          backgroundColor: 'transparent',
          inlineSize: web('auto'),
          paddingInline: token('space-none'),
        },
      ),
      rule(
        { author: 'me' },
        {
          backgroundColor: hook.messageBackgroundColorMe,
          color: hook.messageColorMe(hook.messageColor),
        },
      ),
      native([rule({ part: { 'data-sending': true } }, { opacity: 0.6 })]),
    ]),
    /* Written out: the attribute is `state`, a word the vocabulary keeps for states. */
    on({ part: 'content', selector: ':host([state="sending"]) [part="content"]' }, [
      web([rule({ opacity: 0.6 })]),
    ]),
    on('meta', [
      rule({
        alignItems: 'center',
        color: hook.messageMetaColor,
        display: 'flex',
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        gap: token('space-2xs'),
      }),
      native([rule({ flexDirection: 'row' })]),
      rule({ author: 'me' }, { justifyContent: 'flex-end' }),
      native([rule({ part: { 'data-failed': true } }, { color: token('color-danger') })]),
    ]),
    /* Written out, for the same reason. */
    on({ part: 'meta', selector: ':host([state="failed"]) [part="meta"]' }, [
      web([rule({ color: token('color-danger') })]),
    ]),
    on({ region: 'indicator' }, [
      web([rule({ display: 'none' }), rule({ print: true }, { display: 'none' })]),
    ]),
    /* Written out: the wait is the only time an indicator belongs in the bubble. */
    on(
      {
        part: 'content',
        selector: ':host([state="streaming"]) [part="content"][data-empty] slot[name="indicator"]',
      },
      [web([rule({ display: 'block' })])],
    ),
    on({ region: 'indicator', slotted: '*' }, [
      rule({
        backgroundColor: hook.indicatorBackgroundColor,
        borderRadius: token('radii-full'),
        fontSize: token('text-xs'),
        paddingBlock: token('space-2xs'),
        paddingInline: token('space-xs'),
      }),
    ]),
    /* Written out: an orb on its own is the wait, and takes no chip. */
    on({ part: 'content', selector: ':host slot[name="indicator"]::slotted(helix-orb)' }, [
      web([rule({ backgroundColor: 'transparent', padding: token('space-none') })]),
    ]),
    on('indicator', [
      rule([chatTyping]),
      native([
        rule({
          alignItems: 'center',
          /* A line tall, as the web's `1lh` is. */
          blockSize: product(token('leading-normal'), token('text-md')),
          display: 'flex',
          flexDirection: 'row',
          gap: token('space-2xs'),
        }),
      ]),
      web([
        rule({
          animation: ['helix-chat-typing', own.chatTypingCycle, 'infinite', 'ease-in-out'],
          own: { chatTypingCycle: '1.2s' },
        }),
        rule({ reducedMotion: true }, { animation: 'none' }),
      ]),
    ]),
    on(
      ['indicator-first', 'indicator-second', 'indicator-third'],
      [
        native([
          rule({
            animationDuration: '1.2s',
            animationIterationCount: 'infinite',
            animationName: 'helix-chat-typing-dot',
            animationTimingFunction: 'ease-in-out',
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
    on('state', [
      rule({
        alignItems: 'center',
        display: 'inline-flex',
        fontWeight: token('weight-medium'),
        gap: token('space-2xs'),
      }),
      native([rule({ flexDirection: 'row' })]),
    ]),
    on('mark', [
      rule({
        blockSize: token('size-icon-tight'),
        flex: '0 0 auto',
        inlineSize: token('size-icon-tight'),
      }),
    ]),
    on('retry', [
      rule({
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: token('radii-sm'),
        color: token('color-foreground'),
        font: web('inherit'),
        fontWeight: token('weight-medium'),
        marginInlineEnd: product(token('space-2xs'), '-1'),
        minBlockSize: sum(token('size-control-tight'), product(token('space-2xs'), '-1')),
        paddingBlock: token('space-2xs'),
        paddingInline: token('space-2xs'),
        textDecoration: 'underline',
        web: { cursor: 'pointer', textUnderlineOffset: '0.2em' },
      }),
      rule({ hover: true }, { backgroundColor: token('color-hover') }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      web([rule({ print: true }, { display: 'none' })]),
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
