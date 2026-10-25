import { sum, token } from '../../../style.js'
import { styles } from '../../../table.js'
import section from './headless.js'

/**
 * A menu section's styled tier, which writes
 * `helix/styled/src/menu/section/menu-section.generated.css`. Its hooks are
 * the menu's, `--menu-*`.
 *
 * **A section decides its own leading column**, so a section of plain rows
 * under a section of icons starts its labels at the row's edge. Its heading
 * is the menu's small type, a step quieter than the rows, at their inset.
 */
export default styles(
  section,
  {
    prefix: 'menu',
    hooks: ['section-heading-color'],
    own: ['menu-section-heading'],
    stylesheet: 'menu/section/menu-section.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ '--menu-item-start': '0px', display: 'block' }),
      rule(
        { platform: 'web', state: 'start' },
        { '--menu-item-start': sum(token('size-icon'), token('space-xs')) },
      ),
      rule(
        { platform: 'native', state: 'started' },
        { '--menu-item-start': sum(token('size-icon'), token('space-xs')) },
      ),
    ]),
    on('heading', [
      rule({
        color: hook.sectionHeadingColor(token('color-foreground-muted')),
        fontSize: token('text-xs'),
        fontWeight: token('weight-medium'),
        lineHeight: token('leading-normal'),
        paddingBlock: [token('space-xs'), token('space-2xs')],
        paddingInline: token('space-sm'),
        userSelect: 'none',
      }),
      /* A phone's heading stands down on a page below the top, where its
         rows are not, as the web's section draws nothing there. */
      rule({ platform: 'native' }, { display: own.sectionHeading('flex') }),
    ]),
  ],
)
