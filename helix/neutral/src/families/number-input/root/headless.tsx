import {
  bare,
  boolean,
  cancelable,
  headless,
  number,
  numberOrString,
  object,
  Pressable,
  Slot,
  string,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Number Input's headless tier: what it takes, what it sends, and its parts.
 *
 * **The field is a box with a stepper at each end.** The number is typed in
 * the control between them, an `<input>` on the web and a `TextInput` on a
 * phone, and a spin button a screen reader steps. On iOS the control is a
 * plain text field on both, since VoiceOver reads a spin button as a slider
 * a reader cannot type in.
 *
 * **Typing asks first, and leaving the field settles the number.** Each
 * edit sends `before-change` with the text it would leave and `input` once
 * it stands. Leaving the field holds the number to `min`, `max`, and `step`
 * and sends `change`. Text that is no number stays as it is, marked wrong.
 * While the field has no focus it shows the number in `format-options`.
 *
 * **The keys, a screen reader, and the steppers step the number**, each
 * step sent as `before-change`, `input`, and `change`. Up and Down take a
 * step, Page Up and Page Down `large-step` steps, and Home and End go to
 * `min` and `max` where there is one. A held stepper steps once, then again
 * after 400 milliseconds and every 60 after that, until it is let go or the
 * number reaches an end.
 *
 * **A phone checks the number as the web does**, with the sentences the
 * `*-message` props hold.
 *
 * **Web only, for now:** dragging the label to change the number, `scrub`,
 * the mouse wheel, `wheel`, the role's words, `role-label`, and the form's
 * `name`.
 */
export default headless('number-input', {
  props: {
    ariaLabel: string(),
    autocomplete: '',
    badInputMessage: 'Please enter a number.',
    decrementLabel: 'Decrease',
    defaultValue: '',
    disabled: false,
    feedback: '',
    /* JSON on the web's attribute, such as `{"style":"currency","currency":"EUR"}`. */
    formatOptions: object(),
    hint: '',
    incrementLabel: 'Increase',
    label: '',
    largeStep: number(),
    locale: '',
    max: number(),
    min: number(),
    /* A form's, which a phone has none of. */
    name: web(''),
    placeholder: '',
    rangeOverflowMessage: 'Value must be {max} or less.',
    rangeUnderflowMessage: 'Value must be {min} or more.',
    readonly: false,
    required: false,
    /* What a phone's screen reader calls the role is the platform's own. */
    roleLabel: web('number field'),
    scrub: web(false),
    /* A number, or `any` for no grid. */
    step: numberOrString(),
    stepMismatchMessage:
      'Please enter a valid value. The two nearest valid values are {below} and {above}.',
    value: string(),
    valueMissingMessage: string(),
    valueText: '',
    wheel: web(boolean()),
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    input: bare(),
  },
  states: ['atMax', 'atMin', 'invalid', 'scrubbing', 'settled'],
  text: {
    defaultProp: 'defaultValue',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    prop: 'value',
    readonly: 'readonly',
  },
  range: {
    atMax: 'atMax',
    atMin: 'atMin',
    defaultProp: 'defaultValue',
    formatOptions: 'formatOptions',
    largeStep: 'largeStep',
    locale: 'locale',
    max: 'max',
    min: 'min',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onInput: 'input',
    prop: 'value',
    reading: 'reading',
    readonly: 'readonly',
    spoken: 'spoken',
    step: 'step',
    valueText: 'valueText',
  },
  validation: {
    badInput: 'badInputMessage',
    feedback: 'feedback',
    message: 'message',
    rangeOverflow: 'rangeOverflowMessage',
    rangeUnderflow: 'rangeUnderflowMessage',
    required: 'required',
    stepMismatch: 'stepMismatchMessage',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ props, range, state, validation }) => (
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
        labelledby="label"
        part="field"
        role="group"
      >
        <Pressable
          disabled={props.disabled}
          label={props.decrementLabel}
          part="decrement"
          role="button"
          steps="down"
        >
          <Slot name="decrement-icon">
            <View
              ariaHidden
              icon="minus"
              part="decrement-mark"
            />
          </Slot>
        </Pressable>
        <Slot name="start" />
        <TextInput
          autoComplete={props.autocomplete}
          describedby="hint"
          disabled={props.disabled}
          label={props.ariaLabel}
          labelledby="label"
          part="control"
          placeholder={props.placeholder}
          readonly={props.readonly}
          required={props.required}
          role="spinbutton"
          valuemax={props.max}
          valuemin={props.min}
          valuenow={range.reading}
          valuetext={range.spoken}
        />
        <Slot name="end" />
        <Pressable
          disabled={props.disabled}
          label={props.incrementLabel}
          part="increment"
          role="button"
          steps="up"
        >
          <Slot name="increment-icon">
            <View
              ariaHidden
              icon="plus"
              part="increment-mark"
            />
          </Slot>
        </Pressable>
      </View>
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
