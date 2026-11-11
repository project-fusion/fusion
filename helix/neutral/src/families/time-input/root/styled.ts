import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldSegments from '../../../fragments/field-segments.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import floatingEntrance from '../../../fragments/floating-entrance.js'
import floatingPanel from '../../../fragments/floating-panel.js'
import printExact from '../../../fragments/print-exact.js'
import tags from '../../../fragments/tags.js'
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
import root from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const

/**
 * Time Input's styled tier.
 *
 * **The frame is the field**, so the trigger sits inside the same box as the text and
 * one ring surrounds the control. **The trigger is a mark in the field**, the clock,
 * with no box of its own. **With several times the field grows**, and their tags
 * wrap.
 *
 * **The panel is the floating panel and its entrance**, as wide as the field, since
 * its rows are the same words the field shows; the wheels take their own width,
 * three columns of two digits having no use for a wide band. The row of segments is
 * the shared segments fragment, handed the family's hooks.
 */
export default styles(
  root,
  {
    prefix: 'time-input',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border-floating'),
      borderWidth: token('border-floating'),
      segmentFocusBackgroundColor: token('color-primary-surface'),
      segmentFocusColor: token('color-foreground-on-primary'),
      segmentLiteralColor: token('color-foreground-muted'),
      segmentPlaceholderColor: token('color-foreground-muted'),
      shadow: token('shadow-floating'),
    },
    own: {
      floatingBorderColor: null,
      floatingBorderWidth: null,
      floatingShadow: null,
      segmentFocusBackgroundColor: null,
      segmentFocusColor: null,
      segmentLiteralColor: null,
      segmentPlaceholderColor: null,
    },
    stylesheet: 'time-input/root/time-input-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(field),
    on('field', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor,
        border: [token('border-thin'), 'solid', token('color-border')],
        borderRadius: token('radii-sm'),
        display: 'flex',
        flexWrap: 'wrap',
        gap: token('space-2xs'),
        minBlockSize: token('size-control'),
        paddingInline: token('space-field'),
        transition: web(list(['background-color', ...ease], ['border-color', ...ease])),
      }),
      /* No more than a tag leaves inside the field's own height, as Filter
         Input sets it. A phone has no `clamp()`. */
      web([
        rule({
          paddingBlock: fn(
            'clamp',
            '0px',
            quotient(
              difference(
                difference(token('size-control'), token('size-tag')),
                product(token('border-thin'), 2),
              ),
              2,
            ),
            token('space-2xs'),
          ),
        }),
      ]),
      native([rule({ flexDirection: 'row', paddingBlock: token('space-2xs') })]),
      /* One line where one time is held: a field with no tags has nothing to wrap,
         and wrapping it put the clock on a line of its own. */
      rule({ mode: { not: 'multiple' } }, { flexWrap: 'nowrap' }),
      native([rule({ mode: 'multiple' }, { alignContent: 'center' })]),
    ]),
    include(fieldFrame),
    /* Wrong, and the field says so, over the hover and the focus edges. */
    on('field', [
      rule(
        { invalid: true },
        { borderColor: token('color-danger'), outlineColor: token('color-danger') },
      ),
      rule({ readonly: true }, { backgroundColor: 'transparent' }),
      rule({ forcedColors: true, invalid: true }, { borderWidth: token('border-thick') }),
    ]),
    include(fieldStacked),
    include(fieldSegments),
    include(tags),
    include(floatingPanel),
    include(floatingEntrance),
    /* The color goes on the slot, where what is passed in inherits it: written on
       `::slotted`, it beat a slotted component's own `:host` color. */
    on({ region: ['start', 'end'] }, [rule({ color: token('color-foreground-muted') })]),
    on({ region: ['start', 'end'], slotted: '*' }, [rule({ flex: 'none' })]),
    /* A mark in the field at the step every field's indicator takes, in a box
       a step past the glyph whose negative margin keeps it from widening the
       field; the press reaches the target past it. */
    on('trigger', [
      rule({
        all: web('unset'),
        '--icon-size': token('size-icon-tight'),
        alignItems: 'center',
        blockSize: token('size-icon-loose'),
        boxSizing: 'border-box',
        color: token('color-foreground-muted'),
        cursor: web('pointer'),
        display: 'flex',
        flex: 'none',
        inlineSize: token('size-icon-loose'),
        justifyContent: 'center',
        margin: quotient(difference(token('size-icon-tight'), token('size-icon-loose')), 2),
        position: 'relative',
        transition: web(['color', ...ease]),
      }),
    ]),
    on('trigger-icon', [
      rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') }),
      native([rule({ '--icon-size': token('size-icon-tight') })]),
    ]),
    on('trigger', [
      rule({ hover: true, readonly: false }, { color: token('color-foreground') }),
      /* Read-only, and the trigger says the panel does not open. */
      rule({ readonly: true }, { cursor: web('default'), opacity: token('opacity-disabled') }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
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
    /* Input's clear button, a mark in the field beside the trigger. */
    on('clear', [
      rule({
        all: web('unset'),
        '--icon-size': token('size-icon-tight'),
        alignItems: 'center',
        borderRadius: token('radii-sm'),
        boxSizing: 'border-box',
        color: token('color-foreground-muted'),
        cursor: web('pointer'),
        display: 'flex',
        flex: '0 0 auto',
        justifyContent: 'center',
        minBlockSize: token('size-icon-loose'),
        minInlineSize: token('size-icon-loose'),
        transition: web(['color', ...ease]),
      }),
      rule({ hover: true }, { color: token('color-foreground') }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
    ]),
    on('clear-mark', [
      native([
        rule({
          blockSize: token('size-icon-tight'),
          color: token('color-foreground-muted'),
          inlineSize: token('size-icon-tight'),
        }),
      ]),
    ]),
    /* The panel, as wide as the field, and its rows reach its edges. */
    on('surface', [
      rule({
        own: {
          floatingBorderColor: hook.borderColor,
          floatingBorderWidth: hook.borderWidth,
          floatingShadow: hook.shadow,
        },
        inlineSize: measured('floating-anchor-inline-size', '100%'),
        minInlineSize: web('max-content'),
        overflow: 'hidden',
        paddingBlock: token('space-2xs'),
        paddingInline: token('space-none'),
        position: web('absolute'),
      }),
      /* The wheels take their own width, not the field's. */
      rule({ picker: 'wheels' }, { inlineSize: web('max-content') }),
      /* A phone's reader may set text so large the times outgrow the window: the
         panel keeps inside it. */
      native([
        rule({
          maxBlockSize: measured('floating-available-block-size', 'none'),
          maxInlineSize: difference('100vw', product(token('space-md'), 2)),
        }),
      ]),
    ]),
    /* The list sits in this panel, which is already its frame, so the list
       draws none of its own. */
    on('picker', [
      rule({
        '--time-picker-list-background-color': 'transparent',
        '--time-picker-list-border-width': 0,
      }),
    ]),
    on({ region: 'panel-header', slotted: '*' }, [
      rule({
        display: web('block'),
        marginBlockEnd: token('space-sm'),
        marginInline: token('space-sm'),
      }),
    ]),
    on({ region: 'panel-footer', slotted: '*' }, [
      rule({
        display: web('block'),
        marginBlockStart: token('space-sm'),
        marginInline: token('space-sm'),
      }),
    ]),
    on('field', [
      rule(
        { formDisabled: true },
        { cursor: web('not-allowed'), opacity: token('opacity-disabled') },
      ),
    ]),
    on('trigger', [rule({ formDisabled: true }, { cursor: web('not-allowed') })]),
    on(['clear', 'field', 'trigger'], [rule({ reducedMotion: true }, { transition: 'none' })]),
    /* The held times, and the text keeps somewhere to type beside them. */
    on('time', [rule({ flex: 'none' })]),
    on('control', [
      rule({ mode: 'multiple' }, { flexBasis: 0, minInlineSize: token('size-icon-loose') }),
      native([rule({ mode: 'multiple' }, { flexGrow: 1 })]),
    ]),
    on('tags', [
      native([
        rule({
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: token('space-2xs'),
        }),
      ]),
    ]),
    on('segments', [
      rule({
        own: {
          segmentFocusBackgroundColor: hook.segmentFocusBackgroundColor,
          segmentFocusColor: hook.segmentFocusColor,
          segmentLiteralColor: hook.segmentLiteralColor,
          segmentPlaceholderColor: hook.segmentPlaceholderColor,
        },
      }),
      native([rule({ flexDirection: 'row' })]),
    ]),
    /* A phone's segment is a field of its own, in the row's words. */
    include(printExact),
  ],
)
