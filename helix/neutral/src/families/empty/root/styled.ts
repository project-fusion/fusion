import printEconomy from '../../../fragments/print-economy.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Empty's styled tier.
 *
 * **Centered with space around it.** An empty view is the only thing on
 * screen, and pressed against the top edge it looks broken.
 *
 * **Each region styles what is passed into it**: the icon's size and color,
 * the heading's type, and the message's color and measure. The message's
 * color and size are on the region, which the words inherit, and its margin
 * and measure on each element passed in.
 */
export default styles(
  root,
  {
    prefix: 'empty',
    hooks: {
      actionsGap: token('space-sm'),
      gap: token('space-sm'),
      headingColor: token('color-foreground'),
      headingSize: token('text-lg'),
      iconColor: token('color-foreground-subtle'),
      iconSize: token('size-icon-lg'),
      messageColor: token('color-foreground-muted'),
      messageMeasure: '46ch',
      messageSize: token('text-sm'),
      padding: token('space-2xl'),
    },
    stylesheet: 'empty/root/empty-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: hook.gap,
        padding: hook.padding,
        textAlign: 'center',
      }),
    ]),
    /* The `lg` step, not a raw rem, so the icon moves with density. */
    on({ region: 'icon', slotted: '*' }, [
      rule({
        '--icon-size': hook.iconSize,
        color: hook.iconColor,
      }),
    ]),
    /* A heading passed in is set as the one `heading` draws. */
    on({ region: 'heading', slotted: '*' }, [
      rule({
        color: hook.headingColor,
        fontSize: hook.headingSize,
        fontWeight: token('weight-semibold'),
        letterSpacing: token('tracking-tight'),
        margin: token('space-none'),
      }),
    ]),
    on('heading', [
      rule({
        color: hook.headingColor,
        fontSize: hook.headingSize,
        fontWeight: token('weight-semibold'),
        letterSpacing: token('tracking-tight'),
        margin: token('space-none'),
      }),
    ]),
    /* The inherited half on the region, the rest on what is passed in. */
    on({ region: 'default' }, [
      rule({
        color: hook.messageColor,
        fontSize: hook.messageSize,
      }),
    ]),
    /* The explanation runs to a measure even though the block is centered:
       centered text past about 50 characters loses the reader on the return
       sweep. */
    on({ region: 'default', slotted: '*' }, [
      rule({ margin: token('space-none'), maxInlineSize: hook.messageMeasure }),
    ]),
    on({ region: 'actions', slotted: '*' }, [rule({ marginBlockStart: hook.actionsGap })]),
    /* A notice on paper, and no panel. */
    include(printEconomy),
  ],
)
