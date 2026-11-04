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

/** The calendar the trigger is cut from, a stencil so the field costs no icon of its own. */
const CALENDAR =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round'%3E%3Crect x='3' y='5' width='18' height='16' rx='2'/%3E%3Cpath d='M3 10h18M8 3v4M16 3v4'/%3E%3C/svg%3E\")"

/**
 * Date Input's styled tier.
 *
 * **The frame is the field**, so the trigger sits inside the same box as the text and
 * one ring surrounds the control. **The trigger is a mark in the field**, a stencil on
 * the web and the calendar icon on a phone, with no box of its own. **With several
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
      borderColor: token('color-border'),
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
        paddingBlock: token('space-2xs'),
        paddingInline: token('space-field'),
        transition: web(list(['background-color', ...ease], ['border-color', ...ease])),
      }),
      native([rule({ flexDirection: 'row' })]),
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
    on({ region: ['start', 'end'], slotted: '*' }, [
      rule({ color: token('color-foreground-muted'), flex: 'none' }),
    ]),
    /* A mark in the field, with no box of its own: the press reaches the target. */
    on('trigger', [
      rule({
        all: web('unset'),
        position: 'relative',
        blockSize: token('size-target'),
        boxSizing: 'border-box',
        color: token('color-foreground-muted'),
        cursor: web('pointer'),
        display: 'grid',
        flex: 'none',
        inlineSize: token('size-target'),
        margin: quotient(difference(token('size-icon-sm'), token('size-target')), 2),
        placeItems: 'center',
        web: {
          backgroundColor: 'currentColor',
          maskImage: CALENDAR,
          maskPosition: 'center',
          maskRepeat: 'no-repeat',
          maskSize: token('size-icon-sm'),
        },
        transition: web(['color', ...ease]),
      }),
      native([rule({ alignItems: 'center', display: 'flex', justifyContent: 'center' })]),
    ]),
    on({ part: 'trigger-icon', selector: '[part="trigger"] svg' }, [
      web([rule({ blockSize: token('size-icon-sm'), inlineSize: token('size-icon-sm') })]),
    ]),
    on('trigger-icon', [
      native([
        rule({
          '--icon-size': token('size-icon-sm'),
          blockSize: token('size-icon-sm'),
          inlineSize: token('size-icon-sm'),
        }),
      ]),
    ]),
    on('trigger', [
      rule({ hover: true }, { color: token('color-foreground') }),
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
        padding: token('space-sm'),
        position: web('absolute'),
      }),
      /* A phone's reader may set text so large the calendar outgrows the window: the
         panel keeps inside it and scrolls, its heading in view. */
      native([
        rule({
          maxBlockSize: measured('floating-available-block-size', 'none'),
          maxInlineSize: difference('100vw', product(token('space-md'), 2)),
          overflowY: 'auto',
        }),
      ]),
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
