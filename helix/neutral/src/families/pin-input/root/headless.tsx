import {
  bare,
  cancelable,
  headless,
  oneOf,
  Repeat,
  Slot,
  string,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'
import { derive } from '../../../tree.js'

/**
 * Pin Input's headless tier: what it takes, what it sends, and its parts.
 *
 * **One field holds the code, and the boxes are drawn from it.** The field
 * is out of sight over the boxes, a native `<input>` on the web and a
 * `TextInput` on a phone, so a press on any box focuses it and a screen
 * reader meets one field named by the label. Each box draws its character,
 * the mask in its place, the caret, or the placeholder, from
 * `pin-input-cells`.
 *
 * **What is typed is cleaned**, by `pin-input-clean`: the characters `type`
 * accepts, cased as `case` asks, cut at `length`. An edit asks first, with
 * the code it would leave, and a code that fills every box sends `complete`
 * and then `change`.
 *
 * **A code shorter than `length` is wrong**, whether or not it is required,
 * in `too-short-message`'s words, as on the web.
 *
 * **Web only:** `autosubmit`, since a phone's app owns its forms, the
 * caret moved with the arrow keys, and pasting into a box past the code's end.
 */
export default headless('pin-input', {
  props: {
    ariaLabel: string(),
    autocomplete: 'one-time-code',
    /* A form's submission, which a phone has none of. */
    autosubmit: web(false),
    case: oneOf(['lower', 'preserve', 'upper'], 'preserve'),
    cellLabel: web('Character {index} of {length}'),
    defaultValue: '',
    disabled: false,
    feedback: '',
    format: '',
    hint: '',
    label: '',
    length: 6,
    mask: false,
    maskCharacter: '•',
    /* A form's, which a phone has none of. */
    name: web(''),
    placeholder: '',
    readonly: false,
    required: false,
    tooShortMessage:
      '{length, plural, one {Please enter the # character.} other {Please enter all # characters.}}',
    type: oneOf(['alphanumeric', 'numeric', 'text'], 'numeric'),
    value: string(),
    valueMissingMessage: string(),
  },
  events: {
    beforeChange: cancelable(['value']),
    change: bare(),
    complete: ['value'],
    input: bare(),
  },
  states: ['complete', 'invalid', 'settled'],
  text: {
    caret: 'caret',
    clean: 'pin-input-clean',
    defaultProp: 'defaultValue',
    length: 'length',
    onBeforeChange: 'beforeChange',
    onChange: 'change',
    onComplete: 'complete',
    onInput: 'input',
    prop: 'value',
    readonly: 'readonly',
    typed: 'typed',
  },
  validation: {
    feedback: 'feedback',
    message: 'message',
    minLength: 'length',
    required: 'required',
    tooShort: 'tooShortMessage',
    valueMissing: 'valueMissingMessage',
  },
  render: ({ entry, props, state, validation }) => (
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
        <TextInput
          autoComplete={props.autocomplete}
          describedby="hint"
          disabled={props.disabled}
          inputMode={props.type === 'numeric' ? 'numeric' : 'text'}
          label={props.ariaLabel}
          labelledby="label"
          maxLength={props.length}
          part="control"
          readonly={props.readonly}
          required={props.required}
          type={props.mask ? 'password' : 'text'}
        />
        <Repeat
          each={derive('pin-input-cells')}
          key="at"
          part="boxes"
        >
          <View
            also={{ 'cell-active': entry.active, 'cell-filled': entry.filled }}
            ariaHidden
            part="cell"
          >
            <Text part="cell-text">{entry.shown}</Text>
            <View
              hidden={entry.bare}
              part="caret"
            />
            <View
              hidden={entry.unmarked}
              part="placeholder"
            >
              <Text part="placeholder-text">{props.placeholder}</Text>
            </View>
          </View>
          <Wrap
            part="separator"
            when={entry.separator}
          >
            <Text
              ariaHidden
              part="separator-text"
            >
              {entry.separator}
            </Text>
          </Wrap>
        </Repeat>
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
