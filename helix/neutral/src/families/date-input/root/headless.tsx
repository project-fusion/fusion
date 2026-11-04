import {
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  number,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  string,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Date Input's headless tier: a date, typed or picked from the calendar it opens.
 *
 * **The field shows the date written** while nobody is in it, and the value itself
 * while somebody is, so what is on screen can always be read back. A press on the
 * text or the trigger opens the calendar, which is Date Picker; a pick there is an
 * edit of the field, asked first with `before-change`.
 *
 * **`range` holds two dates and `multiple` any number**, each of several drawn as a
 * tag. **`segmented` draws a row of segments** in the locale's order, a day, a month,
 * and a year, each set with digits; a range is two rows. Core's picker text and date
 * segments say what each holds, for the web element too.
 *
 * **The web's**: a form's `name`, `autocomplete`'s hidden date input, `day-content`,
 * which returns a Lit template, and the arrows that step between segments and tags
 * on a hardware keyboard.
 *
 * **Held to `helix-date-input`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element has.
 */
export default headless('date-input', {
  props: {
    ariaLabel: string(),
    autocomplete: web(''),
    badInputMessage: string(),
    calendar: string(),
    calendarLabel: 'Date Picker',
    clearable: false,
    clearLabel: 'Clear',
    collapseLabel: 'Show fewer',
    dateStyle: oneOf(['full', 'iso', 'long', 'medium', 'short'], 'long'),
    dayContent: web(property(object())),
    defaultOpen: false,
    defaultValue: '',
    disabled: false,
    disableDates: '',
    disableDays: '',
    emptyMessage: '{kind, select, date {Enter a date.} other {Enter a time.}}',
    emptySegmentLabel: 'Empty',
    expandable: false,
    expandLabel: 'Show all',
    feedback: '',
    firstDayOfWeek: number(),
    hint: '',
    incompleteMessage: '{kind, select, date {Enter a whole date.} other {Enter a whole time.}}',
    isDateUnavailable: property(object()),
    label: '',
    locale: '',
    max: '',
    maxTags: 0,
    maxView: oneOf(['month', 'year']),
    min: '',
    mode: oneOf(['multiple', 'range']),
    months: 1,
    monthViewLabel: '{heading}. Choose a month',
    /* A form's, which a phone has none of. */
    name: web(''),
    nextLabel: 'Next month',
    nextYearLabel: 'Next year',
    nextYearsLabel: 'Later years',
    open: boolean(),
    placeholder: 'YYYY-MM-DD',
    previousLabel: 'Previous month',
    previousYearLabel: 'Previous year',
    previousYearsLabel: 'Earlier years',
    rangeEndLabel: 'End',
    rangeLengthMessage: 'A range is two dates.',
    rangeOrderMessage: 'Choose an end on or after {start}.',
    rangeOverflowMessage: 'Choose a date on or before {max}.',
    rangeStartLabel: 'Start',
    rangeUnderflowMessage: 'Choose a date on or after {min}.',
    readonly: false,
    removeLabel: 'Remove {name}',
    required: false,
    restText: '+{count}',
    segmented: false,
    selectionLabel:
      '{kind, select, date {Selected date: {start}} start {Range starts {start}. Choose the day it ends.} range {Selected range: {start} to {end}} other {{count, plural, one {# date selected} other {# dates selected}}}}',
    step: 1,
    stepMismatchMessage: 'Choose one of the dates the calendar offers.',
    timeZone: '',
    triggerLabel: 'Choose a date',
    unavailableMessage: 'Choose a date that is available.',
    unreadableMessage:
      '{mode, select, single {Enter a date such as {example}.} other {Enter dates such as {example}, separated by commas.}}',
    value: string(),
    valueMissingMessage: string(),
    yearViewLabel: '{heading}. Choose a year',
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeClose: cancelable(['open']),
    beforeOpen: cancelable(['open']),
    change: bare(),
    clear: [],
    input: bare(),
    toggle: bare(['newState', 'oldState']),
  },
  states: ['alignedStart', 'blank', 'invalid', 'open', 'placedBottom', 'placedTop', 'settled'],
  pickerField: {
    clearShown: 'clearShown',
    defaultProp: 'defaultValue',
    fieldPlaceholder: 'fieldPlaceholder',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onClear: 'clear',
    onInput: 'input',
    prop: 'value',
    restLabel: 'restLabel',
    restPress: 'restPress',
    restShown: 'restShown',
    restWords: 'restWords',
    segmented: 'segmented',
    segments: 'segments',
    tags: 'tags',
    tagsShown: 'tagsShown',
  },
  toggle: {
    defaultProp: 'defaultOpen',
    onBeforeClose: 'beforeClose',
    onBeforeOpen: 'beforeOpen',
    onToggle: 'toggle',
    prop: 'open',
  },
  validation: {
    feedback: 'feedback',
    message: 'message',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ entry, pickerField, props, state, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      <View
        data-grown={pickerField.tagsShown}
        part="field"
      >
        <Slot name="start" />
        {pickerField.tagsShown && (
          <View part="tags">
            <Repeat
              each={pickerField.tags}
              key="key"
              part="tag-list"
            >
              <Wrap
                draws="tag"
                exports={{
                  cell: true,
                  dismiss: true,
                  'dismiss-mark': true,
                  label: true,
                  link: true,
                  start: true,
                }}
                gives={{
                  disabled: props.disabled,
                  dismissible: entry.dismissible,
                  dismissLabel: entry.dismissLabel,
                }}
                part="date"
              >
                <Text part="date-words">{entry.words}</Text>
              </Wrap>
            </Repeat>
            {/* A box around the words, since a phone styles words by the part around them. */}
            {pickerField.restShown && (
              <View part="rest">
                <Text part="rest-words">{pickerField.restWords}</Text>
              </View>
            )}
            {pickerField.restPress && (
              <Pressable
                label={pickerField.restLabel}
                part="rest"
                role="button"
              >
                <Text part="rest-words">{pickerField.restWords}</Text>
              </Pressable>
            )}
          </View>
        )}
        {pickerField.segmented ? (
          <View
            labelledby="label"
            part="segments"
            role="group"
          >
            <Repeat
              each={pickerField.segments}
              key="key"
              part="segment-list"
            >
              <TextInput
                also={{ 'segment-placeholder': entry.empty }}
                autoCorrect={false}
                data-focused={entry.focused}
                data-hidden={entry.literal}
                disabled={props.disabled}
                enterKeyHint="next"
                inputMode={entry.inputMode}
                label={entry.label}
                part="segment"
                placeholder={entry.placeholder}
                readonly={props.readonly}
              />
              <View
                also={{ 'range-separator': entry.separator }}
                ariaHidden
                data-hidden={entry.field}
                part="literal"
              >
                <Text part="literal-words">{entry.words}</Text>
              </View>
            </Repeat>
          </View>
        ) : (
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            describedby="hint"
            disabled={props.disabled}
            inputMode="numeric"
            label={props.ariaLabel}
            labelledby="label"
            part="control"
            placeholder={pickerField.fieldPlaceholder}
            readonly={props.readonly}
            required={props.required}
          />
        )}
        <Slot name="end" />
        {pickerField.clearShown && (
          <Pressable
            label={props.clearLabel}
            part="clear"
            role="button"
          >
            <Slot name="clear-icon">
              <View
                ariaHidden
                icon="x"
                part="clear-mark"
                platform="native"
              />
            </Slot>
          </Pressable>
        )}
        <Pressable
          disabled={props.disabled}
          label={props.triggerLabel}
          part="trigger"
          role="button"
        >
          <Slot name="trigger">
            <View
              ariaHidden
              icon="calendar-blank"
              part="trigger-icon"
            />
          </Slot>
        </Pressable>
      </View>
      <Layer
        anchor="field"
        anchorPress="none"
        closedby="any"
        initialFocus="press"
        label={props.triggerLabel}
        offset={4}
        open={props.open}
        part="surface"
        placement="bottom-start"
        role="dialog"
      >
        <Slot name="panel-header" />
        <View
          draws="date-picker"
          exports={{
            cell: true,
            'cell-range-end': true,
            'cell-range-middle': true,
            'cell-range-start': true,
            day: true,
            'day-disabled': true,
            'day-outside': true,
            'day-selected': true,
            'day-today': true,
            'day-weekend': true,
            feedback: true,
            grid: true,
            header: true,
            heading: true,
            'heading-button': true,
            month: true,
            months: true,
            next: true,
            'next-mark': true,
            period: true,
            'period-current': true,
            'period-disabled': true,
            'period-row': true,
            'period-selected': true,
            periods: true,
            previous: true,
            'previous-mark': true,
            selection: true,
            week: true,
            weekday: true,
          }}
          gives={{
            calendar: props.calendar,
            dayContent: props.dayContent,
            disableDates: props.disableDates,
            disableDays: props.disableDays,
            firstDayOfWeek: props.firstDayOfWeek,
            isDateUnavailable: props.isDateUnavailable,
            label: props.calendarLabel,
            locale: props.locale,
            max: props.max,
            maxView: props.maxView,
            min: props.min,
            mode: props.mode,
            months: props.months,
            monthViewLabel: props.monthViewLabel,
            nextLabel: props.nextLabel,
            nextYearLabel: props.nextYearLabel,
            nextYearsLabel: props.nextYearsLabel,
            previousLabel: props.previousLabel,
            previousYearLabel: props.previousYearLabel,
            previousYearsLabel: props.previousYearsLabel,
            selectionLabel: props.selectionLabel,
            step: props.step,
            timeZone: props.timeZone,
            yearViewLabel: props.yearViewLabel,
          }}
          part="picker"
        />
        {/* A phone's calendar draws its own marks. */}
        <Slot
          name="previous-icon"
          platform="web"
        />
        <Slot
          name="next-icon"
          platform="web"
        />
        <Slot name="panel-footer" />
      </Layer>
      {!state.invalid ? (
        <Wrap
          part="hint"
          when={props.hint}
        >
          <Slot name="hint">
            <Text part="hint-text">{props.hint}</Text>
          </Slot>
        </Wrap>
      ) : (
        <View
          part="feedback"
          role="alert"
        >
          <Slot name="feedback">
            <Text part="feedback-text">{validation.message}</Text>
          </Slot>
        </View>
      )}
    </>
  ),
})
