import { native, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import section from './headless.js'

/**
 * A menu section's styled tier. Its hooks are
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
    hooks: {
      sectionHeadingColor: token('color-foreground-muted'),
    },
    own: { menuSectionHeading: null },
    stylesheet: 'menu/section/menu-section.generated.css',
  },
  ({ hook, on, own, rule }) => [
    on('host', [
      rule({ '--menu-item-start': '0px', display: 'block' }),
      web([
        rule({ start: true }, { '--menu-item-start': sum(token('size-icon'), token('space-xs')) }),
      ]),
      native([
        rule(
          { started: true },
          { '--menu-item-start': sum(token('size-icon'), token('space-xs')) },
        ),
      ]),
    ]),
    on('heading', [
      rule({
        color: hook.sectionHeadingColor,
        fontSize: token('text-xs'),
        fontWeight: token('weight-medium'),
        lineHeight: token('leading-normal'),
        paddingBlock: [token('space-xs'), token('space-2xs')],
        paddingInline: token('space-sm'),
        userSelect: 'none',
      }),
      /* A phone's heading stands down on a page below the top, where its
         rows are not, as the web's section draws nothing there. */
      native([rule({ display: own.menuSectionHeading('flex') })]),
    ]),
  ],
)
