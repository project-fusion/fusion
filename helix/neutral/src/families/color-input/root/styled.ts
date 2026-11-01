import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import {
  difference,
  fn,
  list,
  measured,
  native,
  product,
  quotient,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import input from './headless.js'

/**
 * Color Input's styled tier.
 *
 * **The frame wraps the whole field**, so the trigger sits inside the same box
 * as the text and one ring surrounds the control. The trigger fills the
 * trailing end of the field with a swatch of the color, on a checkerboard so a
 * color with alpha looks transparent: a conic gradient tile on the web and a
 * dashed path on a phone.
 *
 * **The panel is the house floating surface**, its own width, and the picker
 * pads every row of it.
 */
export default styles(
  input,
  {
    prefix: 'color-input',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border'),
      borderWidth: token('border-floating'),
      panelSize: '264px',
      shadow: token('shadow-floating'),
      swatchRadius: token('radii-sm'),
      swatchSize: token('size-control'),
    },
    own: { colorInputTravel: null },
    stylesheet: 'color-input/root/color-input-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const fast = token('duration-fast')
    const ease = [fast, token('easing-standard')]
    const swatch = measured('color-input-swatch', 'transparent')
    const line = [token('border-thin'), 'solid', token('color-border')]
    return [
      include(field),
      include(fieldStacked),
      on('field', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.backgroundColor,
          blockSize: token('size-control'),
          border: line,
          borderRadius: token('radii-sm'),
          display: 'flex',
          gap: token('space-2xs'),
          overflow: 'hidden',
          paddingInlineStart: token('space-field'),
          transition: list(['background-color', ...ease], ['border-color', ...ease]),
        }),
      ]),
      include(fieldFrame),
      on('field', [
        native([rule({ flexDirection: 'row' })]),
        rule(
          { invalid: true },
          { borderColor: token('color-danger'), outlineColor: token('color-danger') },
        ),
        /* Forced colors paint a danger edge the system color, so it thickens as well. */
        rule({ forcedColors: true, invalid: true }, { borderWidth: token('border-thick') }),
        rule({ readonly: true }, { backgroundColor: 'transparent' }),
        rule(
          { formDisabled: true },
          { opacity: token('opacity-disabled'), web: { cursor: 'not-allowed' } },
        ),
        rule({ reducedMotion: true }, { transition: 'none' }),
        /* The swatch shape: the block of color is the whole control. */
        rule(
          { variant: 'swatch' },
          {
            backgroundColor: 'transparent',
            border: 'none',
            inlineSize: web('max-content'),
            paddingInline: token('space-none'),
          },
        ),
        rule({ variant: 'swatch', within: { host: ['focusWithin'] } }, { outline: 'none' }),
        native([rule({ variant: 'swatch' }, { paddingInlineStart: token('space-none') })]),
      ]),
      /* The trigger fills the trailing end of the field. */
      on('trigger', [
        rule({
          web: { all: 'unset', boxSizing: 'border-box', cursor: 'pointer' },
          position: 'relative',
          alignItems: 'stretch',
          alignSelf: 'stretch',
          display: 'flex',
          flex: 'none',
        }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        web([rule({ formDisabled: true }, { cursor: 'not-allowed' })]),
        rule({ variant: 'swatch' }, { blockSize: hook.swatchSize, inlineSize: hook.swatchSize }),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing drawn
         moves. Where the control is already that size the box sits inside it. */
      on({ after: 'trigger' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      on('preview', [
        rule({
          borderInlineStart: line,
          boxSizing: 'border-box',
          display: 'block',
          inlineSize: token('size-control'),
        }),
        web([
          rule({
            backgroundImage: list(
              fn('linear-gradient', swatch, swatch),
              fn(
                'conic-gradient',
                [token('color-surface-sunken'), 0, '25%'],
                [token('color-surface'), 0, '50%'],
                [token('color-surface-sunken'), 0, '75%'],
                [token('color-surface'), 0],
              ),
            ),
            backgroundSize: list(['100%', '100%'], [token('space-sm'), token('space-sm')]),
          }),
        ]),
        native([rule({ overflow: 'hidden', position: 'relative' })]),
        rule(
          { variant: 'swatch' },
          {
            blockSize: '100%',
            border: line,
            borderRadius: hook.swatchRadius,
            inlineSize: '100%',
          },
        ),
      ]),
      on('preview-tile', [
        native([
          rule({
            backgroundColor: token('color-surface'),
            blockSize: product(token('space-sm'), 8),
            inlineSize: product(token('space-sm'), 128),
            insetBlockStart: 0,
            insetInlineStart: 0,
            position: 'absolute',
          }),
        ]),
      ]),
      on('preview-checker', [native([rule({ inset: 0, position: 'absolute' })])]),
      on('preview-squares', [
        native([
          rule({
            fill: 'none',
            stroke: token('color-surface-sunken'),
            strokeDasharray: '0.5 0.5',
            strokeWidth: 0.5,
          }),
        ]),
      ]),
      on('preview-fill', [
        native([rule({ backgroundColor: swatch, inset: 0, position: 'absolute' })]),
      ]),
      /* The panel, its own width, since a picker is not a longer text field. */
      on('surface', [
        rule({
          backgroundColor: token('color-surface-overlay'),
          border: [hook.borderWidth, 'solid', hook.borderColor],
          borderRadius: token('radii-sm'),
          boxShadow: hook.shadow,
          inlineSize: hook.panelSize,
          margin: token('space-none'),
          overflow: 'hidden',
          padding: token('space-none'),
          web: { inset: 'auto', position: 'absolute' },
        }),
      ]),
      /* Written out: closed, and held closed by two things, each enough on its own. */
      on({ part: 'surface', selector: '[part="surface"][hidden]' }, [
        web([rule({ display: 'none' })]),
      ]),
      on({ part: 'surface', selector: '[part="surface"]:not(:popover-open)' }, [
        web([rule({ display: 'none' })]),
      ]),
      /* It travels a little out of the edge it opened against. */
      on('surface', [
        rule({
          own: { colorInputTravel: product(token('space-2xs'), '-1') },
          opacity: 0,
          scale: 0.96,
          transform: fn('translateY', own.colorInputTravel),
          transition: list(
            ['opacity', fast, token('easing-standard')],
            ['scale', fast, token('easing-emphasized')],
            ['transform', fast, token('easing-emphasized')],
            ['display', fast, 'allow-discrete'],
            ['overlay', fast, 'allow-discrete'],
          ),
        }),
        rule({ placedTop: true }, { own: { colorInputTravel: token('space-2xs') } }),
        rule(
          { placedTop: true },
          { transformOrigin: [measured('floating-arrow-x', '50%'), '100%'] },
        ),
        rule({ placedBottom: true }, { transformOrigin: [measured('floating-arrow-x', '50%'), 0] }),
        rule({ part: { 'data-placed': true } }, { opacity: 1, scale: 1, transform: 'none' }),
        rule({ reducedMotion: true }, { scale: 1, transform: 'none', transition: 'none' }),
        web([rule({ supports: 'not (overlay: auto)' }, { transitionBehavior: 'normal' })]),
      ]),
      /* Inset on every side, so the square's mark stands whole inside the panel. */
      on('picker', [
        rule({ display: 'block', padding: token('space-sm') }),
        /* A phone's drawn element takes its place from the box around it, its margins and no padding. */
        native([rule({ margin: token('space-sm'), padding: token('space-none') })]),
      ]),
      /* What a page puts above or below the picker takes the picker's inset. */
      on({ region: 'panel-header', slotted: '*' }, [
        rule({
          display: 'block',
          margin: [token('space-sm'), token('space-sm'), token('space-none')],
        }),
      ]),
      on({ region: 'panel-footer', slotted: '*' }, [
        rule({
          display: 'block',
          margin: [token('space-none'), token('space-sm'), token('space-sm')],
        }),
      ]),
      /* What sits at either end keeps its size, so the text gives way. */
      on({ region: ['start', 'end'], slotted: '*' }, [
        rule({ color: token('color-foreground-muted'), flex: '0 0 auto' }),
      ]),
      on('host', [rule({ print: true }, { printColorAdjust: web('exact') })]),
    ]
  },
)
