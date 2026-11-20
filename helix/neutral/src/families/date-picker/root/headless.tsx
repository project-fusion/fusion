import {
  bare,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  string,
  Text,
  View,
  web,
} from '../../../render.js'

/**
 * Date Picker's headless tier: a month calendar for choosing one date, a range, or
 * several.
 *
 * **Core says what each cell is.** The six weeks a month draws, the tab stop, a
 * range's ends and the run a waiting range is drawn to, what a key and a press do
 * to the dates, and what is wrong with them are `@fusion.dev/helix-core/calendar`,
 * which the web element reads too. A month the reader pages to asks
 * `before-navigate` first, and a choice asks `before-change`.
 *
 * **One set of controls across the run**: back on the first month, forward on the
 * last. A day of a neighboring month squares the grid and takes no press. With
 * `max-view`, the heading steps back to the months of a year, and from there to a
 * page of years.
 *
 * **The web's**: a form's `name`, and `day-content`, which returns a Lit template.
 *
 * **Held to `helix-date-picker`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('date-picker', {
  props: {
    badInputMessage:
      '{mode, select, single {Enter a date such as {example}.} other {Enter dates such as {example}, separated by commas.}}',
    calendar: string(),
    dayContent: web(property(object())),
    defaultMonth: '',
    defaultValue: '',
    disabled: false,
    disableDates: '',
    disableDays: '',
    fallbackLabel: 'Date Picker',
    feedback: '',
    firstDayOfWeek: number(),
    invalid: false,
    isDateUnavailable: property(object()),
    label: '',
    locale: '',
    max: '',
    maxView: oneOf(['month', 'year']),
    min: '',
    mode: oneOf(['multiple', 'range']),
    month: string(),
    months: 1,
    monthViewLabel: '{heading}. Choose a month',
    /* A form's, which a phone has none of. */
    name: web(''),
    nextLabel: 'Next month',
    nextYearLabel: 'Next year',
    nextYearsLabel: 'Later years',
    previousLabel: 'Previous month',
    previousYearLabel: 'Previous year',
    previousYearsLabel: 'Earlier years',
    rangeOrderMessage: 'Choose an end on or after {start}.',
    rangeOverflowMessage: 'Choose a date on or before {max}.',
    rangeUnderflowMessage: 'Choose a date on or after {min}.',
    readonly: false,
    required: false,
    selectionLabel:
      '{kind, select, date {Selected date: {start}} start {Range starts {start}. Choose the day it ends.} range {Selected range: {start} to {end}} other {{count, plural, one {# date selected} other {# dates selected}}}}',
    step: 1,
    stepMismatchMessage: 'Choose one of the dates the calendar offers.',
    timeZone: '',
    unavailableMessage: 'Choose a date that is available.',
    value: string(),
    valueMissingMessage: 'Choose a date.',
    view: oneOf(['day', 'month', 'year'], 'day'),
    yearViewLabel: '{heading}. Choose a year',
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeNavigate: cancelable(['value']),
    change: bare(),
    input: bare(),
    navigate: ['value'],
  },
  states: ['blank', 'invalid', 'monthView', 'rangePending', 'settled', 'yearView'],
  host: { role: 'group' },
  datePicker: {
    atEnd: 'atEnd',
    atStart: 'atStart',
    columns: 'columns',
    defaultProp: 'defaultValue',
    heading: 'heading',
    headingLabel: 'headingLabel',
    months: 'monthRows',
    nextWords: 'nextWords',
    onBeforeChange: 'beforeChange',
    onBeforeNavigate: 'beforeNavigate',
    onChange: 'change',
    onInput: 'input',
    onNavigate: 'navigate',
    periodRows: 'periodRows',
    periods: 'periods',
    previousWords: 'previousWords',
    prop: 'value',
    selection: 'selection',
    steps: 'steps',
    unset: 'unset',
  },
  render: ({ datePicker, entry, props }) => (
    <>
      <Slot name="header" />
      {datePicker.periods ? (
        <View
          part="months"
          style={{ '--date-picker-column-count': '1' }}
        >
          <View part="month">
            <View part="header">
              <Pressable
                disabled={datePicker.atStart}
                label={datePicker.previousWords}
                part="previous"
                role="button"
              >
                <Slot name="previous-icon">
                  <View
                    ariaHidden
                    icon="caret-left"
                    part="previous-mark"
                  />
                </Slot>
              </Pressable>
              <View part="heading">
                {datePicker.steps ? (
                  <Pressable
                    disabled={props.disabled}
                    label={datePicker.headingLabel}
                    part="heading-button"
                    role="button"
                  >
                    <Text part="heading-words">{datePicker.heading}</Text>
                  </Pressable>
                ) : (
                  <Text part="heading-words">{datePicker.heading}</Text>
                )}
              </View>
              <Pressable
                disabled={datePicker.atEnd}
                label={datePicker.nextWords}
                part="next"
                role="button"
              >
                <Slot name="next-icon">
                  <View
                    ariaHidden
                    icon="caret-right"
                    part="next-mark"
                  />
                </Slot>
              </Pressable>
            </View>
            <View
              label={datePicker.heading}
              part="periods"
              role="grid"
            >
              <Repeat
                each={datePicker.periodRows}
                key="key"
                part="period-rows"
              >
                <View
                  part="period-row"
                  role="row"
                >
                  <Repeat
                    each={entry.cells}
                    key="key"
                    part="period-cells"
                  >
                    <Pressable
                      also={{
                        'period-current': entry.current,
                        'period-disabled': entry.out,
                        'period-selected': entry.chosen,
                      }}
                      current={entry.currentDate}
                      data-current={entry.current}
                      data-disabled={entry.out}
                      data-selected={entry.chosen}
                      label={entry.label}
                      part="period"
                      role="gridcell"
                      selected={entry.chosen}
                    >
                      <Text part="period-words">{entry.words}</Text>
                    </Pressable>
                  </Repeat>
                </View>
              </Repeat>
            </View>
          </View>
        </View>
      ) : (
        <View
          part="months"
          style={{ '--date-picker-column-count': datePicker.columns }}
        >
          <Repeat
            each={datePicker.months}
            key="key"
            part="month-list"
          >
            <View part="month">
              <View part="header">
                <Pressable
                  data-hidden={entry.later}
                  disabled={entry.backInert}
                  label={props.previousLabel}
                  part="previous"
                  role="button"
                >
                  <View
                    ariaHidden
                    icon="caret-left"
                    part="previous-mark"
                  />
                </Pressable>
                <View
                  data-lone-end={entry.earlier}
                  data-lone-start={entry.later}
                  part="heading"
                >
                  <Pressable
                    data-hidden={entry.plain}
                    disabled={props.disabled}
                    label={entry.headingLabel}
                    part="heading-button"
                    role="button"
                  >
                    <Text part="heading-words">{entry.heading}</Text>
                  </Pressable>
                  <View
                    data-hidden={entry.stepping}
                    part="heading-text"
                    platform="native"
                  >
                    <Text part="heading-words">{entry.heading}</Text>
                  </View>
                </View>
                <Pressable
                  data-hidden={entry.earlier}
                  disabled={entry.forwardInert}
                  label={props.nextLabel}
                  part="next"
                  role="button"
                >
                  <View
                    ariaHidden
                    icon="caret-right"
                    part="next-mark"
                  />
                </Pressable>
              </View>
              <View
                data-unset={datePicker.unset}
                label={entry.heading}
                part="grid"
                role="grid"
              >
                <View
                  part="week"
                  role="row"
                >
                  <Repeat
                    each={entry.weekdays}
                    key="key"
                    part="weekdays"
                  >
                    <View
                      label={entry.name}
                      part="weekday"
                      role="columnheader"
                    >
                      <Text part="weekday-words">{entry.short}</Text>
                    </View>
                  </Repeat>
                </View>
                <Repeat
                  each={entry.weeks}
                  key="key"
                  part="weeks"
                >
                  <View
                    part="week"
                    role="row"
                  >
                    <Repeat
                      each={entry.days}
                      key="key"
                      part="days"
                    >
                      <Pressable
                        also={{
                          'cell-range-end': entry.end,
                          'cell-range-middle': entry.middle,
                          'cell-range-start': entry.start,
                        }}
                        current={entry.currentDate}
                        data-outside={entry.outside}
                        data-pressed={entry.pressed}
                        data-range-end={entry.end}
                        data-range-middle={entry.middle}
                        data-range-preview={entry.preview}
                        data-range-start={entry.start}
                        data-selected={entry.selected}
                        data-today={entry.today}
                        disabled={entry.inert}
                        label={entry.label}
                        part="cell"
                        role="gridcell"
                        selected={entry.selected}
                      >
                        <View
                          also={{
                            'day-disabled': entry.barred,
                            'day-outside': entry.outside,
                            'day-selected': entry.solid,
                            'day-today': entry.today,
                            'day-weekend': entry.weekend,
                          }}
                          data-ring={entry.ring}
                          data-selected={entry.selected}
                          data-solid={entry.solid}
                          part="day"
                        >
                          <Text part="day-words">{entry.number}</Text>
                        </View>
                      </Pressable>
                    </Repeat>
                  </View>
                </Repeat>
              </View>
            </View>
          </Repeat>
        </View>
      )}
      <View
        ariaHidden
        part="selection"
        platform="web"
      >
        <Text part="selection-words">{datePicker.selection}</Text>
      </View>
      <Slot name="footer" />
      {props.feedback && (
        <View
          part="feedback"
          role="alert"
        >
          <Text part="feedback-text">{props.feedback}</Text>
        </View>
      )}
    </>
  ),
})
