import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import panel from './headless.js'

/** A tab panel's styled tier, which writes `helix/styled/src/tabs/panel/tab-panel.generated.css`. */
export default styles(
  panel,
  {
    prefix: 'tabs-panel',
    hooks: ({ own }) => ({
      paddingBlockStart: own.tabsPanelPaddingBlockStart(token('space-md')),
    }),
    own: { tabsPanelPaddingBlockStart: null, tabsPanelPaddingInlineStart: null },
    stylesheet: 'tabs/panel/tab-panel.generated.css',
  },
  ({ hook, on, own, rule }) => [
    /* No box of its own. The panel that is showing is the box, and the ones that
       are not have to cost nothing: `display: block` here gave every panel host a
       grid item, so a tab set with four files divided its height four ways and
       the one panel a reader could see got a quarter of it. */
    on('host', [rule({ display: 'contents' })]),
    on('panel', [
      rule({
        minBlockSize: 0,
        minInlineSize: 0,
        outline: 'none',
        paddingBlockStart: hook.paddingBlockStart,
        paddingInlineStart: own.tabsPanelPaddingInlineStart(token('space-none')),
      }),
      rule({ hidden: true }, { display: 'none' }),
    ]),
  ],
)
