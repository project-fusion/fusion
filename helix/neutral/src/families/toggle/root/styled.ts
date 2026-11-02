import { difference, list, mix, native, quotient, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Toggle's styled tier.
 *
 * **On the web, the item's look is the base layer's**, beside the
 * `data-navigation-item` recipe it is paired with, as `helix-toggle::part(item)`
 * rules. The page styles a label a consumer passes in, and a `::slotted()`
 * rule here would lose to it. This sheet keeps the host box, the gaps beside
 * an icon or a count, and the focus ring, which a document rule cannot
 * declare inside a shadow root.
 *
 * **A phone has no base layer**, so the item's look is written here for a
 * phone alone, as the base layer draws it: muted words with no ground of their
 * own, the full foreground while pressed, a wash under a finger, and the
 * disabled opacity while disabled. On its own the item is as tall as its words. A
 * group gives its items the row's height and its own corners through private
 * values, `toggle-height` and `toggle-radius`, which the base layer reads on
 * the web. A phone's toggle reads two more of the group's: the wash under a
 * finger, which a group takes away, and the indicator's fill, which each
 * pressed toggle carries where several can be pressed.
 */
export default styles(
  root,
  {
    prefix: 'toggle',
    hooks: {
      itemColor: token('color-foreground-muted'),
      itemColorSelected: token('color-foreground'),
      itemPaddingInline: token('space-sm'),
    },
    own: {
      toggleHeight: null,
      toggleHoverSurface: null,
      togglePressedShadow: null,
      togglePressedSurface: null,
      toggleRadius: null,
    },
    stylesheet: 'toggle/root/toggle-root.generated.css',
  },
  ({ hook, on, own, rule }) => [
    /* No height of its own: a group gives it the row's. Above the group's
       indicator, which sits behind every item. */
    on('host', [
      rule({ display: 'inline-flex', position: 'relative', zIndex: token('layer-raised') }),
      native([
        rule(
          { selected: true },
          {
            backgroundColor: own.togglePressedSurface('transparent'),
            borderRadius: own.toggleRadius(token('radii-sm')),
            boxShadow: own.togglePressedShadow('none'),
          },
        ),
      ]),
      /* A control is not printed: paper cannot be pressed. */
      rule({ print: true }, { display: 'none' }),
    ]),
    on('item', [
      rule({ web: { all: 'unset' }, boxSizing: 'border-box', position: 'relative' }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
      /* The base layer's look, for a phone. */
      native([
        rule({
          alignItems: 'center',
          backgroundColor: 'transparent',
          blockSize: own.toggleHeight('auto'),
          borderRadius: own.toggleRadius(token('radii-sm')),
          color: hook.itemColor,
          display: 'inline-flex',
          flex: '1 1 auto',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          justifyContent: 'center',
          paddingInline: hook.itemPaddingInline,
          transition: list(
            ['background-color', token('duration-fast'), token('easing-standard')],
            ['color', token('duration-fast'), token('easing-standard')],
          ),
          whiteSpace: 'nowrap',
        }),
        /* Pressed: the words at full strength, over the indicator's fill where
         the group around draws one on each pressed toggle. */
        rule({ selected: true }, { color: hook.itemColorSelected }),
        /* A disabled toggle that lit up under a finger would say it can be
         pressed. Pressed or not, the words under a finger are the page's. */
        rule(
          { formDisabled: false, interaction: ['hover', 'active'] },
          {
            backgroundColor: own.toggleHoverSurface(
              mix(token('color-foreground'), 5, 'transparent'),
            ),
            color: token('color-foreground'),
          },
        ),
        rule({ formDisabled: true }, { opacity: token('opacity-disabled') }),
      ]),
    ]),
    /* The press reaches `--helix-size-target`, in a transparent box, so nothing drawn
       moves. Where the control is already that size the box sits inside it. */
    on({ after: 'item' }, [
      web([
        rule({
          content: '""',
          inset: quotient(difference(token('size-target'), '100%'), '-2'),
          position: 'absolute',
        }),
      ]),
    ]),
    /* An icon before the label, or a count after it, set off by a step. */
    on({ region: 'start', slotted: '*' }, [rule({ marginInlineEnd: token('space-xs') })]),
    on({ region: 'end', slotted: '*' }, [rule({ marginInlineStart: token('space-xs') })]),
  ],
)
