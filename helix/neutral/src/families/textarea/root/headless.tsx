import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  number,
  oneOf,
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
 * Textarea's headless tier: what it takes, what it sends, and its parts.
 *
 * **The same field as Input, with several lines.** The box is the field, and
 * the text is a native `<textarea>` on the web and a multiline `TextInput` on
 * a phone, `rows` lines tall. Under `auto-grow` the field grows with its text,
 * to `max-rows` lines where that is set, and then scrolls.
 *
 * **Each edit asks first**, as Input's does: `before-change` carries the text
 * the edit would leave, `input` follows each edit that stands, and `change`
 * follows once the reader leaves the field with new text. The clear button
 * empties the field and sends `input`, `change`, and `clear`.
 *
 * **A phone checks `required`, `minlength`, and `maxlength`** as the web's
 * `<textarea>` does, in Helix's sentences.
 *
 * **Web only:** dragging the field's size, `wrap`, `cols`, `dirname`, and
 * dictation.
 */
export default headless('textarea', {
  props: {
    ariaLabel: string(),
    autocomplete: '',
    autoGrow: false,
    clearable: false,
    clearLabel: 'Clear',
    cols: web(number()),
    defaultValue: '',
    dictationDeniedLabel: web('Dictation needs the microphone'),
    dictationFailedLabel: web('Dictation stopped with an error'),
    dictationUnreachableLabel: web('Dictation could not reach the speech service'),
    /* A form's second entry, which a phone has no form for. */
    dirname: web(''),
    disabled: false,
    feedback: '',
    hint: '',
    label: '',
    listeningLabel: web('Listening'),
    maxlength: number(),
    maxRows: number(),
    minlength: number(),
    /* A form's, which a phone has none of. */
    name: web(''),
    placeholder: '',
    readonly: false,
    required: false,
    rows: 3,
    stoppedListeningLabel: web('Stopped listening'),
    value: string(),
    valueMissingMessage: string(),
    voice: web(boolean()),
    voiceLabel: web('Dictate'),
    voiceStopLabel: web('Stop dictation'),
    wrap: web(oneOf(['hard', 'off', 'soft'], 'soft')),
  },
  events: {
    beforeChange: cancelable(['value']),
    beforeListen: web(cancelable()),
    change: bare(),
    clear: [],
    input: bare(),
    listen: web([]),
  },
  states: ['blank', 'invalid', 'listening', 'settled'],
  text: {
    blank: 'blank',
    clearShown: 'clearShown',
    clearable: 'clearable',
    defaultProp: 'defaultValue',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onClear: 'clear',
    onInput: 'input',
    prop: 'value',
    readonly: 'readonly',
  },
  validation: {
    feedback: 'feedback',
    maxLength: 'maxlength',
    message: 'message',
    minLength: 'minlength',
    required: 'required',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ props, state, text, validation }) => (
    <>
      <Wrap
        part="label"
        when={props.label}
      >
        <Slot name="label">
          <Text part="label-text">{props.label}</Text>
        </Slot>
      </Wrap>
      <View part="field">
        <Slot name="start" />
        <TextInput
          autoComplete={props.autocomplete}
          autoGrow={props.autoGrow}
          describedby="hint"
          disabled={props.disabled}
          label={props.ariaLabel}
          labelledby="label"
          maxLength={props.maxlength}
          maxRows={props.maxRows}
          multiline
          part="control"
          placeholder={props.placeholder}
          readonly={props.readonly}
          required={props.required}
          rows={props.rows}
        />
        <Slot name="end" />
        {text.clearShown && (
          <Pressable
            clears
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
        {props.voice && (
          <Pressable
            also={{ 'voice-listening': state.listening }}
            label={props.voiceLabel}
            part="voice"
            platform="web"
          >
            <View
              draws="voice-level"
              exports={{ canvas: true }}
              part="voice-level"
            />
          </Pressable>
        )}
        {props.voice && (
          <Announce
            part="voice-status"
            platform="web"
          />
        )}
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
