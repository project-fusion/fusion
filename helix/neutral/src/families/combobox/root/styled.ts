import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import floatingEntrance from '../../../fragments/floating-entrance.js'
import floatingPanel from '../../../fragments/floating-panel.js'
import printExact from '../../../fragments/print-exact.js'
import tags from '../../../fragments/tags.js'
import visuallyHidden from '../../../fragments/visually-hidden.js'
import { difference, list, measured, native, product, sum, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const

/**
 * Combobox's styled tier.
 *
 * **The frame is the field**, so the focus ring is drawn once around the whole control
 * and the caret and any mark sit inside one border with the text, as Input's do. **With
 * tags in it the field grows**, and the caret comes out of the wrap to the field's end,
 * since it says the whole control opens.
 *
 * **The panel is the floating panel and its entrance**, handed the family's hooks: as
 * wide as its widest option with the field's width as the floor, never wider than the
 * screen less a margin, and never taller than the room measured under the field. **The
 * create row is dressed as a row of the list**, and takes the wash a highlighted option
 * takes.
 */
export default styles(
  root,
  {
    prefix: 'combobox',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border'),
      borderWidth: token('border-floating'),
      controlSize: '4ch',
      panelSize: 'max-content',
      shadow: token('shadow-floating'),
    },
    own: {
      floatingBorderColor: null,
      floatingBorderWidth: null,
      floatingShadow: null,
    },
    stylesheet: 'combobox/root/combobox-root.generated.css',
  },
  ({ hook, include, on, rule }) => {
    const caret = {
      '--icon-size': token('size-icon-tight'),
      blockSize: token('size-icon-tight'),
      color: token('color-foreground-muted'),
      flex: '0 0 auto',
      inlineSize: token('size-icon-tight'),
    } as const
    const turning = {
      transition: web(['scale', ...ease]),
    } as const
    return [
      on('live', [rule([visuallyHidden])]),
      include(field),
      include(fieldStacked),
      include(tags),
      include(floatingPanel),
      include(floatingEntrance),
      on('host', [rule({ position: web('relative') })]),
      on('held', [native([rule({ display: 'none' })])]),
      on('field', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.backgroundColor,
          blockSize: token('size-control'),
          border: [token('border-thin'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          display: 'flex',
          gap: token('space-xs'),
          paddingInline: token('space-field'),
          transition: web(list(['background-color', ...ease], ['border-color', ...ease])),
        }),
        native([rule({ alignContent: 'center', flexDirection: 'row', flexWrap: 'wrap' })]),
      ]),
      include(fieldFrame),
      on('field', [
        rule(
          { invalid: true },
          { borderColor: token('color-danger'), outlineColor: token('color-danger') },
        ),
        rule({ readonly: true }, { backgroundColor: 'transparent' }),
        rule({ forcedColors: true, invalid: true }, { borderWidth: token('border-thick') }),
      ]),
      /* With tags in it the field grows, and only then. */
      on({ part: 'field', selector: '[part="field"]:has([part="tags"])' }, [
        web([
          rule({
            blockSize: 'auto',
            flexWrap: 'wrap',
            minBlockSize: token('size-control'),
            paddingBlock: token('space-2xs'),
            paddingInlineEnd: sum(token('space-field'), token('size-icon-tight')),
            position: 'relative',
          }),
        ]),
      ]),
      /* A phone's caret stays in the wrap, at the end of the last line, where the
         text grows to it: Yoga centers an absolute box only between both its insets. */
      on('field', [
        native([
          rule(
            { part: { 'data-grown': true } },
            {
              blockSize: 'auto',
              minBlockSize: token('size-control'),
              paddingBlock: token('space-2xs'),
            },
          ),
        ]),
      ]),
      on('indicator', [rule(turning)]),
      on({ region: 'indicator', slotted: '*' }, [rule(turning)]),
      /* The caret comes out of the wrap, and stands at the field's end. */
      on({ part: 'indicator', selector: '[part="field"]:has([part="tags"]) [part="indicator"]' }, [
        web([
          rule({
            insetBlockStart: '50%',
            insetInlineEnd: token('space-xs'),
            position: 'absolute',
            translate: '0 -50%',
          }),
        ]),
      ]),
      on(
        {
          part: 'indicator',
          selector: '[part="field"]:has([part="tags"]) ::slotted([slot="indicator"])',
        },
        [
          web([
            rule({
              insetBlockStart: '50%',
              insetInlineEnd: token('space-xs'),
              position: 'absolute',
              translate: '0 -50%',
            }),
          ]),
        ],
      ),
      on('tag', [rule({ flex: '0 0 auto', maxInlineSize: '100%' })]),
      on('tags', [
        native([
          rule({
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: token('space-xs'),
          }),
        ]),
      ]),
      /* The text keeps a usable width once tags share its line. */
      on({ part: 'control', selector: '[part="field"]:has([part="tags"]) [part="control"]' }, [
        web([rule({ flex: [1, 1, hook.controlSize] })]),
      ]),
      /* A phone has no `ch`: the text keeps the height of a control across. */
      on('control', [native([rule({ minInlineSize: token('size-control') })])]),
      on('field', [
        rule(
          { formDisabled: true },
          { cursor: web('not-allowed'), opacity: token('opacity-disabled') },
        ),
      ]),
      on('indicator', [rule(caret)]),
      on({ region: 'indicator', slotted: '*' }, [rule(caret)]),
      on('indicator', [
        web([rule({ open: true }, { scale: '1 -1' })]),
        native([rule({ open: true }, { transform: 'scaleY(-1)' })]),
      ]),
      on({ region: 'indicator', slotted: '*' }, [rule({ open: true }, { scale: '1 -1' })]),
      /* The color goes on the slot, where what is passed in inherits it: written on
         `::slotted`, it beat a slotted component's own `:host` color. */
      on({ region: ['start', 'end'] }, [rule({ color: token('color-foreground-muted') })]),
      on({ region: ['start', 'end'], slotted: '*' }, [
        rule({
          '--icon-size': token('size-icon'),
          flex: '0 0 auto',
        }),
      ]),
      on('surface', [
        rule({
          own: {
            floatingBorderColor: hook.borderColor,
            floatingBorderWidth: hook.borderWidth,
            floatingShadow: hook.shadow,
          },
          boxSizing: 'border-box',
          inlineSize: web(hook.panelSize),
          maxBlockSize: measured('floating-available-block-size', 'none'),
          maxInlineSize: difference('100vw', product(token('space-md'), 2)),
          minInlineSize: measured('floating-anchor-inline-size', '100%'),
          overflow: 'hidden',
          padding: token('space-none'),
          position: web('absolute'),
        }),
      ]),
      /* A row of the list, chosen the same way. `all: unset` first, since a `<button>`
         arrives with a background, a border, and a font of its own. */
      on('create', [
        rule({
          all: web('unset'),
          borderBlockStart: [token('border-thin'), 'solid', token('color-border')],
          boxSizing: 'border-box',
          color: token('color-foreground'),
          cursor: web('pointer'),
          display: web('block'),
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          inlineSize: '100%',
          paddingBlock: token('space-xs'),
          paddingInline: token('space-sm'),
          textAlign: 'start',
          transition: web(['background-color', ...ease]),
        }),
        rule({ hover: true }, { backgroundColor: token('color-hover') }),
        rule({ also: { 'create-active': true } }, { backgroundColor: token('color-hover') }),
        /* Inside the panel's own edge, which clips an outline drawn outward. */
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: product(token('size-focus-offset'), '-1'),
          },
        ),
        native([rule({ active: true }, { backgroundColor: token('color-press') })]),
      ]),
      /* The list fills the panel, which is already the surface. */
      on('listbox', [
        rule({
          '--listbox-background-color': 'transparent',
          border: web('none'),
          display: web('block'),
        }),
      ]),
      on('listbox-items', [
        native([
          rule({
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: token('radii-none'),
          }),
        ]),
      ]),
      include(printExact),
    ]
  },
)
