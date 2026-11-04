import {
  bare,
  cancelable,
  headless,
  object,
  oneOf,
  Pressable,
  property,
  Repeat,
  Slot,
  string,
  Text,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Time Picker's headless tier: a list of the times of a day, or a set of wheels.
 *
 * **Core says what each time is.** The times offered from `min` to `max` at each
 * `step`, those `disable-times` bars, what a choice leaves, the times a range is
 * drawn between, what each wheel offers and what a turn of one leaves, and what is
 * wrong with the times held are `@fusion.dev/helix-core/clock`, which the web
 * element reads too. A choice asks `before-change` first.
 *
 * **The list is Listbox, drawn from data and windowed**, so a day in short steps
 * draws only the rows on screen. A phone's rows are the list's own, and the list
 * exports their parts again, `row-item` and `row-label`, so the rules that style
 * the web's options reach them; a time between a range's ends says so in its
 * record. **`picker="wheels"`** draws one list a wheel, the
 * hour, the minute, the second, and the half of the day, for one time.
 *
 * **The web's**: a form's `name`, and `time-content`, which returns a Lit template.
 *
 * **Held to `helix-time-picker`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('time-picker', {
  props: {
    badInputMessage:
      '{mode, select, single {Enter a time such as {example}.} other {Enter times such as {example}, separated by commas.}}',
    defaultValue: '',
    disabled: false,
    disableTimes: '',
    emptyText: 'No times to choose from',
    fallbackLabel: 'Time',
    feedback: '',
    hint: '',
    hourCycle: oneOf(['h12', 'h23']),
    hourLabel: string(),
    invalid: false,
    label: '',
    locale: '',
    manual: false,
    max: '23:59',
    meridiemLabel: string(),
    min: '00:00',
    minuteLabel: string(),
    mode: oneOf(['multiple', 'range']),
    /* A form's, which a phone has none of. */
    name: web(''),
    nowLabel: 'Now',
    picker: oneOf(['list', 'wheels']),
    rangeOverflowMessage: 'Choose a time at or before {max}.',
    rangeUnderflowMessage: 'Choose a time at or after {min}.',
    readonly: false,
    required: false,
    secondLabel: string(),
    seconds: false,
    showNow: false,
    step: 15,
    stepMismatchMessage: 'Choose one of the times the list offers.',
    timeContent: web(property(object())),
    unavailableMessage: 'Choose a time that is available.',
    value: string(),
    valueMissingMessage: 'Choose a time.',
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    input: bare(),
  },
  states: ['blank', 'invalid', 'rangePending', 'settled'],
  timePicker: {
    columns: 'columns',
    defaultProp: 'defaultValue',
    listName: 'listName',
    multiple: 'multiple',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    options: 'options',
    prop: 'value',
    unset: 'unset',
    wheels: 'wheels',
  },
  render: ({ entry, props, timePicker }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      {timePicker.wheels ? (
        <View
          data-unset={timePicker.unset}
          label={timePicker.listName}
          part="columns"
          role="group"
        >
          <Repeat
            each={timePicker.columns}
            key="key"
            part="column-list"
          >
            <Wrap
              draws="listbox"
              exports={{
                empty: true,
                error: true,
                feedback: true,
                'filter-icon': true,
                'filter-mark': true,
                hint: true,
                items: true,
                label: true,
                live: true,
                loading: true,
                'row-check': 'native',
                'row-item': 'native',
                'row-label': 'native',
                'row-text': 'native',
                search: true,
                'search-field': true,
                voice: true,
                'voice-level': true,
                'voice-level-canvas': true,
                'voice-listening': true,
                'voice-status': true,
              }}
              gives={{
                ariaLabel: entry.label,
                disabled: props.disabled,
                items: entry.options,
                manual: true,
              }}
              part="column"
            />
          </Repeat>
        </View>
      ) : (
        <Wrap
          draws="listbox"
          exports={{
            empty: true,
            error: true,
            feedback: true,
            'filter-icon': true,
            'filter-mark': true,
            hint: true,
            items: true,
            label: true,
            live: true,
            loading: true,
            'row-check': 'native',
            'row-item': 'native',
            'row-label': 'native',
            'row-text': 'native',
            search: true,
            'search-field': true,
            voice: true,
            'voice-level': true,
            'voice-level-canvas': true,
            'voice-listening': true,
            'voice-status': true,
          }}
          gives={{
            ariaLabel: timePicker.listName,
            disabled: props.disabled,
            emptyText: props.emptyText,
            items: timePicker.options,
            manual: props.manual,
            multiple: timePicker.multiple,
          }}
          part="list"
        >
          <Slot name="empty" />
        </Wrap>
      )}
      {/* The rows the list draws, which a phone draws from its data. */}
      <Wrap
        also={{ 'option-between': timePicker.unset }}
        draws="option"
        exports={{
          description: true,
          item: true,
          'item-active': true,
          'item-selected': true,
          label: true,
          text: true,
        }}
        part="option"
        platform="web"
      />
      {props.showNow && (
        <Pressable
          disabled={props.disabled}
          part="now"
          role="button"
        >
          <Text part="now-words">{props.nowLabel}</Text>
        </Pressable>
      )}
      {!props.feedback ? (
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
          <Text part="feedback-text">{props.feedback}</Text>
        </View>
      )}
    </>
  ),
})
