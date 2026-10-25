import { mix, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * Breadcrumbs' styled tier, which writes
 * `helix/styled/src/breadcrumbs/root/breadcrumbs-root.generated.css`.
 *
 * **The trail decides how a split crumb tells its halves apart**, and hands
 * every crumb two values for it: a light fill across both halves while one
 * is under the pointer, under the resting `plain`, and a hairline between
 * them under `outlined`. A crumb draws from these and decides nothing.
 *
 * **The list wraps**, so every crumb stays in sight when the trail runs out
 * of room.
 */
export default styles(
  root,
  {
    prefix: 'breadcrumbs',
    hooks: ['font-size', 'gap', 'split-divider-color', 'split-fill'],
    own: [
      'breadcrumbs-mark-glyph',
      'breadcrumbs-mark-words',
      'breadcrumbs-split-fill',
      'breadcrumbs-split-rule',
    ],
    props: [prop('separation', ['outlined', 'plain'])],
    stylesheet: 'breadcrumbs/root/breadcrumbs-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({
        display: 'block',
        own: {
          splitFill: hook.splitFill(mix(token('color-foreground'), 4, 'transparent')),
          splitRule: 'transparent',
        },
      }),
      /* A line between the halves, and no shared fill: the border every
         outlined surface draws, at its hairline width. */
      rule(
        { separation: 'outlined' },
        {
          own: {
            splitFill: 'transparent',
            splitRule: hook.splitDividerColor(token('color-border')),
          },
        },
      ),
      /* **The trail's mark under `separator="slash"`**, which each crumb draws
         from these two values: the slash's words, and the chevron put away.
         The web's crumbs are told the mark by the trail's element. */
      rule(
        { platform: 'native', separator: 'slash' },
        { own: { markGlyph: 'none', markWords: '"/"' } },
      ),
      /* Where this page sits, which is worth having on a page with no back
         button. */
      rule({ print: true }, { printColorAdjust: web('economy') }),
    ]),
    /* No markers, which is why the web element writes `role="list"`: Safari
       drops a list's semantics when it sees `list-style: none`. */
    on('list', [
      rule({
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        fontSize: hook.fontSize(token('text-sm')),
        gap: hook.gap(token('space-xs')),
        listStyle: 'none',
        margin: token('space-none'),
        padding: token('space-none'),
      }),
    ]),
  ],
)
