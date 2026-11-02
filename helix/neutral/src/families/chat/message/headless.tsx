import {
  cancelable,
  headless,
  oneOf,
  Pressable,
  Slot,
  string,
  Text,
  View,
} from '../../../render.js'

/**
 * Chat Message's headless tier: one turn, with who said it, what was said, what it
 * was drawn from, and the line under it.
 *
 * **A screen reader names the turn by its author and its time**, through core's
 * `turnName`, the same on both platforms. The time moves on by itself, on the wall
 * clock both platforms run.
 *
 * **A retry sends `send` again**, cancelable, and a retry that stands sets the turn
 * to `sending`. It sends the turn's words without what is passed in beside them.
 *
 * **The web's**: the `article` role, its place in the set, and `aria-busy`. A phone
 * has no trait for them, and announces a turn only once it settles.
 *
 * **Held to `helix-chat-message`.** `helix system check` compares the props, the
 * events, the regions, and the parts with what the manifest says the element has.
 */
export default headless('chat-message', {
  props: {
    at: '',
    author: string(),
    authorLabel: '',
    failedLabel: 'Not sent',
    locale: '',
    retryLabel: 'Try again',
    sendingLabel: 'Sending',
    separation: oneOf(['filled', 'plain']),
    state: oneOf(['failed', 'sending', 'sent', 'streaming']),
  },
  events: {
    send: cancelable(['value']),
  },
  states: ['settled'],
  chatMessage: {
    actionsEmpty: 'actionsEmpty',
    at: 'at',
    attachmentsEmpty: 'attachmentsEmpty',
    author: 'author',
    authorLabel: 'authorLabel',
    contentEmpty: 'contentEmpty',
    failed: 'failed',
    failedLabel: 'failedLabel',
    inline: 'inline',
    locale: 'locale',
    named: 'named',
    onSend: 'send',
    reading: 'reading',
    retryLabel: 'retryLabel',
    sending: 'sending',
    sendingLabel: 'sendingLabel',
    sourcesEmpty: 'sourcesEmpty',
    state: 'state',
    waiting: 'waiting',
    workEmpty: 'workEmpty',
  },
  render: ({ chatMessage, props }) => (
    <View
      label={chatMessage.named}
      part="message"
      role="article"
    >
      <View part="avatar">
        <Slot name="avatar" />
      </View>
      <View part="body">
        <View
          hidden={chatMessage.workEmpty}
          part="work"
        >
          <Slot name="work" />
        </View>
        <View
          hidden={chatMessage.attachmentsEmpty}
          part="attachments"
        >
          <Slot name="attachments" />
        </View>
        <View
          data-empty={chatMessage.contentEmpty}
          data-sending={chatMessage.sending}
          part="content"
        >
          {chatMessage.inline ? (
            <View
              part="paragraph"
              platform="native"
              run
            >
              <Slot />
            </View>
          ) : (
            <Slot />
          )}
          <Slot
            hidden={!chatMessage.waiting}
            name="indicator"
          >
            <View part="indicator">
              <View
                part="indicator-first"
                platform="native"
              />
              <View
                part="indicator-second"
                platform="native"
              />
              <View
                part="indicator-third"
                platform="native"
              />
            </View>
          </Slot>
        </View>
        <View
          hidden={chatMessage.sourcesEmpty}
          part="sources"
        >
          <Slot name="sources" />
        </View>
        <View
          data-failed={chatMessage.failed}
          part="meta"
        >
          {chatMessage.reading && (
            <View part="time">
              <Text part="time-words">{chatMessage.reading}</Text>
            </View>
          )}
          {chatMessage.sending && (
            <View part="state">
              <Text part="state-words">{props.sendingLabel}</Text>
            </View>
          )}
          {chatMessage.failed && (
            <View part="state">
              <View
                icon="x-circle-fill"
                label="Error"
                part="mark"
                role="img"
              />
              <Text part="state-words">{props.failedLabel}</Text>
              <Pressable
                part="retry"
                role="button"
              >
                <Text part="retry-words">{props.retryLabel}</Text>
              </Pressable>
            </View>
          )}
          <View
            hidden={chatMessage.actionsEmpty}
            part="actions"
          >
            <Slot name="actions" />
          </View>
        </View>
      </View>
    </View>
  ),
})
