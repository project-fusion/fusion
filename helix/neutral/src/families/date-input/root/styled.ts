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
  sum,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const

/**
 * Date Input's styled tier.
 *
 * **The frame is the field**, so the trigger sits inside the same box as the text and
 * one ring surrounds the control. **The trigger is a mark in the field**, the calendar
 * icon at the tight step, in a box that keeps it from widening the field. **With several
 * dates the field grows**, and their tags wrap.
 *
 * **The panel is the floating panel and its entrance**, the calendar's own width: seven
 * columns have a width that belongs to them. The row of segments is the shared
 * segments fragment, handed the family's hooks.
 */
export default styles(
  root,
  {
    prefix: 'date-input',
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
    stylesheet: 'date-input/root/date-input-root.generated.css',
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
         Input sets it, so one line keeps the field the control's height. A
         phone has no `clamp()`. */
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
      /* With several dates the trigger stands at the field's end, centered on
         its height, and opens the panel for the whole field. */
      web([
        rule(
          { mode: 'multiple' },
          {
            paddingInlineEnd: sum(token('space-field'), token('size-icon-tight')),
            position: 'relative',
          },
        ),
      ]),
      /* One line where one date is held, so a narrow field keeps its trigger in place. */
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
    on('control', [rule({ mode: { not: 'multiple' } }, { textOverflow: web('ellipsis') })]),
    /* The color goes on the slot, where what is passed in inherits it: written on
       `::slotted`, it beat a slotted component's own `:host` color. */
    on({ region: ['start', 'end'] }, [rule({ color: token('color-foreground-muted') })]),
    on({ region: ['start', 'end'], slotted: '*' }, [rule({ flex: 'none' })]),
    /* A mark in the field at the tight step every field glyph takes, in a
       box the clear button's size, whose negative margin keeps it from
       widening the field; the press reaches the target. */
    on('trigger', [
      rule({
        all: web('unset'),
        position: 'relative',
        blockSize: token('size-icon-loose'),
        boxSizing: 'border-box',
        color: token('color-foreground-muted'),
        cursor: web('pointer'),
        display: 'grid',
        flex: 'none',
        inlineSize: token('size-icon-loose'),
        margin: quotient(difference(token('size-icon-tight'), token('size-icon-loose')), 2),
        placeItems: 'center',
        transition: web(['color', ...ease]),
      }),
      native([rule({ alignItems: 'center', display: 'flex', justifyContent: 'center' })]),
      web([
        rule(
          { mode: 'multiple' },
          {
            insetBlockStart: '50%',
            insetInlineEnd: token('space-field'),
            marginBlock: token('space-none'),
            position: 'absolute',
            translate: '0 -50%',
          },
        ),
      ]),
    ]),
    on({ after: 'trigger' }, [
      web([
        rule({
          content: '""',
          inset: quotient(difference(token('size-target'), '100%'), '-2'),
          position: 'absolute',
        }),
      ]),
    ]),
    on({ part: 'trigger-icon', selector: '[part="trigger"] svg' }, [
      web([rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') })]),
    ]),
    on({ region: 'trigger', slotted: '*' }, [
      web([
        rule({
          '--icon-size': token('size-icon-tight'),
          blockSize: token('size-icon-tight'),
          inlineSize: token('size-icon-tight'),
        }),
      ]),
    ]),
    on('trigger-icon', [
      native([
        rule({
          '--icon-size': token('size-icon-tight'),
          blockSize: token('size-icon-tight'),
          inlineSize: token('size-icon-tight'),
        }),
      ]),
    ]),
    on('trigger', [
      rule({ hover: true, readonly: false }, { color: token('color-foreground') }),
      /* Read-only, and the mark says the panel does not open. */
      rule({ readonly: true }, { cursor: web('default'), opacity: token('opacity-disabled') }),
      rule(
        { focusVisible: true },
        {
          outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
          outlineOffset: token('size-focus-offset'),
        },
      ),
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
    /* The panel, the calendar's own width. */
    on('surface', [
      rule({
        own: {
          floatingBorderColor: hook.borderColor,
          floatingBorderWidth: hook.borderWidth,
          floatingShadow: hook.shadow,
        },
        inlineSize: web('max-content'),
        /* No taller than the room it opened into, scrolling inside it. */
        maxBlockSize: measured('floating-available-block-size', 'none'),
        overflowY: 'auto',
        padding: token('space-sm'),
        position: web('absolute'),
      }),
      /* A phone's reader may set text so large the calendar outgrows the window: the
         panel keeps inside it. */
      native([rule({ maxInlineSize: difference('100vw', product(token('space-md'), 2)) })]),
    ]),
    on({ region: 'panel-header', slotted: '*' }, [
      rule({ display: web('block'), marginBlockEnd: token('space-sm') }),
    ]),
    on({ region: 'panel-footer', slotted: '*' }, [
      rule({ display: web('block'), marginBlockStart: token('space-sm') }),
    ]),
    on('field', [
      rule(
        { formDisabled: true },
        { cursor: web('not-allowed'), opacity: token('opacity-disabled') },
      ),
    ]),
    on(['control', 'trigger'], [rule({ formDisabled: true }, { cursor: web('not-allowed') })]),
    on(['clear', 'field', 'trigger'], [rule({ reducedMotion: true }, { transition: 'none' })]),
    /* The held dates, and the text keeps somewhere to type beside them. */
    on('date', [rule({ flex: 'none' })]),
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
