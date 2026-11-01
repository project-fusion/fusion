import collectionError from '../../../fragments/collection-error.js'
import collectionState from '../../../fragments/collection-state.js'
import field from '../../../fragments/field.js'
import fieldStacked from '../../../fragments/field-stacked.js'
import printExact from '../../../fragments/print-exact.js'
import { first, fn, native, token, web } from '../../../style.js'
import { styles } from '../../../table.js'
import listbox from './headless.js'

const ring = [token('size-focus-ring'), 'solid', token('color-focus-ring')] as const

/**
 * A list of options, in its styled tier.
 *
 * **The frame is the list and not the host**, so a filter that empties it leaves a
 * box with a message in it. **Square rows**, which run the full width of the box,
 * through the hook an option reads.
 *
 * **`surface`, and the rows are what decides it**: on a sunken fill a hovered row
 * came out lighter than the list it sits in.
 *
 * **Under `layout="grid"`, as many columns as fit**, each at least the hook's
 * width. A phone reads the same track list from the same hook, and a list of
 * `items` stays a stack.
 *
 * **Options showing stay and dim while a new set arrives**, since removing them
 * would move everything under the reader for as long as the request takes.
 */
export default styles(
  listbox,
  {
    prefix: 'listbox',
    hooks: {
      backgroundColor: token('color-surface'),
      border: [token('border-thin'), 'solid', token('color-border')],
      columnMinInlineSize: '8rem',
      draggingOpacity: null,
      dropIndicatorColor: null,
      dropIndicatorSize: null,
      errorColor: token('color-danger'),
      maxBlockSize: '14rem',
    },
    own: {
      collectionInsetBlock: null,
      collectionInsetInline: null,
      fieldDisabledOpacity: null,
    },
    stylesheet: 'listbox/root/listbox-root.generated.css',
  },
  ({ hook, include, on, own, rule }) => {
    const columns = fn(
      'repeat',
      'auto-fill',
      fn('minmax', fn('min', hook.columnMinInlineSize, '100%'), '1fr'),
    )
    return [
      include(field),
      include(fieldStacked),
      include(collectionState),
      include(collectionError),
      on('host', [
        rule({ display: 'flex', flexDirection: 'column', gap: token('space-2xs') }),
        rule(
          { formDisabled: true },
          { opacity: token('opacity-disabled'), own: { fieldDisabledOpacity: 1 } },
        ),
      ]),
      on('items', [
        rule({
          '--option-radius': token('radii-none'),
          backgroundColor: hook.backgroundColor,
          border: hook.border,
          borderRadius: token('radii-sm'),
          display: 'flex',
          flexDirection: 'column',
          gap: token('space-none'),
          maxBlockSize: hook.maxBlockSize,
          overflowY: 'auto',
          paddingBlock: token('space-2xs'),
          paddingInline: token('space-none'),
        }),
        web([rule({ layout: 'grid' }, { display: 'grid', gridTemplateColumns: columns })]),
        rule(
          { focusVisible: true },
          { borderColor: token('color-primary'), outline: ring, outlineOffset: 0 },
        ),
        rule(
          { invalid: true },
          { borderColor: token('color-danger'), outlineColor: token('color-danger') },
        ),
        rule({ formDisabled: true, platform: 'web' }, { cursor: 'not-allowed' }),
        rule({ loading: true }, { opacity: token('opacity-busy') }),
        /* A phone's move draws on the option, and the web's reorder entry adopts a sheet. */
        native([
          rule({
            '--option-dragging-opacity': first(hook.draggingOpacity, 0.5),
            '--option-drop-color': first(hook.dropIndicatorColor, token('color-primary')),
            '--option-drop-size': first(hook.dropIndicatorSize, token('border-thick')),
          }),
        ]),
        /* A list of `items` scrolls in the list that windows it. */
        native([rule({ part: { 'data-windowed': true } }, { overflowY: 'visible' })]),
      ]),
      /* A phone's grid lays out one region, so the options stand in a part of their own. */
      on('options', [
        native([rule({ layout: 'grid' }, { display: 'grid', gridTemplateColumns: columns })]),
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
      on('error', [
        rule({
          color: hook.errorColor,
          padding: token('space-xs'),
        }),
      ]),
      on('filter-icon', [
        rule({
          alignItems: 'center',
          color: token('color-foreground-subtle'),
          display: 'inline-flex',
          flex: '0 0 auto',
        }),
      ]),
      on('filter-mark', [
        rule({
          '--icon-size': token('size-icon-tight'),
          blockSize: token('size-icon-tight'),
          inlineSize: token('size-icon-tight'),
        }),
      ]),
      on({ region: 'filter-icon', slotted: '*' }, [
        rule({
          '--icon-size': token('size-icon-tight'),
          blockSize: token('size-icon-tight'),
          inlineSize: token('size-icon-tight'),
        }),
      ]),
      on('search', [
        rule({
          alignItems: 'center',
          borderBlockEnd: [token('border-thin'), 'solid', token('color-border')],
          display: 'flex',
          gap: token('space-2xs'),
          padding: token('space-2xs'),
          paddingInlineStart: token('space-xs'),
        }),
      ]),
      on('search-field', [
        rule({
          web: { appearance: 'none' },
          backgroundColor: 'transparent',
          blockSize: token('size-control-tight'),
          border: 'none',
          boxSizing: 'border-box',
          color: token('color-foreground'),
          flex: '1 1 auto',
          fontFamily: token('font-sans'),
          fontSize: fn('max', token('text-field-min'), token('text-sm')),
          fontWeight: token('weight-medium'),
          inlineSize: '100%',
          minInlineSize: 0,
          paddingInline: token('space-xs'),
        }),
        rule({ focusVisible: true, platform: 'web' }, { outline: 'none' }),
      ]),
      on({ placeholder: 'search-field' }, [
        rule({ color: token('color-foreground-muted'), fontWeight: token('weight-regular') }),
      ]),
      /* The dictation button at the end of the field, a muted mark a pointer darkens. */
      on('voice', [
        web([
          rule({
            all: 'unset',
            '--icon-size': token('size-icon-tight'),
            alignItems: 'center',
            borderRadius: token('radii-sm'),
            boxSizing: 'border-box',
            color: token('color-foreground-muted'),
            cursor: 'pointer',
            display: 'flex',
            flex: '0 0 auto',
            justifyContent: 'center',
            minBlockSize: token('size-icon-loose'),
            minInlineSize: token('size-icon-loose'),
            transition: ['color', token('duration-fast'), token('easing-standard')],
          }),
          rule({ hover: true }, { color: token('color-foreground') }),
          rule(
            { focusVisible: true },
            { outline: ring, outlineOffset: token('size-focus-offset') },
          ),
        ]),
      ]),
      include(printExact),
    ]
  },
)
