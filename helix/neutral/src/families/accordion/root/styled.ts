import { token } from '../../../style.js'
import { styles } from '../../../table.js'
import { prop } from '../../../tree.js'
import root from './headless.js'

/**
 * An accordion's styled tier, which writes
 * `helix/styled/src/accordion/root/accordion-root.generated.css`.
 *
 * **Plain by default: nothing between the sections and nothing around the
 * stack.** The held sheet wrote a seam between neighbors as
 * `::slotted(* + *)`, which no browser matches, since `::slotted()` takes a
 * compound selector alone, so no seam was ever drawn, and none is drawn
 * here, on the web or on a phone.
 *
 * **Outlined frames each section, not the stack.** A frame around a stack
 * of sections that seams already separate says again that they are one set.
 * Framed one by one, each section is a thing that opens, and the set is said
 * by their alignment. No seam while each section carries its own frame.
 *
 * **Print draws a seam and no surface.** Print is the web's.
 */
export default styles(
  root,
  {
    prefix: 'accordion',
    hooks: ['border-color', 'gap', 'radius'],
    props: [prop('separation', ['outlined', 'plain'])],
    stylesheet: 'accordion/root/accordion-root.generated.css',
  },
  ({ hook, on, rule }) => [
    on('host', [
      rule({ display: 'block' }),
      rule(
        { separation: 'outlined' },
        { display: 'flex', flexDirection: 'column', gap: hook.gap(token('space-xs')) },
      ),
      rule({ print: true }, { printColorAdjust: 'economy' }),
    ]),
    on({ region: 'default', slotted: '*' }, [
      rule(
        { separation: 'outlined' },
        {
          border: [token('border-thin'), 'solid', hook.borderColor(token('color-border'))],
          borderRadius: hook.radius(token('radii-sm')),
          /* Clips the trigger's own hover fill to the section's corners. */
          overflow: 'hidden',
        },
      ),
    ]),
  ],
)
