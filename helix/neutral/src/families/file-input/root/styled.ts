import field from '../../../fragments/field.js'
import fieldFrame from '../../../fragments/field-frame.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import { fn, list, measured, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import fileInput from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const
const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const

/**
 * File Input's styled tier, which writes
 * `helix/styled/src/file-input/root/file-input-root.generated.css`.
 *
 * **The field is a box with room in it**, a dashed edge that marks it as a
 * place to drop files before anything is dragged. The stack, the hover edge,
 * the focus ring, and the stripped control are `field-frame`'s. On the web
 * the control is laid over the field at zero opacity, so a press anywhere on
 * the box lands on it and opens the picker.
 *
 * **The ring waits for the field's own control.** The list of chosen files
 * sits under the field and each remove button rings itself, so the frame's
 * ring, drawn while focus is anywhere in the host, is taken off the field
 * while its control has no focus: one ring for one focus.
 *
 * **Each chosen file is a card** that joins the stack from its top edge,
 * with its name, its size and kind as small tags, and a remove button.
 */
export default styles(
  fileInput,
  {
    prefix: 'file-input',
    hooks: {
      backgroundColor: token('color-well'),
      borderColor: token('color-border'),
      dropBackgroundColor: token('color-primary-subtle'),
      dropBorderColor: token('color-primary'),
      fileBackgroundColor: token('color-surface'),
      fileBorderColor: token('color-border'),
      filePaddingBlock: token('space-xs'),
      filePaddingInline: token('space-sm'),
      fileRadius: token('radii-sm'),
      padding: token('space-md'),
      progressColor: token('color-primary'),
      progressTrackColor: token('color-border'),
      radius: token('radii-sm'),
      removeColor: token('color-foreground-muted'),
      removeColorHover: token('color-danger'),
      statusColor: token('color-foreground-muted'),
      statusColorError: token('color-danger'),
    },
    stylesheet: 'file-input/root/file-input-root.generated.css',
  },
  ({ hook, include, on, rule }) => [
    include(field),
    include(fieldStacked),
    on('field', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.backgroundColor,
        border: [token('border-thin'), 'dashed', hook.borderColor],
        borderRadius: hook.radius,
        display: 'flex',
        gap: token('space-xs'),
        justifyContent: 'center',
        padding: hook.padding,
        position: 'relative',
        transition: list(['background-color', ...ease], ['border-color', ...ease]),
      }),
      /* Files are dragged over it. The frame's hover edge and ring are
         drawn over this one. */
      rule(
        { dropping: true },
        {
          backgroundColor: hook.dropBackgroundColor,
          borderColor: hook.dropBorderColor,
          borderStyle: 'solid',
        },
      ),
    ]),
    include(fieldFrame),
    on('field', [
      rule({ focusWithin: false, within: { host: ['focusWithin'] } }, { outline: 'none' }),
      /* Wrong, and the frame says so: its edge, and its ring while focused. */
      rule(
        { invalid: true },
        { borderColor: token('color-danger'), outlineColor: token('color-danger') },
      ),
      rule(
        { formDisabled: true },
        { borderStyle: 'solid', color: token('color-foreground-subtle') },
      ),
    ]),
    /* The control is kept and laid over the field at zero opacity, so a
       press anywhere on the box lands on it. */
    on('control', [web([rule({ cursor: 'pointer', inset: 0, opacity: 0, position: 'absolute' })])]),
    /* What is passed in stacks: a mark above, its words below. */
    on('trigger', [
      rule({
        web: { pointerEvents: 'none' },
        alignItems: 'center',
        color: token('color-foreground'),
        display: 'flex',
        flexDirection: 'column',
        fontFamily: token('font-sans'),
        fontSize: token('text-md'),
        fontWeight: token('weight-medium'),
        gap: token('space-2xs'),
        textAlign: 'center',
      }),
    ]),
    on(['control', 'trigger'], [web([rule({ formDisabled: true }, { cursor: 'not-allowed' })])]),
    on('list', [
      rule({
        web: { listStyle: 'none' },
        display: 'flex',
        flexDirection: 'column',
        gap: token('space-2xs'),
        marginBlock: [token('space-2xs'), 0],
        padding: token('space-none'),
      }),
    ]),
    /* A card that joins the stack from its top edge, as the stack grows
       downward. */
    on('file', [
      rule({
        alignItems: 'center',
        backgroundColor: hook.fileBackgroundColor,
        border: [token('border-thin'), 'solid', hook.fileBorderColor],
        borderRadius: hook.fileRadius,
        display: 'flex',
        gap: token('space-sm'),
        opacity: 1,
        paddingBlock: hook.filePaddingBlock,
        paddingInline: hook.filePaddingInline,
        scale: '1 1',
        transformOrigin: 'top',
        transition: list(
          ['opacity', ...ease],
          ['scale', token('duration-fast'), token('easing-emphasized')],
        ),
      }),
      rule({ startingStyle: true }, { opacity: 0, scale: '1 0.9' }),
    ]),
    /* The name and its tags share a line where they fit. */
    on('detail', [
      rule({
        alignItems: 'center',
        columnGap: token('space-sm'),
        display: 'flex',
        flex: '1 1 auto',
        flexWrap: 'wrap',
        minInlineSize: 0,
        rowGap: token('space-2xs'),
      }),
    ]),
    on('name', [
      rule({
        color: token('color-foreground'),
        flex: '1 1 auto',
        fontFamily: token('font-sans'),
        fontSize: token('text-sm'),
        minInlineSize: fn('min', '100%', '16ch'),
        overflowWrap: 'anywhere',
      }),
    ]),
    on('meta', [
      rule({
        '--helix-size-tag': token('size-tag-sm'),
        display: 'flex',
        flexWrap: 'wrap',
        gap: token('space-2xs'),
      }),
    ]),
    /* Tabular, so a column of sizes lines its digits up. */
    on('size', [rule({ fontVariantNumeric: 'tabular-nums' })]),
    /* How the upload is going: a hairline bar and its words, in the danger
       color once it failed. */
    on('status', [
      rule({
        alignItems: 'center',
        color: hook.statusColor,
        display: 'flex',
        flex: '1 1 100%',
        fontFamily: token('font-sans'),
        fontSize: token('text-xs'),
        gap: token('space-xs'),
      }),
      rule({ within: 'file-error' }, { color: hook.statusColorError }),
    ]),
    on('progress', [
      rule({
        web: { appearance: 'none' },
        backgroundColor: hook.progressTrackColor,
        blockSize: token('border-thick'),
        border: 0,
        borderRadius: token('radii-full'),
        flex: '1 1 auto',
        overflow: 'hidden',
      }),
    ]),
    /* A phone draws the filled share as a part, where the web's `<progress>`
       draws its own. */
    on('progress-fill', [
      native([
        rule({
          backgroundColor: hook.progressColor,
          blockSize: '100%',
          inlineSize: measured('file-input-progress-fill'),
        }),
      ]),
    ]),
    /* Written out: the bar a browser draws inside a `<progress>`, a
       pseudo-element of its own in each engine, which the vocabulary has no
       name for. */
    on({ part: 'progress', selector: '[part="progress"]::-webkit-progress-bar' }, [
      web([rule({ backgroundColor: 'transparent' })]),
    ]),
    /* Written out: the filled share of that bar, as WebKit and Chromium draw it. */
    on({ part: 'progress', selector: '[part="progress"]::-webkit-progress-value' }, [
      web([rule({ backgroundColor: hook.progressColor })]),
    ]),
    /* Written out: the filled share of that bar, as Firefox draws it. */
    on({ part: 'progress', selector: '[part="progress"]::-moz-progress-bar' }, [
      web([rule({ backgroundColor: hook.progressColor })]),
    ]),
    /* A bin from the icon set, muted until the pointer is on it. */
    on('remove', [
      rule({
        web: { all: 'unset', cursor: 'pointer' },
        '--icon-size': token('size-icon-tight'),
        alignItems: 'center',
        borderRadius: token('radii-sm'),
        boxSizing: 'border-box',
        color: hook.removeColor,
        display: 'flex',
        flex: 'none',
        justifyContent: 'center',
        minBlockSize: token('size-icon-loose'),
        minInlineSize: token('size-icon-loose'),
        transition: ['color', ...ease],
      }),
      rule({ hover: true }, { color: hook.removeColorHover }),
      rule({ focusVisible: true }, { outline: ring, outlineOffset: token('size-focus-offset') }),
    ]),
    /* A phone draws the bin the web draws in `remove-icon`, at the icon size. */
    on('remove-mark', [
      native([rule({ blockSize: token('size-icon-tight'), inlineSize: token('size-icon-tight') })]),
    ]),
    on(['field', 'remove'], [rule({ reducedMotion: true }, { transition: 'none' })]),
    /* The card still arrives, at its full size and with no motion. */
    on('file', [rule({ reducedMotion: true }, { opacity: 1, scale: '1 1', transition: 'none' })]),
    /* A mark passed into the trigger is muted, and larger than a line of text. */
    on({ region: 'trigger', slotted: 'helix-icon' }, [
      rule({ '--icon-size': token('size-icon-loose'), color: token('color-foreground-muted') }),
    ]),
    /* A control prints the value it holds. */
    include(printExact),
  ],
)
