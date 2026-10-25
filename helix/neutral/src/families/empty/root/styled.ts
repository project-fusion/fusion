import printEconomy from '../../../fragments/print-economy.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Empty's styled tier, which writes `helix/styled/src/empty/root/empty-root.generated.css`.
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
    hooks: [
      'actions-gap',
      'gap',
      'heading-color',
      'heading-size',
      'icon-color',
      'icon-size',
      'message-color',
      'message-measure',
      'message-size',
      'padding',
    ],
    stylesheet: 'empty/root/empty-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    on('host', [
      rule({
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: hook.gap(token('space-sm')),
        padding: hook.padding(token('space-2xl')),
        textAlign: 'center',
      }),
    ]),
    /* The `lg` step, not a raw rem, so the icon moves with density. */
    on({ region: 'icon', slotted: '*' }, [
      rule({
        '--icon-size': hook.iconSize(token('size-icon-lg')),
        color: hook.iconColor(token('color-foreground-subtle')),
      }),
    ]),
    /* A heading passed in is set as the one `heading` draws. */
    on({ region: 'heading', slotted: '*' }, [
      rule({
        color: hook.headingColor(token('color-foreground')),
        fontSize: hook.headingSize(token('text-lg')),
        fontWeight: token('weight-semibold'),
        letterSpacing: token('tracking-tight'),
        margin: token('space-none'),
      }),
    ]),
    on('heading', [
      rule({
        color: hook.headingColor(token('color-foreground')),
        fontSize: hook.headingSize(token('text-lg')),
        fontWeight: token('weight-semibold'),
        letterSpacing: token('tracking-tight'),
        margin: token('space-none'),
      }),
    ]),
    /* The inherited half on the region, the rest on what is passed in. */
    on({ region: 'default' }, [
      rule({
        color: hook.messageColor(token('color-foreground-muted')),
        fontSize: hook.messageSize(token('text-sm')),
      }),
    ]),
    /* The explanation runs to a measure even though the block is centered:
       centered text past about 50 characters loses the reader on the return
       sweep. */
    on({ region: 'default', slotted: '*' }, [
      rule({ margin: token('space-none'), maxInlineSize: hook.messageMeasure('46ch') }),
    ]),
    on({ region: 'actions', slotted: '*' }, [
      rule({ marginBlockStart: hook.actionsGap(token('space-sm')) }),
    ]),
    /* A notice on paper, and no panel. */
    include(printEconomy),
  ],
)
