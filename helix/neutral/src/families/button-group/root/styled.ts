import { oneOf } from '../../../render.js'
import { fn, hookOf, native, product, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Button Group's styled tier.
 *
 * **One shape out of several buttons.** The outer corners keep their radius,
 * the inner ones go flat, and each button after the first is pulled onto its
 * neighbor's border, so the two share one line. A button's corners are on
 * the control inside it, so the group flattens them through the button's own
 * `--button-radius-*` hooks, which an icon button reads too.
 *
 * **`size` sets the density steps on the group**, so every button in it
 * takes them, as `data-density` on the group does. The steps are written
 * before the ones derived from them, which a phone resolves in order. A
 * native `<button>` takes the height and the text size as well, on the web.
 *
 * **A pressed button's look is resolved here and drawn by the button.** The
 * web group writes the button's color hooks onto a pressed button's control,
 * a Button's or an Icon Button's, reading the values below. A phone's Button
 * and Icon Button draw the same look themselves, from the same hooks of this
 * group's.
 *
 * **A hovered or focused button draws above its neighbors**, so the border
 * it lights is not half covered. A phone cannot read a child's hover, and
 * draws a later button over an earlier one.
 */
export default styles(
  root,
  {
    prefix: 'button-group',
    hooks: ({ own }) => ({
      gap: token('space-xs'),
      pressedBackgroundColor: token('color-foreground'),
      pressedBorderColor: own.buttonGroupPressedBackground,
      pressedColor: token('color-background'),
    }),
    own: {
      buttonGroupPressedBackground: null,
      buttonGroupPressedBorder: null,
      buttonGroupPressedForeground: null,
    },
    props: { size: oneOf(['sm', 'md', 'lg']), variant: oneOf(['joined', 'spaced']) },
    stylesheet: 'button-group/root/button-group-root.generated.css',
  },
  ({ hook, on, rule, variants }) => [
    on('host', [
      /* The group stays in its column, and its buttons cut their labels. */
      rule({ display: 'inline-flex', maxInlineSize: '100%' }),
      variants('size', {
        sm: {
          '--helix-size-checkbox': token('size-checkbox-sm'),
          '--helix-size-control': token('size-control-sm'),
          '--helix-size-icon': token('size-icon-sm'),
          '--helix-size-switch': token('size-switch-sm'),
          '--helix-size-tag': token('size-tag-sm'),
          '--helix-space-control': token('space-sm'),
          '--helix-space-field': token('space-xs'),
          '--helix-text-control': token('text-control-sm'),
          '--helix-text-field': token('text-sm'),
          '--helix-text-field-label': token('text-xs'),
          '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
          '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
          '--helix-size-control-tight': web(
            fn('round', product(token('size-control'), 0.8), '1px'),
          ),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
        },
        md: {
          '--helix-size-checkbox': token('size-checkbox-md'),
          '--helix-size-control': token('size-control-md'),
          '--helix-size-icon': token('size-icon-md'),
          '--helix-size-switch': token('size-switch-md'),
          '--helix-size-tag': token('size-tag-md'),
          '--helix-space-control': token('space-md'),
          '--helix-space-field': token('space-sm'),
          '--helix-text-control': token('text-control-md'),
          '--helix-text-field': token('text-md'),
          '--helix-text-field-label': token('text-sm'),
          '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
          '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
          '--helix-size-control-tight': web(
            fn('round', product(token('size-control'), 0.8), '1px'),
          ),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
        },
        lg: {
          '--helix-size-checkbox': token('size-checkbox-lg'),
          '--helix-size-control': token('size-control-lg'),
          '--helix-size-icon': token('size-icon-lg'),
          '--helix-size-switch': token('size-switch-lg'),
          '--helix-size-tag': token('size-tag-lg'),
          '--helix-space-control': token('space-lg'),
          '--helix-space-field': token('space-md'),
          '--helix-text-control': token('text-control-lg'),
          '--helix-text-field': token('text-md'),
          '--helix-text-field-label': token('text-sm'),
          '--helix-size-checkbox-loose': product(token('size-checkbox'), 1.2),
          '--helix-size-checkbox-tight': product(token('size-checkbox'), 0.8),
          '--helix-size-control-tight': web(
            fn('round', product(token('size-control'), 0.8), '1px'),
          ),
          '--helix-size-control-loose': product(token('size-control'), 1.2),
          '--helix-size-icon-tight': product(token('size-icon'), 0.8),
          '--helix-size-icon-loose': product(token('size-icon'), 1.2),
        },
      }),
      /* A phone has no `round()`, and takes the step as it falls. */
      native([
        rule(
          { size: ['sm', 'md', 'lg'] },
          { '--helix-size-control-tight': product(token('size-control'), 0.8) },
        ),
      ]),
      /* The look of a pressed button, in a selection mode: the solid fill,
         resolved here so a hook set on the group or above it reaches every
         button. */
      rule(
        { selectionMode: true },
        {
          own: {
            buttonGroupPressedBackground: hook.pressedBackgroundColor,
            buttonGroupPressedBorder: hook.pressedBorderColor,
            buttonGroupPressedForeground: hook.pressedColor,
          },
        },
      ),
      /* **Stacked, and the shape turns with it.** The rules above join the
         buttons along the inline axis, so a column clears them and joins
         along the block axis. */
      rule({ orientation: 'vertical' }, { alignItems: 'stretch', flexDirection: 'column' }),
      /* The same set, spaced. */
      rule({ variant: 'spaced' }, { gap: hook.gap }),
      /* A control is not printed. */
      rule({ print: true }, { display: 'none' }),
    ]),
    /* A native button takes the size too, which reaches a Helix button
       through the steps above and never reached a native one: measured 27px
       in a large group. Only under `size`, so a group without one leaves it
       as it was. A phone has no native button. */
    on({ slotted: 'button' }, [
      web([
        rule({ size: true }, { blockSize: token('size-control'), fontSize: token('text-control') }),
      ]),
    ]),
    /* Each button after the first is pulled onto its neighbor's border, so
       the two share one line. */
    on({ slotted: '*' }, [
      /* The floor is one control, so a long label beside a short one cannot
         squeeze the short one to nothing. */
      web([rule({ minInlineSize: fn('min', token('size-control'), '100%') })]),
      rule(
        { child: 'later', variant: { not: 'spaced' } },
        { marginInlineStart: product(token('border-thin'), '-1') },
      ),
      /* One shape, so the inner corners go flat and the outer ones keep their
         radius. */
      rule({ child: 'later', variant: { not: 'spaced' } }, { '--button-radius-start': 0 }),
      rule({ child: 'earlier', variant: { not: 'spaced' } }, { '--button-radius-end': 0 }),
      rule(
        { child: 'later', orientation: 'vertical', variant: { not: 'spaced' } },
        {
          '--button-radius-start-start': 0,
          '--button-radius-start-end': 0,
          '--button-radius-start': hookOf('button', 'radius', token('radii-sm')),
          marginBlockStart: product(token('border-thin'), '-1'),
          /* Cleared, or the row's pull is still in effect sideways and every
             button after the first sits a border to the left of the one above
             it. */
          marginInlineStart: 0,
        },
      ),
      rule(
        { child: 'earlier', orientation: 'vertical', variant: { not: 'spaced' } },
        {
          '--button-radius-end-end': 0,
          '--button-radius-end-start': 0,
          '--button-radius-end': hookOf('button', 'radius', token('radii-sm')),
        },
      ),
      /* A hovered or focused button draws above its neighbors, or the border it
         lights up is half covered by the one overlapping it. */
      rule([{ hover: true }, { focusWithin: true }], {
        position: 'relative',
        zIndex: token('layer-raised'),
      }),
    ]),
  ],
)
