import {
  Announce,
  bare,
  boolean,
  cancelable,
  headless,
  number,
  object,
  oneOf,
  Pressable,
  property,
  Slot,
  Text,
  TextInput,
  View,
  Wrap,
  web,
} from '../../../render.js'

/**
 * Chat Composer's headless tier: a field for writing a turn, with a row of tools
 * and a send button under it.
 *
 * **The field is the one Textarea draws**, a `<textarea>` on the web and a multiline
 * `TextInput` on a phone, which grows with its text to `--chat-composer-max-block-size`
 * and then scrolls. `required`, `minlength`, and `maxlength` hold the draft to the
 * sentences a field says.
 *
 * **A send asks first and clears after.** `send` is cancelable, and the draft stays
 * in the field where a handler refused it. `submit-on="enter"` makes the return key
 * send.
 *
 * **`stop` replaces `send` while `busy`**, and the `idle` region stands in its place
 * while the draft is empty and no reply is on its way.
 *
 * **`placeholders` turn on a phone too**, by core's clock of examples, in the field's
 * own placeholder, without the roll a second field draws on the web.
 *
 * **The web's**: the second field that draws the rolling examples, the tooltip that
 * says `send-reason`, a form's submission, dictation, and `glow`.
 *
 * **Held to `helix-chat-composer`.** `helix system check` compares the props, the
 * events, the states, the regions, and the parts with what the manifest says the
 * element has.
 */
export default headless('chat-composer', {
  props: {
    attached: false,
    busy: false,
    dictationDeniedLabel: web('Dictation needs the microphone'),
    dictationFailedLabel: web('Dictation stopped with an error'),
    dictationUnreachableLabel: web('Dictation could not reach the speech service'),
    disabled: false,
    fallbackLabel: 'Message',
    feedback: '',
    glow: web(false),
    label: '',
    listeningLabel: web('Listening'),
    maxlength: number(),
    minlength: number(),
    name: web(''),
    placeholder: '',
    placeholders: property(object()),
    queue: false,
    required: false,
    rows: 1,
    sendDisabled: false,
    sendLabel: 'Send',
    sendReason: '',
    stopLabel: 'Stop',
    stoppedListeningLabel: web('Stopped listening'),
    submitOn: oneOf(['button', 'enter'], 'enter'),
    typingTimeout: 3000,
    value: '',
    voice: web(boolean()),
    voiceLabel: web('Dictate'),
    voiceStopLabel: web('Stop dictation'),
  },
  events: {
    beforeListen: web(cancelable()),
    input: bare(),
    listen: web([]),
    send: cancelable(['value']),
    stop: [],
    typing: ['typing'],
  },
  states: ['exampleEntering', 'exampleLeaving', 'invalid', 'listening', 'settled'],
  text: {
    onInput: 'input',
    prop: 'value',
  },
  validation: {
    feedback: 'feedback',
    maxLength: 'maxlength',
    message: 'message',
    minLength: 'minlength',
    required: 'required',
  },
  chatComposer: {
    attached: 'attached',
    attachmentsEmpty: 'attachmentsEmpty',
    busy: 'busy',
    endEmpty: 'endEmpty',
    idling: 'idling',
    mark: 'mark',
    onSend: 'send',
    onStop: 'stop',
    onTyping: 'typing',
    placeholder: 'placeholder',
    placeholders: 'placeholders',
    queue: 'queue',
    sendDisabled: 'sendDisabled',
    sendHeld: 'sendHeld',
    sendLabel: 'sendLabel',
    sendName: 'sendName',
    sendReason: 'sendReason',
    shownPlaceholder: 'shownPlaceholder',
    startEmpty: 'startEmpty',
    stopLabel: 'stopLabel',
    submitOn: 'submitOn',
    typingTimeout: 'typingTimeout',
  },
  render: ({ chatComposer, props, state }) => (
    <>
      <View part="composer">
        <View
          hidden={chatComposer.attachmentsEmpty}
          part="attachments"
        >
          <Slot name="attachments" />
        </View>
        <TextInput
          autoGrow
          disabled={props.disabled}
          label={props.label}
          maxLength={props.maxlength}
          multiline
          part="field"
          placeholder={chatComposer.shownPlaceholder}
          required={props.required}
          rows={props.rows}
        />
        <View
          also={{ 'example-leaving': state.exampleLeaving }}
          part="example"
          platform="web"
        />
        <View part="tools">
          <View
            data-empty={chatComposer.startEmpty}
            part="start"
          >
            <Slot name="start" />
          </View>
          <View
            data-empty={chatComposer.endEmpty}
            part="end"
          >
            <Slot name="end" />
          </View>
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
          <View
            hidden={!chatComposer.idling}
            part="idle"
          >
            <Slot name="idle" />
          </View>
          {!chatComposer.idling && (
            <Wrap
              draws="tooltip"
              exports={{
                arrow: true,
                'arrow-bottom': true,
                'arrow-left': true,
                'arrow-right': true,
                'arrow-top': true,
                surface: true,
                'surface-bottom': true,
                'surface-left': true,
                'surface-right': true,
                'surface-top': true,
              }}
              part="reason"
              platform="web"
            />
          )}
          {!chatComposer.idling && (
            <Pressable
              disabled={chatComposer.sendHeld}
              label={chatComposer.sendName}
              part="send"
              role="button"
            >
              <View
                ariaHidden
                icon={chatComposer.mark}
                part="mark"
              />
            </Pressable>
          )}
        </View>
      </View>
      {state.invalid && (
        <Wrap
          part="feedback"
          when={props.feedback}
        >
          <Text part="feedback-words">{props.feedback}</Text>
        </Wrap>
      )}
    </>
  ),
})
