import { reportRuntime, type VirtualizeController } from '@fusion.dev/helix-core'
import { nothing, type TemplateResult } from 'lit'
import { repeat } from 'lit/directives/repeat.js'
/* `static-html`'s `html`, because a turn fed as data is drawn with the tier's
   own message tag, and an interpolated tag is a static value. */
import { html, type StaticValue } from 'lit/static-html.js'
import type { TurnWords } from '../naming.js'
import type { ChatTurn, HelixHeadlessChat } from '../root/chat-root.js'

/** The chat as the turns read it: the members its public API leaves out. */
interface Chat {
  readonly virtualize: VirtualizeController
  readonly words: TurnWords
  tag(name: string): StaticValue
}

/**
 * What a fed turn's parts are called a second time, while the turn is one a
 * stylesheet draws apart: `<part>-<state>`, as a state drawn on a part is, for
 * each part the styled tier draws differently from inside the message.
 *
 * **Only `me` has a name.** `author` is free text, so the plain names are
 * everyone else's.
 *
 * **Literal `inner: outer` lists**, because `helix component` reads them here
 * to hold each name to its prefix and its `@csspart`, and a name put together
 * from pieces is one no rule can read.
 */
const SECOND_NAMES = {
  author: {
    me: 'avatar: message-avatar-mine, body: message-body-mine, content: message-content-mine, message: message-mine, meta: message-meta-mine',
  },
  state: {
    failed: 'meta: message-meta-failed',
    sending: 'content: message-content-sending',
    streaming: 'content: message-content-streaming',
  },
} as const

/**
 * What `table` holds under `key`. Own keys only: `author` is free text, and a
 * turn by `constructor` would otherwise read the source of a function.
 */
const ownEntry = (
  table: Readonly<Record<string, string>>,
  key: string | undefined,
): string | undefined => (key !== undefined && Object.hasOwn(table, key) ? table[key] : undefined)

/** The names `key` adds from `table`, as the tail of an `exportparts` list. */
const secondNames = (table: Readonly<Record<string, string>>, key: string | undefined): string => {
  const names = ownEntry(table, key)
  return names === undefined ? '' : `, ${names}`
}

/** The chats that have said they were given turns both ways. */
const warned = new WeakSet<HelixHeadlessChat>()

/** Says once that turns arrived both as children and as `turns`. */
const warnMixed = (chat: HelixHeadlessChat): void => {
  if (warned.has(chat) || chat.messages.length === 0) {
    return
  }
  warned.add(chat)
  reportRuntime({
    kind: 'mixed-turns',
    message: `A chat was given ${chat.messages.length} turns as children and ${chat.turns.length} as \`turns\`, and draws the children after every turn from \`turns\`. Pass one or the other.`,
    tag: chat.localName,
  })
}

/**
 * The turns of `turns` in the window the chat draws, each a message of the
 * tier's own, with the space the turns above and below it would take.
 */
export const drawTurns = (chat: HelixHeadlessChat): TemplateResult => {
  const inner = chat as unknown as Chat
  warnMixed(chat)
  const { after, before, first, last } = inner.virtualize.window
  const message = inner.tag('chat-message')
  /* `flex: none` inline, because the room is only room if it keeps its size:
     an empty flex item in a log that is a flex column shrinks to nothing, and
     with the spacers gone the window grew until it had drawn every turn. */
  return html`<div part="before" role="presentation" style="block-size: ${before}px; flex: none"></div>
    ${repeat(
      chat.turns.slice(first, last),
      (turn, offset) => turn.key ?? first + offset,
      (turn, offset) =>
        html`<div part="turn" data-index=${first + offset}>
          <${message}
            exportparts="actions: message-actions, avatar: message-avatar, body: message-body,
              content: message-content, indicator: message-indicator, mark: message-mark, message,
              meta: message-meta, retry: message-retry, sources: message-sources,
              state: message-state, time: message-time${secondNames(SECOND_NAMES.author, turn.author)}${secondNames(SECOND_NAMES.state, turn.state)}"
            author=${turn.author ?? nothing}
            author-label=${turn.authorLabel ?? nothing}
            at=${turn.at ?? nothing}
            style=${ownEntry(chat.authorStyles, turn.author) ?? nothing}
            .turnWords=${inner.words}
            .turnPosition=${first + offset + 1}
            .turnCount=${chat.turns.length}
            .failedLabel=${chat.failedLabel}
            state=${turn.state ?? nothing}
          >${turn.text}</${message}>
        </div>`,
    )}
    <div part="after" role="presentation" style="block-size: ${after}px; flex: none"></div>`
}

/** What identifies a turn fed as data: its key, or the object it is. */
const identity = (turn: ChatTurn | undefined): unknown => turn?.key ?? turn

/**
 * Keeps the window on the same turns when the set changes around them.
 *
 * Turns added before the first one are history, and the controller is told
 * how many so every measurement moves with its turn. A first turn that is gone
 * means the set was trimmed or replaced, and a measurement that now names a
 * different turn is worse than the estimate.
 */
export const followTurns = (
  chat: HelixHeadlessChat,
  previous: readonly ChatTurn[] | undefined,
): void => {
  if (!previous?.length || chat.turns.length === 0) {
    return
  }
  const { virtualize } = chat as unknown as Chat
  const first = identity(previous[0])
  const at = chat.turns.findIndex((turn) => identity(turn) === first)
  if (at > 0) {
    virtualize.shift(at)
  } else if (at < 0) {
    virtualize.forget()
  }
}

/** Draws turn `at` where it is windowed and not drawn, and gives back its message. */
export const revealTurn = async (
  chat: HelixHeadlessChat,
  at: number,
): Promise<HTMLElement | undefined> => {
  const drawn = (): HTMLElement | undefined =>
    chat.renderRoot
      ?.querySelector<HTMLElement>(`[part="turn"][data-index="${at}"]`)
      ?.querySelector<HTMLElement>(':scope > *') ?? undefined
  if (!drawn()) {
    const { virtualize } = chat as unknown as Chat
    virtualize.reveal(at)
    virtualize.measure()
    chat.requestUpdate()
    await chat.updateComplete
  }
  return drawn()
}
