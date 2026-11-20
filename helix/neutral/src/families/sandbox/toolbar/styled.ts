import densitySm from '../../../fragments/density-sm.js'
import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import toolbar from './headless.js'

/**
 * Sandbox Toolbar's styled tier.
 *
 * **Dense by nature, and it says so itself**, as App Header does, so a
 * consumer does not have to declare it on the tag.
 *
 * **Its height is stated, the large control's**, so two bars either side of a
 * split line up whatever each holds. The line under it is the only line at
 * that boundary: the panes below draw none of their own. Its inset is the
 * page header's, so the two line up down the leading edge.
 *
 * **Each region is a row of its own**, which keeps the gap inside it: an empty
 * end region adds no box and no gap. The end region takes the free space
 * before it, once however many items it holds.
 */
export default styles(
  toolbar,
  {
    prefix: 'sandbox-toolbar',
    hooks: {
      gap: token('space-sm'),
      size: token('size-control-lg'),
    },
    stylesheet: 'sandbox/toolbar/sandbox-toolbar.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(densitySm),
    on('host', [
      rule({
        alignItems: 'center',
        backgroundColor: token('color-background'),
        blockSize: hook.size,
        borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
        display: 'flex',
        flexDirection: 'row',
        minBlockSize: 0,
        paddingBlock: token('space-none'),
        paddingInline: token('space-md'),
      }),
    ]),
    on({ region: '*' }, [
      rule({
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'row',
        gap: hook.gap,
        minInlineSize: 0,
      }),
    ]),
    on({ region: 'end' }, [rule({ marginInlineStart: 'auto' })]),
  ],
)
