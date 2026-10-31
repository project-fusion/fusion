import {
  difference,
  fn,
  inherited,
  list,
  mix,
  native,
  product,
  quotient,
  sum,
  token,
  web,
} from '../../../style.js'
import { oneOf } from '../../../render.js'
import { styles } from '../../../table.js'
import row from './headless.js'

/**
 * A notification, in its styled tier: media, a body, and one trailing column.
 *
 * **Everything that is not the body stands on the first line**, one line tall, the
 * avatar, the time, the controls, and the unread dot, whatever the body holds.
 *
 * **Unread is a dot in the start padding and a heavier label.** The web draws the
 * dot as the item's `::before`, and a phone, whose views have no pseudo-elements,
 * as a part of its own.
 *
 * **The time gives way to the dismiss control under a pointer**, in one place, a
 * crossfade. Where a pointer cannot hover, and so on a phone, the two stand side by
 * side.
 *
 * **`outlined` and `filled` make the row a box**, an edge, a corner, and a gap where
 * the hairline was, set on the row or taken from the feed. The web's gap is a margin
 * on the host, and a phone's on the item, since a row that has gone draws nothing and
 * its host must keep no room.
 *
 * **Narrow, the trailing column goes under the body**, against the far edge, by the
 * row's own width and never the window's.
 */
export default styles(
  row,
  {
    prefix: 'notifications',
    props: { separation: oneOf(['filled', 'outlined', 'plain']) },
    hooks: ({ own }) => ({
      color: token('color-foreground-muted'),
      dismissColor: token('color-foreground-muted'),
      itemEdge: token('color-border'),
      itemFill: token('color-surface-raised'),
      itemGap: token('space-xs'),
      itemRadius: token('radii-md'),
      mediaColumn: '0px',
      paddingBlock: token('space-xs'),
      paddingInline: token('space-lg'),
      rule: token('color-border'),
      unreadBlockSize: token('space-xs'),
      unreadInlineSize: own.notificationsUnread,
      unreadInset: null,
      unreadMark: token('color-accent'),
      unreadOffset: null,
      unreadRadius: token('radii-full'),
    }),
    own: {
      notificationsLine: null,
      notificationsPadBlock: null,
      notificationsPadInline: null,
      notificationsSwap: null,
      notificationsUnread: null,
    },
    stylesheet: 'notifications/notification/notification.generated.css',
  },
  ({ hook, on, own, rule }) => {
    const unreadTop = sum(
      own.notificationsPadBlock,
      quotient(difference(own.notificationsLine, own.notificationsUnread), '2'),
    )
    const unreadStart = quotient(
      difference(own.notificationsPadInline, hook.unreadInlineSize),
      '2',
    )
    const boxed = [
      { separation: 'filled' as const },
      { separation: 'outlined' as const },
      { feedFilled: true },
      { feedOutlined: true },
    ]
    const filled = [{ separation: 'filled' as const }, { feedFilled: true }]
    return [
      on('host', [
        rule({
          own: {
            notificationsLine: product(token('text-sm'), token('leading-normal')),
            notificationsPadBlock: hook.paddingBlock,
            notificationsPadInline: hook.paddingInline,
            notificationsSwap: '0',
            notificationsUnread: hook.unreadBlockSize,
          },
          display: 'block',
          web: { containerType: 'inline-size' },
        }),
        web([
          rule(boxed, {
            '--notifications-rule': 'transparent',
            marginBlockEnd: hook.itemGap,
          }),
          rule(
            [
              { controls: true, hover: true },
              { controls: true, focusWithin: true },
            ],
            { own: { notificationsSwap: '1' } },
          ),
        ]),
        rule(filled, {
          '--avatar-background-color': mix(token('color-foreground'), 8, 'transparent'),
        }),
      ]),
      on('item', [
        rule({
          alignItems: 'start',
          borderBlockEnd: [token('border-thin'), 'solid', hook.rule],
          display: 'grid',
          paddingBlock: own.notificationsPadBlock,
          paddingInline: own.notificationsPadInline,
          position: 'relative',
          web: {
            cursor: 'default',
            gridTemplateColumns: [fn('minmax', hook.mediaColumn, 'auto'), 'minmax(0, 1fr)', 'auto'],
          },
        }),
        rule(boxed, {
          border: [token('border-thin'), 'solid', hook.itemEdge],
          borderRadius: hook.itemRadius,
        }),
        rule(filled, { backgroundColor: hook.itemFill }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        web([
          rule(
            { inlineSize: { below: '18rem' } },
            {
              gridTemplateColumns: [fn('minmax', hook.mediaColumn, 'auto'), 'minmax(0, 1fr)'],
            },
          ),
        ]),
        native([
          rule({ display: 'flex', flexDirection: 'row' }),
          rule(boxed, { marginBlockEnd: hook.itemGap }),
          rule({ inlineSize: { below: '18rem' } }, { flexWrap: 'wrap' }),
          rule({ part: { 'data-last': true } }, { borderBlockEndColor: 'transparent' }),
        ]),
      ]),
      on({ before: 'item' }, [
        web([
          rule(
            { read: false },
            {
              backgroundColor: hook.unreadMark,
              blockSize: own.notificationsUnread,
              borderRadius: hook.unreadRadius,
              content: '""',
              inlineSize: hook.unreadInlineSize,
              insetBlockStart: hook.unreadOffset(unreadTop),
              insetInlineStart: hook.unreadInset(unreadStart),
              position: 'absolute',
            },
          ),
          rule({ print: true, read: false }, { display: 'none' }),
        ]),
      ]),
      on('unread-dot', [
        native([rule({
          backgroundColor: hook.unreadMark,
          blockSize: own.notificationsUnread,
          borderRadius: hook.unreadRadius,
          inlineSize: hook.unreadInlineSize,
          insetBlockStart: hook.unreadOffset(unreadTop),
          insetInlineStart: hook.unreadInset(unreadStart),
          position: 'absolute',
        })]),
      ]),
      on('media', [
        rule({
          web: {
            gridTemplateRows: own.notificationsLine,
            placeItems: 'center start',
          },
          display: 'grid',
        }),
        native([
          rule({
            alignItems: 'flex-start',
            blockSize: own.notificationsLine,
            justifyContent: 'center',
          }),
          rule(
            { part: { 'data-column': true } },
            { minInlineSize: sum(token('size-avatar'), token('space-sm')) },
          ),
        ]),
      ]),
      on('body', [
        rule({ display: 'grid', gap: token('space-2xs') }),
        native([rule({ flexBasis: '0%', flexGrow: 1, flexShrink: 1, minInlineSize: 0 })]),
      ]),
      on('label', [
        rule({
          color: hook.color,
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          lineHeight: own.notificationsLine,
        }),
        rule(
          { read: false },
          { color: token('color-foreground'), fontWeight: token('weight-medium') },
        ),
      ]),
      on({ region: 'description', slotted: '*' }, [
        rule({
          color: token('color-foreground-muted'),
          fontFamily: token('font-sans'),
          fontSize: token('text-xs'),
          lineHeight: token('leading-normal'),
          margin: token('space-none'),
        }),
      ]),
      on({ region: 'detail', slotted: '*' }, [
        rule({
          marginBlock: [token('space-2xs'), token('space-none')],
          marginInline: token('space-none'),
        }),
      ]),
      on({ part: 'body', selector: '[part="body"] slot:not([name])::slotted(a)' }, [
        web([rule({ color: 'inherit', textDecoration: 'none' })]),
      ]),
      on({ part: 'body', selector: '[part="body"] slot:not([name])::slotted(a:hover)' }, [
        web([
          rule({
            textDecoration: 'underline',
            textDecorationColor: mix('currentcolor', 35, 'transparent'),
            textDecorationThickness: '1px',
            textUnderlineOffset: '0.25em',
          }),
        ]),
      ]),
      on('controls', [
        rule({
          alignItems: 'center',
          display: 'flex',
          marginInlineEnd: quotient(
            difference(token('size-control'), token('size-icon')),
            '-2',
          ),
          opacity: own.notificationsSwap,
          web: { pointerEvents: 'none' },
        }),
        web([
          rule(
            [
              { within: { host: { hover: true } }, controls: true },
              { within: { host: { focusWithin: true } }, controls: true },
            ],
            { pointerEvents: 'auto' },
          ),
          rule({ canHover: false, coarsePointer: true }, { pointerEvents: 'auto' }),
        ]),
        native([rule({ flexDirection: 'row', opacity: 1 })]),
      ]),
      on('trailing', [
        rule({
          alignItems: 'center',
          alignSelf: 'start',
          display: 'grid',
          marginInlineStart: token('space-sm'),
          web: {
            gridTemplateAreas: '"swap"',
            gridTemplateRows: own.notificationsLine,
            justifyItems: 'end',
          },
        }),
        web([
          rule(
            { canHover: false, coarsePointer: true },
            {
              columnGap: token('space-sm'),
              gridAutoFlow: 'column',
              gridTemplateAreas: 'none',
            },
          ),
        ]),
        rule(
          { inlineSize: { below: '18rem' } },
          {
            alignSelf: 'start',
            marginBlockStart: token('space-2xs'),
            marginInlineStart: token('space-none'),
            web: { gridColumn: '2', gridRow: '2', justifyItems: 'end' },
          },
        ),
        native([
          rule({
            blockSize: own.notificationsLine,
            columnGap: token('space-sm'),
            display: 'flex',
            flexDirection: 'row',
          }),
          rule({ inlineSize: { below: '18rem' } }, { inlineSize: '100%', justifyContent: 'flex-end' }),
        ]),
      ]),
      /* The time and the controls, stacked in one place: which of the two shows is
         one number the host sets and both children read. */
      on({ part: 'trailing', selector: '[part="trailing"] > *' }, [
        web([
          rule({
            gridArea: 'swap',
            transition: list(
              ['opacity', token('duration-normal'), token('easing-standard')],
              ['translate', token('duration-normal'), token('easing-decelerate')],
            ),
          }),
          rule(
            { canHover: false, coarsePointer: true },
            { gridArea: 'auto', opacity: '1', translate: 'none' },
          ),
          rule(
            { reducedMotion: true },
            {
              transition: ['opacity', token('duration-fast'), token('easing-standard')],
              translate: 'none',
            },
          ),
        ]),
      ]),
      on({ part: 'trailing', selector: '[part="trailing"] > :not([part="controls"])' }, [
        web([
          rule({
            color: token('color-foreground-muted'),
            display: 'block',
            fontFamily: token('font-sans'),
            fontSize: token('text-xs'),
            lineHeight: own.notificationsLine,
            opacity: difference('1', own.notificationsSwap),
            translate: [product(token('space-2xs'), own.notificationsSwap), '0'],
          }),
        ]),
      ]),
      on('stamp', [
        native([
          rule({
            color: token('color-foreground-muted'),
            fontFamily: token('font-sans'),
            fontSize: token('text-xs'),
            lineHeight: own.notificationsLine,
          }),
        ]),
      ]),
      on('actions', [
        rule({
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: token('space-2xs'),
        }),
        rule({ actions: false }, { display: 'none' }),
        rule({ actions: true }, { marginBlockStart: token('space-2xs') }),
        native([rule({ flexDirection: 'row' })]),
      ]),
      on('dismiss', [
        rule({
          backgroundColor: 'transparent',
          blockSize: token('size-control'),
          border: '0',
          borderRadius: token('radii-sm'),
          color: hook.dismissColor,
          display: 'grid',
          inlineSize: token('size-control'),
          marginInlineStart: token('space-2xs'),
          padding: token('space-none'),
          web: { cursor: 'pointer', placeItems: 'center' },
        }),
        rule({ hover: true }, { backgroundColor: mix('currentcolor', 12, 'transparent') }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        web([rule({ print: true }, { display: 'none' })]),
        native([rule({ alignItems: 'center', justifyContent: 'center' })]),
      ]),
      on({ region: 'dismiss', slotted: '*' }, [
        rule({
          blockSize: inherited('icon-size', token('size-icon')),
          inlineSize: inherited('icon-size', token('size-icon')),
        }),
      ]),
    ]
  },
)
