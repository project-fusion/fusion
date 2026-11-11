import collectionState from '../../../fragments/collection-state.js'
import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import floatingEntrance from '../../../fragments/floating-entrance.js'
import floatingPanel from '../../../fragments/floating-panel.js'
import printExact from '../../../fragments/print-exact.js'
import tags from '../../../fragments/tags.js'
import visuallyHidden from '../../../fragments/visually-hidden.js'
import {
  difference,
  fn,
  list,
  measured,
  mix,
  native,
  product,
  quotient,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const

/**
 * Filter Input's styled tier.
 *
 * **The frame is the field**, so the tokens and the text share one box and one
 * focus ring. **It always wraps**, a line at a time as tokens are added, since
 * tokens are its resting state. The text keeps `control-size` across once tokens
 * share its line, and wraps to a line of its own below it.
 *
 * **The lead is a seam**: what stands before the text sits in a box pulled back
 * onto the field's padding, its edge running the field's full height. **A control
 * at either end is token-sized**, Tag's height, so the row reads as peers.
 *
 * **The clear mark is the chips' X**, `0.85em` in the same muted ink, in a target
 * of `icon-loose`. **The panel is the floating panel and its entrance**, as wide as
 * the field and never taller than the room measured under it, and the panel itself
 * scrolls, as its options are its own.
 */
export default styles(
  root,
  {
    prefix: 'filter-input',
    hooks: {
      actionPaddingInline: token('space-xs'),
      actionSize: token('size-tag'),
      backgroundColor: token('color-well'),
      borderColor: token('color-border-floating'),
      borderWidth: token('border-floating'),
      clearColor: token('color-foreground-muted'),
      clearColorHover: token('color-foreground'),
      controlSize: '6ch',
      fieldBorderColor: token('color-border'),
      leadBorderColor: token('color-border'),
      paddingInline: token('space-field'),
      panelSize: measured('floating-anchor-inline-size', '100%'),
      radius: token('radii-sm'),
      shadow: token('shadow-floating'),
      size: token('size-control'),
    },
    own: {
      collectionInsetBlock: null,
      collectionInsetInline: null,
      filterInputChipCorner: null,
      filterInputSize: null,
      floatingBorderColor: null,
      floatingBorderWidth: null,
      floatingShadow: null,
    },
    stylesheet: 'filter-input/root/filter-input-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const actions = {
      '--button-size': hook.actionSize,
      '--icon-button-size': hook.actionSize,
      '--button-padding-inline': hook.actionPaddingInline,
    } as const
    return [
      on('live', [rule([visuallyHidden])]),
      include(field),
      include(fieldStacked),
      include(tags),
      include(floatingPanel),
      include(floatingEntrance),
      include(collectionState),
      on('host', [
        rule({
          own: {
            filterInputSize: hook.size,
            /* A chip's corner, concentric with the field, never squarer than 2
               pixels or half the field's corner. Handed to the chips. */
            filterInputChipCorner: fn(
              'max',
              fn('min', product(hook.radius, 0.5), '2px'),
              difference(difference(hook.radius, token('border-thin')), token('space-2xs')),
            ),
          },
        }),
      ]),
      on('held', [native([rule({ display: 'none' })])]),
      on('field', [
        rule({
          alignItems: 'center',
          backgroundColor: hook.backgroundColor,
          border: [token('border-thin'), 'solid', hook.fieldBorderColor],
          borderRadius: hook.radius,
          color: token('color-foreground-muted'),
          display: 'flex',
          flexWrap: 'wrap',
          gap: token('space-2xs'),
          minBlockSize: own.filterInputSize,
          paddingInline: hook.paddingInline,
          transition: web(list(['border-color', ...ease], ['background-color', ...ease])),
        }),
        /* No more than a token leaves inside the field's own height, so one
           row of tokens keeps the field the control's height. */
        web([
          rule({
            paddingBlock: fn(
              'clamp',
              '0px',
              quotient(
                difference(
                  difference(own.filterInputSize, token('size-tag')),
                  product(token('border-thin'), 2),
                ),
                2,
              ),
              token('space-2xs'),
            ),
          }),
        ]),
        native([
          rule({ alignContent: 'center', flexDirection: 'row', paddingBlock: token('space-2xs') }),
        ]),
        /* Rows of chips stand a press apart on a touch screen. */
        rule(
          { coarsePointer: true },
          {
            rowGap: fn(
              'max',
              token('space-2xs'),
              difference(token('size-target'), token('size-tag')),
            ),
          },
        ),
        rule(
          { formDisabled: true },
          { cursor: web('not-allowed'), opacity: token('opacity-disabled') },
        ),
      ]),
      include(fieldFrame),
      on({ region: 'tags', slotted: '*' }, [rule({ flex: '0 0 auto', maxInlineSize: '100%' })]),
      /* The text keeps a usable width once tokens share its line, and wraps to a line of
         its own below them. Written out on the web, since the frame's own rule on the
         control sets the same property. */
      on({ part: 'control', selector: '[part="field"] [part="control"]' }, [
        web([rule({ flex: [1, 1, hook.controlSize] })]),
      ]),
      on('control', [
        native([rule({ flex: [1, 1, hook.controlSize] })]),
        /* A placeholder cut by the chips ends in an ellipsis. */
        web([rule({ textOverflow: 'ellipsis' })]),
      ]),
      /* A phone has no `ch`: the text keeps the height of a control across. */
      on('control', [native([rule({ minInlineSize: token('size-control') })])]),
      on('lead', [
        rule({
          ...actions,
          alignItems: 'center',
          alignSelf: 'stretch',
          borderInlineEnd: [token('border-thin'), 'solid', hook.leadBorderColor],
          display: 'flex',
          marginBlock: product(token('space-2xs'), '-1'),
          marginInlineEnd: difference(hook.paddingInline, token('space-2xs')),
          marginInlineStart: product(token('space-xs'), '-1'),
          paddingInline: token('space-2xs'),
        }),
        native([rule({ flexDirection: 'row' })]),
        rule({ part: { hidden: true } }, { display: 'none' }),
      ]),
      on({ region: 'end' }, [rule(actions)]),
      /* The color goes on the slot, where what is passed in inherits it: written on
         `::slotted`, it beat a slotted component's own `:host` color. */
      on({ region: ['start', 'end'] }, [rule({ color: token('color-foreground-muted') })]),
      on({ region: ['start', 'end'], slotted: '*' }, [rule({ flex: '0 0 auto' })]),
      /* The tokens stand in the field's own row, as the web's `display: contents` row does,
         so the text takes the room left on the last line. */
      on('tags', [native([rule({ display: 'contents' })])]),
      on(
        ['clear', 'voice'],
        [
          rule({
            web: { all: 'unset', cursor: 'pointer' },
            '--icon-size': '0.85em',
            alignItems: 'center',
            alignSelf: 'center',
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
            color: hook.clearColor,
            display: 'flex',
            flex: '0 0 auto',
            justifyContent: 'center',
            minBlockSize: token('size-icon-loose'),
            minInlineSize: token('size-icon-loose'),
            transition: web(['color', ...ease]),
          }),
          rule(
            { hover: true },
            {
              backgroundColor: mix('currentcolor', 12, 'transparent'),
              color: hook.clearColorHover,
            },
          ),
          rule(
            { focusVisible: true },
            {
              outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ],
      ),
      /* A phone draws the cross the web draws in `clear-icon`, at the chips' size. */
      on('clear-mark', [
        native([
          rule({
            blockSize: product(token('text-sm'), 0.85),
            inlineSize: product(token('text-sm'), 0.85),
          }),
        ]),
      ]),
      on('surface', [
        rule({
          own: {
            floatingBorderColor: hook.borderColor,
            floatingBorderWidth: hook.borderWidth,
            floatingShadow: hook.shadow,
          },
          boxSizing: 'border-box',
          inlineSize: hook.panelSize,
          maxBlockSize: measured('floating-available-block-size', '20rem'),
          minInlineSize: web('max-content'),
          overflowY: 'auto',
          paddingBlock: token('space-2xs'),
          paddingInline: token('space-none'),
          position: web('absolute'),
        }),
        native([rule({ minInlineSize: measured('floating-anchor-inline-size', '100%') })]),
      ]),
      on(
        ['empty', 'loading'],
        [
          rule({
            own: {
              collectionInsetBlock: token('space-xs'),
              collectionInsetInline: token('space-xs'),
            },
          }),
        ],
      ),
      /* The list fills the panel, which is already the surface. */
      on('listbox', [native([rule({ '--listbox-background-color': 'transparent' })])]),
      on('listbox-items', [
        native([
          rule({
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: token('radii-none'),
            paddingBlock: token('space-none'),
          }),
        ]),
      ]),
      include(printExact),
    ]
  },
)
