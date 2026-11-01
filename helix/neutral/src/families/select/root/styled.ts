import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import floatingEntrance from '../../../fragments/floating-entrance.js'
import floatingPanel from '../../../fragments/floating-panel.js'
import printExact from '../../../fragments/print-exact.js'
import visuallyHidden from '../../../fragments/visually-hidden.js'
import { oneOf } from '../../../render.js'
import {
  difference,
  fn,
  measured,
  native,
  product,
  quotient,
  safeArea,
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

/**
 * Select's styled tier.
 *
 * **The trigger wears the frame an input wears**, since in a form it stands in a row
 * with them, and a control that looks like a button among fields reads as an action.
 * **`emphasis="ghost"` drops the fill and the edge**, takes the width of what is in
 * it, and comes down a step, for a select in a row of tools or of prose. Focus still
 * draws an edge there.
 *
 * **The panel is the floating panel and its entrance**, handed the family's hooks. It
 * is as wide as its content with the trigger's width as the floor, both capped by the
 * window, and never taller than the room measured under the trigger. Its rows are
 * square, since they run the full width of the panel, and the list inside brings no
 * frame of its own.
 *
 * **The value stays on one line**, so a long answer does not make the closed control
 * taller than the fields beside it. **The indicator turns over** as the panel opens.
 */
export default styles(
  root,
  {
    prefix: 'select',
    hooks: {
      borderColor: null,
      borderWidth: null,
      shadow: null,
      surfaceMaxBlockSize: '14rem',
    },
    own: {
      floatingBorderColor: null,
      floatingBorderWidth: null,
      floatingShadow: null,
    },
    props: { emphasis: oneOf(['ghost']) },
    stylesheet: 'select/root/select-root.generated.css',
  },
  ({ hook, include, on, rule, variants }) => {
    const room = difference('100vw', product(token('space-xs'), 2))
    return [
      /* Before the rest, so a sheet below can still place its region. */
      on('live', [rule([visuallyHidden])]),
      include(field),
      include(fieldStacked),
      include(floatingPanel),
      include(floatingEntrance),
      on('host', [
        rule({
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-2xs'),
          position: web('relative'),
        }),
      ]),
      on('held', [native([rule({ display: 'none' })])]),
      on('trigger', [
        rule({
          all: web('unset'),
          position: web('relative'),
          alignItems: 'center',
          backgroundColor: token('color-well'),
          blockSize: token('size-control'),
          border: [token('border-thin'), 'solid', token('color-border')],
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: token('color-foreground'),
          cursor: web('pointer'),
          display: 'flex',
          flexDirection: 'row',
          fontFamily: token('font-sans'),
          fontSize: fn('max', token('text-field-min'), token('text-field')),
          fontWeight: token('weight-medium'),
          gap: token('space-xs'),
          justifyContent: 'space-between',
          paddingInline: token('space-field'),
          transition: web(['border-color', token('duration-fast'), token('easing-standard')]),
        }),
      ]),
      /* Written out: `:host(:disabled)`, a fieldset's too, and never `[disabled]`. */
      on({ part: 'trigger', selector: ':host(:not(:disabled)) [part="trigger"]:hover' }, [
        web([rule({ borderColor: token('color-border-hover') })]),
      ]),
      on('trigger', [
        rule(
          { focusVisible: true },
          {
            borderColor: token('color-primary'),
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: 0,
          },
        ),
      ]),
      on({ part: 'trigger', selector: ':host(:state(invalid)) [part="trigger"]' }, [
        web([rule({ borderColor: token('color-danger'), outlineColor: token('color-danger') })]),
      ]),
      on({ part: 'trigger', selector: ':host(:state(invalid)) [part="trigger"]:hover' }, [
        web([rule({ borderColor: token('color-danger'), outlineColor: token('color-danger') })]),
      ]),
      on({ part: 'trigger', selector: ':host(:state(invalid)) [part="trigger"]:focus-visible' }, [
        web([rule({ borderColor: token('color-danger'), outlineColor: token('color-danger') })]),
      ]),
      on('trigger', [native([rule({ invalid: true }, { borderColor: token('color-danger') })])]),
      on({ part: 'trigger', selector: ':host(:disabled) [part="trigger"]' }, [
        web([rule({ cursor: 'not-allowed', opacity: token('opacity-disabled') })]),
      ]),
      on('trigger', [
        native([rule({ formDisabled: true }, { opacity: token('opacity-disabled') })]),
      ]),
      on('host', [variants('emphasis', { ghost: { inlineSize: 'fit-content' } })]),
      on('trigger', [
        variants('emphasis', {
          ghost: {
            backgroundColor: 'transparent',
            blockSize: token('size-control-tight'),
            borderColor: 'transparent',
            justifyContent: 'start',
            paddingInline: token('space-2xs'),
          },
        }),
      ]),
      on(
        {
          part: 'trigger',
          selector: ':host([emphasis="ghost"]:not(:disabled)) [part="trigger"]:hover',
        },
        [
          web([
            rule({
              backgroundColor: token('color-hover'),
              borderColor: 'transparent',
            }),
          ]),
        ],
      ),
      on(
        { part: 'trigger', selector: ':host([emphasis="ghost"]) [part="trigger"]:focus-visible' },
        [web([rule({ borderColor: token('color-primary') })])],
      ),
      on('value', [
        rule({
          flex: web(1),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }),
        /* A phone's zero basis would leave no room in a ghost trigger as wide as its value. */
        native([rule({ flexGrow: 1, flexShrink: 1 })]),
        /* Nothing chosen yet, drawn as a field's `::placeholder` is, so "Choose" does
           not read as an answer. */
        rule(
          { part: { 'data-placeholder': true } },
          { color: token('color-foreground-muted'), fontWeight: token('weight-regular') },
        ),
      ]),
      on('surface', [
        rule({
          own: {
            floatingBorderColor: hook.borderColor(token('color-border')),
            floatingBorderWidth: hook.borderWidth(token('border-floating')),
            floatingShadow: hook.shadow(token('shadow-floating')),
          },
          '--option-radius': token('radii-none'),
          inlineSize: web('max-content'),
          maxBlockSize: measured('floating-available-block-size', 'none'),
          maxInlineSize: web(room),
          minInlineSize: fn('min', measured('floating-anchor-inline-size', '100%'), room),
          paddingBlock: token('space-xs'),
          paddingInline: token('space-none'),
        }),
      ]),
      on('surface', [
        native([
          rule(
            { sheet: true },
            {
              borderEndEndRadius: token('radii-none'),
              borderEndStartRadius: token('radii-none'),
              paddingBlockEnd: sum(token('space-xs'), safeArea('bottom')),
            },
          ),
        ]),
      ]),
      on({ backdrop: 'surface' }, [
        native([rule({ sheet: true }, { backgroundColor: token('color-overlay') })]),
      ]),
      on('indicator', [
        rule({
          transition: web(['scale', token('duration-fast'), token('easing-standard')]),
        }),
      ]),
      on({ region: 'indicator', slotted: '*' }, [
        rule({
          transition: web(['scale', token('duration-fast'), token('easing-standard')]),
        }),
        rule({ open: true }, { scale: '1 -1' }),
      ]),
      on('indicator', [
        web([rule({ open: true }, { scale: '1 -1' })]),
        native([rule({ open: true }, { transform: 'scaleY(-1)' })]),
      ]),
      on('listbox-items', [
        rule({
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: token('radii-none'),
          maxBlockSize: hook.surfaceMaxBlockSize,
          padding: token('space-none'),
        }),
      ]),
      on({ part: 'listbox-items', selector: '[part="listbox"]::part(items):focus-visible' }, [
        web([rule({ outline: 'none' })]),
      ]),
      on('indicator', [
        rule({
          blockSize: token('size-icon-tight'),
          color: token('color-foreground-muted'),
          flex: '0 0 auto',
          inlineSize: token('size-icon-tight'),
        }),
      ]),
      on('trigger', [
        rule({ active: true, formDisabled: false }, { backgroundColor: token('color-press') }),
      ]),
      /* The press reaches `--helix-size-target`, in a transparent box, so nothing
         drawn moves. Where the control is already that size the box sits inside it. */
      on({ after: 'trigger' }, [
        web([
          rule({
            content: '""',
            inset: quotient(difference(token('size-target'), '100%'), '-2'),
            position: 'absolute',
          }),
        ]),
      ]),
      include(printExact),
    ]
  },
)
