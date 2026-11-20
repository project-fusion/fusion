import {
  bare,
  boolean,
  cancelable,
  headless,
  Layer,
  oneOf,
  Pressable,
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
 * Time Input's headless tier: a time, typed or picked from the list it opens.
 *
 * **The field shows the time written** while nobody is in it, and the value itself
 * while somebody is, so what is on screen can always be read back. A press on the
 * text or the trigger opens the list, which is Time Picker; a pick there is an edit
 * of the field, asked first with `before-change`. One time chosen from the list
 * closes it; on the wheels each turn is a third of a time, so the panel stays.
 *
 * **`range` holds two times and `multiple` any number**, each of several drawn as a
 * tag and kept in order. **`segmented` draws a row of segments**, an hour, a minute,
 * and the half of the day where the clock has one, each set with digits; a range is
 * two rows. Core's picker text and segments say what each holds, for the web
 * element too.
 *
 * **The web's**: a form's `name`, `autocomplete`, and the arrows that step between
 * segments and tags on a hardware keyboard.
 *
 * **Held to `helix-time-input`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element has.
 */
export default headless('time-input', {
  props: {
    ariaLabel: string(),
    autocomplete: web('off'),
    badInputMessage: string(),
    clearable: false,
    clearLabel: 'Clear',
    collapseLabel: 'Show fewer',
    defaultOpen: false,
    defaultValue: '',
    disabled: false,
    disableTimes: '',
    emptyMessage: '{kind, select, date {Enter a date.} other {Enter a time.}}',
    emptySegmentLabel: 'Empty',
    expandable: false,
    expandLabel: 'Show all',
    feedback: '',
    hint: '',
    hourCycle: oneOf(['h12', 'h23']),
    incompleteMessage: '{kind, select, date {Enter a whole date.} other {Enter a whole time.}}',
    label: '',
    locale: '',
    max: '23:59',
    maxTags: 0,
    min: '00:00',
    mode: oneOf(['multiple', 'range']),
    /* A form's, which a phone has none of. */
    name: web(''),
    nowLabel: 'Now',
    open: boolean(),
    picker: oneOf(['list', 'wheels']),
    placeholder: 'HH:mm',
    rangeEndLabel: 'End',
    rangeLengthMessage: 'A range is two times.',
    rangeOverflowMessage: 'Choose a time at or before {max}.',
    rangeStartLabel: 'Start',
    rangeUnderflowMessage: 'Choose a time at or after {min}.',
    readonly: false,
    removeLabel: 'Remove {name}',
    required: false,
    restText: '+{count}',
    seconds: false,
    segmented: false,
    showNow: false,
    step: 15,
    timeStyle: oneOf(['iso', 'local'], 'local'),
    triggerLabel: 'Choose a time',
    unavailableMessage: 'Choose a time that is available.',
    unreadableMessage:
      '{mode, select, single {Enter a time such as {example}.} other {Enter times such as {example}, separated by commas.}}',
    value: string(),
    valueMissingMessage: string(),
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
                part="time"
              >
                <Text part="time-words">{entry.words}</Text>
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
            inputMode="text"
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
              icon="clock"
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
          draws="time-picker"
          exports={{
            column: true,
            'column-empty': true,
            'column-error': true,
            'column-feedback': true,
            'column-filter-icon': true,
            'column-filter-mark': true,
            'column-hint': true,
            'column-items': true,
            'column-label': true,
            'column-live': true,
            'column-loading': true,
            'column-search': true,
            'column-search-field': true,
            'column-voice': true,
            'column-voice-level': true,
            'column-voice-level-canvas': true,
            'column-voice-listening': true,
            'column-voice-status': true,
            columns: true,
            feedback: true,
            hint: true,
            label: true,
            list: true,
            'list-empty': true,
            'list-error': true,
            'list-feedback': true,
            'list-filter-icon': true,
            'list-filter-mark': true,
            'list-hint': true,
            'list-items': true,
            'list-label': true,
            'list-live': true,
            'list-loading': true,
            'list-search': true,
            'list-search-field': true,
            'list-voice': true,
            'list-voice-level': true,
            'list-voice-level-canvas': true,
            'list-voice-listening': true,
            'list-voice-status': true,
            now: true,
            option: true,
            'option-between': true,
            'option-description': true,
            'option-item': true,
            'option-item-active': true,
            'option-item-selected': true,
            'option-label': true,
            'option-text': true,
          }}
          gives={{
            disableTimes: props.disableTimes,
            fallbackLabel: props.label,
            hourCycle: props.hourCycle,
            locale: props.locale,
            manual: true,
            max: props.max,
            min: props.min,
            mode: props.mode,
            nowLabel: props.nowLabel,
            picker: props.picker,
            seconds: props.seconds,
            showNow: props.showNow,
            step: props.step,
          }}
          part="picker"
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
