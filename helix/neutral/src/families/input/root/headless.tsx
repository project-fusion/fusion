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
 * Input's headless tier: what it takes, what it sends, and its parts.
 *
 * **The field is the box around the text.** What is passed into `start` and
 * `end` sits in it beside the text, and the clear button after them. On the
 * web the text is a native `<input>`, and on a phone a `TextInput`.
 *
 * **Each edit asks first.** `before-change` carries the text the edit would
 * leave, and a refused edit puts the text back. `input` follows each edit
 * that stands, and `change` once the reader leaves the field with new text.
 * The clear button empties the field, sends `input`, `change`, and `clear`,
 * and gives the caret back to the field.
 *
 * **A phone checks the text as the web's `<input>` does**: `required`,
 * `minlength`, `maxlength`, `pattern`, and an `email` or a `url` type. The
 * web says the browser's sentences, and a phone says Helix's.
 *
 * **A number type holds its text to `min`, `max`, and `step`**, as the web's
 * `<input>` does, and the arrow keys and `stepUp` and `stepDown` step it.
 *
 * **A password's reveal button** shows and hides the text under `reveal`. It
 * lasts as long as the element is drawn, and a page cannot set it.
 *
 * **Web only:** dictation, which a phone's keyboard offers itself.
 */
export default headless('input', {
  props: {
    ariaLabel: string(),
    autocapitalize: '',
    autocomplete: '',
    autocorrect: true,
    clearable: false,
    clearLabel: 'Clear',
    defaultValue: '',
    dictationDeniedLabel: web('Dictation needs the microphone'),
    dictationFailedLabel: web('Dictation stopped with an error'),
    dictationUnreachableLabel: web('Dictation could not reach the speech service'),
    disabled: false,
    enterkeyhint: '',
    feedback: '',
    hint: '',
    inputmode: '',
    label: '',
    listeningLabel: web('Listening'),
    max: '',
    maxlength: number(),
    min: '',
    minlength: number(),
    /* A form's, which a phone has none of. */
    name: web(''),
    pattern: '',
    placeholder: '',
    readonly: false,
    required: false,
    reveal: false,
    revealLabel: 'Show password',
    step: '',
    stoppedListeningLabel: web('Stopped listening'),
    type: oneOf(['email', 'number', 'password', 'search', 'tel', 'text', 'url'], 'text'),
    value: string(),
    valueMissingMessage: string(),
    voice: web(boolean()),
    voiceLabel: web('Dictate'),
    voiceStopLabel: web('Stop dictation'),
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
    max: 'max',
    min: 'min',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onClear: 'clear',
    onInput: 'input',
    prop: 'value',
    readonly: 'readonly',
    reveal: 'reveal',
    revealed: 'revealed',
    revealShown: 'revealShown',
    step: 'step',
    type: 'type',
  },
  validation: {
    feedback: 'feedback',
    maxLength: 'maxlength',
    message: 'message',
    minLength: 'minlength',
    pattern: 'pattern',
    required: 'required',
    type: 'type',
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
          autoCapitalize={props.autocapitalize}
          autoComplete={props.autocomplete}
          autoCorrect={props.autocorrect}
          describedby="hint"
          disabled={props.disabled}
          enterKeyHint={props.enterkeyhint}
          inputMode={props.inputmode}
          label={props.ariaLabel}
          labelledby="label"
          maxLength={props.maxlength}
          part="control"
          placeholder={props.placeholder}
          readonly={props.readonly}
          required={props.required}
          type={props.type}
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
        {text.revealShown && (
          <Pressable
            also={{ 'reveal-pressed': text.revealed }}
            disabled={props.disabled}
            label={props.revealLabel}
            part="reveal"
            pressed={text.revealed}
            reveals
            role="button"
          >
            {text.revealed ? (
              <Slot name="conceal-icon">
                <View
                  ariaHidden
                  icon="eye-slash"
                  part="reveal-mark"
                  platform="native"
                />
              </Slot>
            ) : (
              <Slot name="reveal-icon">
                <View
                  ariaHidden
                  icon="eye"
                  part="reveal-mark"
                  platform="native"
                />
              </Slot>
            )}
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
