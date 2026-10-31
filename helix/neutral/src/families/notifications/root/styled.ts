import { native, product, sum, token, web } from '../../../style.js'
import { oneOf } from '../../../render.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Notifications' styled tier: a column of a header, a list that scrolls, and a
 * footer, so the mark-all control stays in view in a panel of a fixed height.
 *
 * **A feed is dense, and says so once.** It sets the control, checkbox, icon, tag,
 * and avatar sizes a step down for everything inside it, so a control put in a row
 * takes the row's height without being told.
 *
 * **Mark-all and the next page are chrome**, in the muted ink, since the accent is
 * the unread mark's. **A page that could not be fetched** says so in the danger
 * ink, set as the empty line is.
 *
 * **A feed of boxes** takes away the rule under the header, which reads as a stray
 * line above a box, and stands the first box the same gap below it that falls
 * between the boxes.
 */
export default styles(
  root,
  {
    prefix: 'notifications',
    props: { separation: oneOf(['filled', 'outlined', 'plain']) },
    hooks: {
      errorColor: token('color-danger'),
      itemGap: token('space-xs'),
      maxBlockSize: 'none',
      paddingInline: token('space-lg'),
      rule: token('color-border'),
    },
    own: {
      collectionInsetBlock: null,
      collectionInsetInline: null,
    },
    stylesheet: 'notifications/root/notifications-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({
        '--helix-size-checkbox': token('size-checkbox-sm'),
        '--helix-size-checkbox-loose': product(token('size-checkbox'), '1.2'),
        '--helix-size-checkbox-tight': product(token('size-checkbox'), '0.8'),
        '--helix-size-control': token('size-control-sm'),
        '--helix-size-control-loose': product(token('size-control'), '1.2'),
        '--helix-size-control-tight': product(token('size-control'), '0.8'),
        '--helix-size-icon': token('size-icon-sm'),
        '--helix-size-icon-loose': product(token('size-icon'), '1.2'),
        '--helix-size-icon-tight': product(token('size-icon'), '0.8'),
        '--helix-size-tag': token('size-tag-sm'),
        '--helix-size-avatar': token('size-avatar-sm'),
        display: 'grid',
        maxBlockSize: hook.maxBlockSize,
        web: { gridTemplateRows: 'auto minmax(0, 1fr) auto' },
      }),
      web([
        rule(
          { media: true },
          {
            '--notifications-media-column': sum(token('size-avatar'), token('space-sm')),
          },
        ),
        rule({ print: true }, { maxBlockSize: 'none' }),
      ]),
      native([rule({ flexDirection: 'column' })]),
    ]),
    on('header', [
      rule({
        alignItems: 'center',
        borderBlockEnd: [token('border-thin'), 'solid', hook.rule],
        display: 'flex',
        gap: token('space-sm'),
        justifyContent: 'space-between',
        paddingBlock: token('space-sm'),
        paddingInline: hook.paddingInline,
      }),
      rule({ separation: ['filled', 'outlined'] }, { borderBlockEnd: 'none' }),
      native([rule({ flexDirection: 'row' })]),
      rule({ part: { 'data-empty': true } }, { display: 'none' }),
    ]),
    on('list', [
      rule({ overflowY: 'auto' }),
      rule(
        { separation: ['filled', 'outlined'] },
        { paddingBlockStart: hook.itemGap },
      ),
      web([rule({ print: true }, { overflowY: 'visible' })]),
      native([rule({ flexShrink: 1, minBlockSize: 0 })]),
    ]),
    on('footer', [
      rule({
        borderBlockStart: [token('border-thin'), 'solid', hook.rule],
        paddingBlock: token('space-sm'),
        paddingInline: hook.paddingInline,
      }),
      rule({ part: { 'data-empty': true } }, { display: 'none' }),
    ]),
    on({ part: 'list', selector: '::slotted(helix-notification:last-of-type)' }, [
      web([rule({ '--notifications-rule': 'transparent' })]),
    ]),
    on('mark-all', [
      rule({
        backgroundColor: 'transparent',
        border: '0',
        borderRadius: token('radii-sm'),
        color: token('color-foreground-muted'),
        flex: 'none',
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        paddingBlock: token('space-2xs'),
        paddingInline: token('space-2xs'),
        transitionDuration: token('duration-fast'),
        transitionProperty: 'color',
        transitionTimingFunction: token('easing-standard'),
        web: { cursor: 'pointer', whiteSpace: 'nowrap' },
      }),
      rule({ hover: true }, { color: token('color-foreground') }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      web([rule({ print: true }, { display: 'none' })]),
    ]),
    on('more', [
      rule({
        backgroundColor: 'transparent',
        border: '0',
        borderBlockStart: [token('border-thin'), 'solid', token('color-border')],
        color: token('color-foreground-muted'),
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        inlineSize: '100%',
        paddingBlock: token('space-sm'),
        transitionDuration: token('duration-fast'),
        transitionProperty: 'color',
        transitionTimingFunction: token('easing-standard'),
        web: { cursor: 'pointer' },
      }),
      rule({ hover: true }, { color: token('color-foreground') }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: product(token('size-focus-offset'), '-1'),
        },
      ),
      web([rule({ print: true }, { display: 'none' })]),
      native([
        rule({ alignItems: 'center' }),
        rule({ loading: true }, { color: token('color-foreground-subtle') }),
      ]),
    ]),
    /* While the next page is on its way, it keeps its place and its focus, and
       reads as resting, under a pointer as well. */
    on({ part: 'more', selector: '[part="more"][aria-disabled="true"]' }, [
      web([
        rule({ color: token('color-foreground-subtle'), cursor: 'default' }),
      ]),
    ]),
    on({ part: 'more', selector: '[part="more"][aria-disabled="true"]:hover' }, [
      web([
        rule({ color: token('color-foreground-subtle'), cursor: 'default' }),
      ]),
    ]),
    on(
      ['empty', 'loading'],
      [
        rule({
          own: {
            collectionInsetBlock: token('space-lg'),
            collectionInsetInline: token('space-md'),
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
    on('error', [
      rule({
        color: hook.errorColor,
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        margin: token('space-none'),
        paddingBlock: token('space-lg'),
        paddingInline: token('space-md'),
        textAlign: 'center',
      }),
    ]),
  ],
)
