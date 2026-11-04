import printExact from '../../../fragments/print-exact.js'
import {
  difference,
  fn,
  measured,
  mix,
  native,
  product,
  quotient,
  scheme,
  token,
  web,
} from '../../../style.js'
import { styles } from '../../../table.js'
import root from './headless.js'

const ease = [token('duration-fast'), token('easing-standard')] as const

/** The row of a wheel, stated once and read by its height, its padding, and the wheel's. */
const row = measured('_time-row', token('size-control'))

/**
 * Time Picker's styled tier.
 *
 * **The list is Listbox without its frame**, seven rows tall so it rests with its
 * chosen time in the middle; a range's ends are filled and the times between them
 * washed. **The wheels are columns of the same list**, five rows tall, each row's
 * mark centered as a calendar day is, the answer the calendar's solid mark.
 *
 * Rules on the rows the list draws are the web's own `::part()` selectors; a phone
 * draws its rows from data, in Listbox's own look.
 */
export default styles(
  root,
  {
    prefix: 'time-picker',
    hooks: {
      columnsGap: token('space-none'),
      feedbackColor: token('color-danger'),
      hoverBackgroundColor: token('color-surface-sunken'),
      invalidColor: token('color-danger'),
      listBlockSize: product(token('size-control-tight'), 7),
      markRadius: token('radii-sm'),
      nowColor: token('color-primary'),
      rangeColor: scheme(
        mix(token('color-foreground'), 10, 'transparent'),
        token('color-selected'),
      ),
      rowSize: token('size-control'),
      selectedBackgroundColor: token('color-surface-inverse'),
      selectedForegroundColor: token('color-foreground-inverse'),
      wheelBlockSize: product(measured('_time-row', token('size-control')), 5),
      wheelMask: fn(
        'linear-gradient',
        'to bottom',
        'transparent',
        'black 25%',
        'black 75%',
        'transparent',
      ),
    },
    own: { timeRow: null },
    stylesheet: 'time-picker/root/time-picker-root.generated.css',
  },
  ({ hook, include, on, rule }) => {
    const ring = [token('size-focus-ring'), 'solid', hook.invalidColor] as const
    const frameless = {
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: token('radii-none'),
    } as const
    const words = {
      fontFamily: token('font-sans'),
      fontSize: token('text-sm'),
      margin: [token('space-sm'), token('space-none'), token('space-none')],
    } as const
    return [
      on('host', [rule({ display: 'block' })]),
      on('label', [
        rule({
          color: token('color-foreground'),
          display: 'block',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          lineHeight: token('leading-tight'),
          paddingBlockEnd: token('space-2xs'),
        }),
      ]),
      on('list', [rule({ '--listbox-max-block-size': hook.listBlockSize, display: 'block' })]),
      on({ part: 'list', selector: '[part="list"]::part(items)' }, [
        web([rule({ ...frameless, paddingBlock: token('space-none') })]),
      ]),
      on(
        {
          part: 'option',
          selector: ':host([mode="range"]) [part~="option"]:state(selected)::part(item)',
        },
        [
          web([
            rule({
              backgroundColor: token('color-surface-inverse'),
              color: token('color-foreground-inverse'),
            }),
          ]),
        ],
      ),
      on({ part: 'option', selector: '[part~="option"][data-between]::part(item)' }, [
        web([rule({ backgroundColor: hook.rangeColor })]),
      ]),
      on({ part: 'option', selector: '[part~="option"][data-between]::part(item)::after' }, [
        web([
          rule({
            content: '""',
            backgroundColor: 'currentColor',
            blockSize: token('size-icon-tight'),
            borderRadius: token('radii-full'),
            flex: '0 0 auto',
            inlineSize: token('size-icon-tight'),
            marginInlineStart: 'auto',
            opacity: 0.4,
            scale: 0.3,
          }),
        ]),
      ]),
      /* A phone draws the list's own rows, its frame off as on the web. */
      on(['list-items', 'column-items'], [native([rule(frameless)])]),
      on('columns', [rule({ display: 'flex', gap: hook.columnsGap })]),
      on('columns', [native([rule({ flexDirection: 'row' })])]),
      on('column', [
        rule({
          own: { timeRow: hook.rowSize },
          '--listbox-max-block-size': hook.wheelBlockSize,
          flex: '1 1 auto',
          minInlineSize: web('max-content'),
        }),
      ]),
      on({ part: 'column', selector: '[part="column"]::part(items)' }, [
        web([
          rule({
            ...frameless,
            maskImage: hook.wheelMask,
            paddingBlock: quotient(difference(measured('listbox-max-block-size'), row), 2),
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none',
          }),
        ]),
      ]),
      on({ part: 'option', selector: '[part="column"] [part~="option"]' }, [
        web([rule({ scrollSnapAlign: 'center' })]),
      ]),
      on({ part: 'option', selector: '[part="column"] [part~="option"]::part(item)' }, [
        web([
          rule({
            backgroundColor: 'transparent',
            justifyContent: 'center',
            minBlockSize: row,
            minInlineSize: row,
            paddingBlock: token('space-none'),
            paddingInline: token('space-sm'),
          }),
        ]),
      ]),
      on({ part: 'option', selector: '[part="column"] [part~="option"]::part(label)' }, [
        web([
          rule({
            alignItems: 'center',
            blockSize: row,
            borderRadius: hook.markRadius,
            display: 'inline-flex',
            justifyContent: 'center',
            minInlineSize: row,
            paddingInline: token('space-2xs'),
            textAlign: 'center',
            transition: ['background-color', ...ease],
          }),
        ]),
      ]),
      on(
        {
          part: 'option',
          selector:
            '[part="column"] [part~="option"]:not([disabled]):hover::part(label), [part="column"] [part~="option"]:state(active)::part(label)',
        },
        [web([rule({ backgroundColor: hook.hoverBackgroundColor })])],
      ),
      on(
        {
          part: 'option',
          selector: '[part="column"] [part~="option"]:state(selected)::part(label)',
        },
        [
          web([
            rule({
              backgroundColor: hook.selectedBackgroundColor,
              color: hook.selectedForegroundColor,
            }),
          ]),
        ],
      ),
      on({ part: 'option', selector: '[part="column"] [part~="option"]::part(item)::after' }, [
        web([rule({ content: 'none' })]),
      ]),
      on(
        {
          part: 'option',
          selector:
            ':host([invalid]) [part~="option"]:state(selected)::part(item), :host([invalid]) [part="column"] [part~="option"]:state(selected)::part(label), :host(:state(invalid)) [part~="option"]:state(selected)::part(item), :host(:state(invalid)) [part="column"] [part~="option"]:state(selected)::part(label)',
        },
        [web([rule({ outline: ring, outlineOffset: token('size-focus-offset') })])],
      ),
      on(
        ['list', 'columns'],
        [
          rule(
            { invalid: true, part: { 'data-unset': true } },
            {
              borderRadius: token('radii-sm'),
              outline: ring,
              outlineOffset: token('size-focus-offset'),
            },
          ),
        ],
      ),
      on('hint', [rule({ ...words, color: token('color-foreground-muted') })]),
      on('feedback', [rule({ ...words, color: hook.feedbackColor })]),
      on('now', [
        rule({
          all: web('unset'),
          alignItems: 'center',
          blockSize: token('size-control-tight'),
          borderRadius: token('radii-sm'),
          boxSizing: 'border-box',
          color: hook.nowColor,
          cursor: web('pointer'),
          display: 'inline-flex',
          fontFamily: token('font-sans'),
          fontSize: token('text-sm'),
          fontWeight: token('weight-medium'),
          marginBlockStart: token('space-xs'),
          paddingInline: token('space-xs'),
          transition: web(['background-color', ...ease]),
        }),
        rule({ disabled: false, hover: true }, { backgroundColor: token('color-surface-raised') }),
        rule(
          { focusVisible: true },
          {
            outline: [token('size-focus-ring'), 'solid', token('color-focus-ring')],
            outlineOffset: token('size-focus-offset'),
          },
        ),
        rule(
          { disabled: true },
          { color: token('color-foreground-subtle'), cursor: web('not-allowed') },
        ),
        native([rule({ alignSelf: 'flex-start', flexDirection: 'row' })]),
      ]),
      include(printExact),
    ]
  },
)
