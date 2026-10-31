import {
  Announce,
  boolean,
  cancelable,
  headless,
  object,
  Pressable,
  property,
  Repeat,
  Slot,
  string,
  Text,
  View,
  Wrap,
} from '../../../render.js'

/**
 * Chat's headless tier: a conversation's turns in a box that follows the newest
 * turn until the reader scrolls away, with a composer under them.
 *
 * **Turns arrive two ways.** `Chat.Message` elements passed in stand in the box,
 * or `turns` hands it data, which a window draws.
 *
 * **The `tail` machine follows the newest turn**, the machine Log binds, by core's
 * `follow-tail`. On a phone `maintainVisibleContentPosition` holds a reader's place
 * as older turns arrive above them.
 *
 * **Helix keeps the composer above the software keyboard**: the transcript gives
 * up the room the keyboard takes from the chat, by what the chat itself measures,
 * so an app that moves its own content moves nothing twice.
 *
 * **What a screen reader hears.** Core's `turnsToSay` finds what is new, the same
 * on both platforms, and the web's status region says it where a phone announces
 * it. A phone has no trait for a log or an article, and reads the turns in order.
 *
 * **The web's**: the status region and the keys that move between turns from a
 * hardware keyboard, Page Up, Page Down, and Control with Home or End.
 *
 * **Held to `helix-chat`.** `helix system check` compares the props, the events,
 * the states, the regions, and the parts with what the manifest says the element
 * has.
 */
export default headless('chat', {
  props: {
    arrivalLabel: '{author}: {text}',
    authorStyles: object(),
    defaultPinned: true,
    emptyText: 'Nothing to show',
    failedLabel: 'Not sent',
    failedTurnLabel: '{failed}: {text}',
    fallbackLabel: 'Conversation',
    history: string(),
    historyText: 'Loading earlier messages',
    label: '',
    loading: false,
    loadingText: 'Loading',
    meLabel: 'You',
    messageLabel: '{author}, {time}',
    pinned: boolean(),
    resumeLabel: 'Jump to latest',
    threshold: 48,
    turnLabel: 'Message',
    turns: property(object()),
    typing: '',
    typingLabel: '{author} is typing',
  },
  events: {
    beforePin: cancelable(['value']),
    history: [],
    pin: ['value'],
    send: cancelable(['value']),
  },
  states: ['empty', 'loading', 'pinned', 'settled', 'typing'],
  tail: {
    away: 'away',
    defaultPinned: 'defaultPinned',
    following: 'following',
    onBeforePin: 'beforePin',
    onPin: 'pin',
    pinned: 'pinned',
    resume: 'resumeButton',
    threshold: 'threshold',
  },
  chatRoot: {
    actionsEmpty: 'actionsEmpty',
    arrivalLabel: 'arrivalLabel',
    authorStyles: 'authorStyles',
    blank: 'blank',
    busy: 'busy',
    composerEmpty: 'composerEmpty',
    failedLabel: 'failedLabel',
    failedTurnLabel: 'failedTurnLabel',
    fallbackLabel: 'fallbackLabel',
    headerEmpty: 'headerEmpty',
    history: 'history',
    historyShown: 'historyShown',
    historyText: 'historyText',
    label: 'label',
    list: 'rows',
    loadingShown: 'loadingShown',
    meLabel: 'meLabel',
    messageLabel: 'messageLabel',
    named: 'named',
    onHistory: 'history',
    onSend: 'send',
    said: 'said',
    scrolls: 'scrolls',
    statusEmpty: 'statusEmpty',
    turnLabel: 'turnLabel',
    turns: 'turns',
    typing: 'typing',
    typingLabel: 'typingLabel',
    typingWords: 'typingWords',
    windowed: 'windowed',
  },
  render: ({ chatRoot, entry, props, tail }) => (
    <>
      <View
        hidden={chatRoot.headerEmpty}
        part="header"
      >
        <Slot name="header" />
        <View
          hidden={chatRoot.actionsEmpty}
          part="actions"
        >
          <Slot name="actions" />
        </View>
      </View>
      <View
        busy={chatRoot.busy}
        data-scrolls={chatRoot.scrolls}
        data-windowed={chatRoot.windowed}
        label={chatRoot.named}
        part="log"
        role="log"
      >
        {chatRoot.historyShown && (
          <View part="history">
            <Text part="history-words">{props.historyText}</Text>
          </View>
        )}
        <View
          part="before"
          platform="web"
        />
        {/* The first thing a windowed repeat holds is a copy for each turn, and
            what follows stands after the turns, inside what scrolls. */}
        <Repeat
          each={chatRoot.list}
          key="key"
          part="turns"
          windowed
        >
          <View
            data-last={entry.last}
            data-later={entry.later}
            part="turn"
          >
            <Wrap
              draws="chat-message"
              exports={{
                actions: true,
                attachments: true,
                avatar: true,
                'avatar-mine': true,
                body: true,
                'body-mine': true,
                content: true,
                'content-mine': true,
                'content-sending': true,
                'content-streaming': true,
                indicator: true,
                mark: true,
                meta: true,
                'meta-failed': true,
                'meta-mine': true,
                mine: true,
                retry: true,
                sources: true,
                state: true,
                time: true,
                work: true,
              }}
              part="message"
            />
          </View>
          {chatRoot.loadingShown && (
            <View part="loading">
              <Text part="loading-words">{props.loadingText}</Text>
            </View>
          )}
          {chatRoot.blank && (
            <View part="empty">
              <Text part="empty-words">{props.emptyText}</Text>
            </View>
          )}
        </Repeat>
        <View
          part="after"
          platform="web"
        />
        <Slot />
      </View>
      <Announce
        part="live"
        platform="web"
      />
      <View
        hidden={tail.following}
        part="resume"
      >
        <Slot name="resume">
          <Pressable
            part="resume-button"
            role="button"
          >
            <View
              ariaHidden
              icon="arrow-down"
              part="resume-mark"
            />
            <Text part="resume-words">{props.resumeLabel}</Text>
          </Pressable>
        </Slot>
      </View>
      <View
        data-empty={chatRoot.statusEmpty}
        part="status"
        role="status"
      >
        <Slot name="status" />
        {chatRoot.typingWords && (
          <View part="typing">
            <View
              ariaHidden
              part="indicator"
            >
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
            <Text part="typing-words">{chatRoot.typingWords}</Text>
          </View>
        )}
      </View>
      <View
        hidden={chatRoot.composerEmpty}
        part="composer"
      >
        <Slot name="composer" />
      </View>
    </>
  ),
})
