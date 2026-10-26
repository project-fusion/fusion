import { fn, mix, token } from '../style.js'
import { fragment } from '../table.js'

/**
 * The ground and lift of an icon button over a busy surface, a map or a
 * board: `raised` takes the theme's floating edge and shadow, and `material`
 * lays a translucent ground under the glyph. A solid button keeps its fill.
 * **The material's blur is the web's**: a phone has no backdrop filter yet,
 * so it draws the translucent ground alone. Copy Button, which is drawn with
 * Icon Button's rules, takes them in too.
 */
export default fragment(
  'icon-button-floating',
  {
    parts: ['button'],
    hooks: {
      backdrop: null,
      backgroundColor: null,
      backgroundColorHover: null,
      borderColor: null,
      borderWidth: null,
      shadow: null,
    },
    own: { iconButtonPressedFill: null },
    props: ['emphasis', 'material', 'raised'],
  },
  ({ hook, on, own, rule }) => [
    /* **Raised is floating**, so it takes the theme's floating edge and lift,
       as a popover over the page does, each behind a hook. The width alone,
       so each emphasis keeps the edge color it draws. The rules from here on
       say more about a button than any above, and no two of them select the
       same button in the same state. */
    on('button', [
      rule(
        { raised: true },
        {
          borderWidth: hook.borderWidth(token('border-floating')),
          boxShadow: hook.shadow(token('shadow-floating')),
        },
      ),
      /* A ghost that floats has the edge a floating panel is drawn with. */
      rule(
        [
          { emphasis: false, raised: true },
          { emphasis: 'ghost', raised: true },
        ],
        { borderColor: hook.borderColor(token('color-border')) },
      ),
      /* **The material is the ground under a button over a busy surface**, a
         map or a board. Glass lets the surface through under a blur, and
         frosted turns both up. A solid button keeps its fill. */
      rule(
        { emphasis: { not: 'solid' }, material: 'glass' },
        {
          backdropFilter: hook.backdrop(token('material-backdrop')),
          backgroundColor: own.iconButtonPressedFill(
            hook.backgroundColor(token('material-translucent')),
          ),
        },
      ),
      rule(
        { emphasis: { not: 'solid' }, material: 'frosted' },
        {
          backdropFilter: hook.backdrop(fn('blur', token('material-blur-lg'))),
          backgroundColor: own.iconButtonPressedFill(
            hook.backgroundColor(token('material-translucent-strong')),
          ),
        },
      ),
      /* No ground at all: the glyph over the surface, for one quiet enough to
         hold it. */
      rule(
        { emphasis: { not: 'solid' }, material: 'transparent' },
        {
          backdropFilter: 'none',
          backgroundColor: own.iconButtonPressedFill(hook.backgroundColor('transparent')),
        },
      ),
      /* A ghost that floats with no material has the overlay a floating panel
         is drawn on, so its glyph has a ground. */
      rule(
        [
          { emphasis: false, material: false, raised: true },
          { emphasis: 'ghost', material: false, raised: true },
        ],
        {
          backgroundColor: own.iconButtonPressedFill(
            hook.backgroundColor(token('color-surface-overlay')),
          ),
        },
      ),
      /* Under the pointer, over a material or the overlay: the overlay with a
         little of the ink in it. */
      rule(
        { disabled: false, emphasis: { not: 'solid' }, hover: true, material: true },
        {
          backgroundColor: own.iconButtonPressedFill(
            hook.backgroundColorHover(
              mix(token('color-foreground'), 10, token('color-surface-overlay')),
            ),
          ),
        },
      ),
      rule(
        [
          { disabled: false, emphasis: false, hover: true, material: false, raised: true },
          { disabled: false, emphasis: 'ghost', hover: true, material: false, raised: true },
        ],
        {
          backgroundColor: own.iconButtonPressedFill(
            hook.backgroundColorHover(
              mix(token('color-foreground'), 10, token('color-surface-overlay')),
            ),
          ),
        },
      ),
    ]),
  ],
)
