import { native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import panel from './headless.js'

/** A tab panel's styled tier. */
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
      /* Every panel in the one cell: an inactive panel that find in page can
         search keeps a box of its own, which the grid would place a row below. */
      web([rule({ gridArea: '1 / 1' })]),
      /* A phone has no find in page, so a panel whose tab is not chosen draws nothing. */
      native([rule({ hidden: true }, { display: 'none' })]),
    ]),
    /* Written out: `hidden="until-found"` hides through `content-visibility` and
       keeps the panel's box, which takes no room in the cell the panels share, and
       `display: none` would keep find in page out of it. */
    on({ part: 'panel', selector: ':host [part="panel"][hidden="until-found"]' }, [
      web([rule({ alignSelf: 'start', padding: 0 })]),
    ]),
    on({ part: 'panel', selector: ':host [part="panel"][hidden]:not([hidden="until-found"])' }, [
      web([rule({ display: 'none' })]),
    ]),
  ],
)
