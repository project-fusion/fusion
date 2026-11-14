import { el, type PropValue, type Scenario, type Setup } from '../format.js'

/*
 * The scenarios of Chat. The record says what a screen reader calls each turn, the
 * line under it, what the status band and the transcript say in place of turns,
 * and, for a composer, what its send button is called and what its field holds.
 */

const TURNS = [
  { author: 'them', authorLabel: 'Ada', key: 'a', text: 'How can I help?' },
  { author: 'me', key: 'b', state: 'sending', text: 'The deploy is stuck' },
  { author: 'Grace', key: 'c', text: 'Looking now' },
  { author: 'them', key: 'd', text: 'Done' },
]

const turn = (words: string, props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-chat-message', props, [words])

const chat = (
  props: Readonly<Record<string, PropValue>> = {},
  children: readonly (Setup | string)[] = [],
): Setup => el('helix-chat', { label: 'Support', ...props }, children)

const composer = (props: Readonly<Record<string, PropValue>> = {}): Setup =>
  el('helix-chat-composer', { label: 'Message', ...props })

/** A press that lands on nothing, which changes nothing and reads what stands. */
const READ = { kind: 'press' as const, row: 99 }
const press = (name: string) => ({ kind: 'press' as const, part: name })
const refuse = (event: string) => ({ event, kind: 'refuse' as const })
const type = (text: string) => ({ kind: 'type' as const, text })

/** Chat: turns both ways, what stands in their place, a retry, and a composer's send. */
export const CHAT: readonly Scenario[] = [
  {
    family: 'chat',
    intents: [READ],
    name: 'each turn from data is named by its author',
    setup: { ...chat(), turns: TURNS },
  },
  {
    family: 'chat',
    intents: [READ],
    name: 'each turn passed in is named by its author, and says its state',
    setup: chat({}, [
      turn('Hello', { author: 'them', 'author-label': 'Ada' }),
      turn('Hi', { author: 'me', state: 'sending' }),
      turn('Nobody named', { author: 'them' }),
    ]),
  },
  {
    family: 'chat',
    intents: [READ],
    name: 'the words a chat names its turns with reach them',
    setup: chat({ 'me-label': 'Du', 'turn-label': 'Nachricht' }, [
      turn('Hello', { author: 'me' }),
      turn('Hi', { author: 'them' }),
    ]),
  },
  {
    family: 'chat',
    intents: [READ],
    name: 'an empty chat says so',
    setup: chat(),
  },
  {
    family: 'chat',
    intents: [READ],
    name: 'a chat that is loading says so',
    setup: chat({ loading: true }),
  },
  {
    family: 'chat',
    intents: [READ],
    name: 'older turns loading say so',
    setup: chat({ history: 'loading' }, [turn('Hello', { author: 'them' })]),
  },
  {
    family: 'chat',
    intents: [READ],
    name: '`typing` says who is typing',
    setup: chat({ typing: 'Ada' }, [turn('Hello', { author: 'them' })]),
  },
  {
    family: 'chat',
    intents: [press('retry')],
    name: 'a retry sends the turn again, and it is sending',
    setup: chat({}, [turn('Where is my order?', { author: 'me', state: 'failed' })]),
  },
  {
    family: 'chat',
    intents: [refuse('send'), press('retry')],
    name: 'a refused retry leaves the failure',
    setup: chat({}, [turn('Where is my order?', { author: 'me', state: 'failed' })]),
  },
  {
    family: 'chat',
    intents: [type('Hello'), press('send')],
    name: 'a send carries the draft, trimmed, and clears the field',
    setup: composer(),
  },
  {
    family: 'chat',
    intents: [refuse('send'), type('Hello'), press('send')],
    name: 'a refused send keeps the draft',
    setup: composer(),
  },
  {
    family: 'chat',
    intents: [press('send')],
    name: 'an empty draft sends nothing',
    setup: composer(),
  },
  {
    family: 'chat',
    intents: [press('send')],
    name: 'a required empty draft sends nothing and shows itself wrong',
    setup: composer({ required: true }),
  },
  {
    family: 'chat',
    intents: [press('send')],
    name: 'while busy the button stops and is named so',
    setup: composer({ busy: true }),
  },
  {
    family: 'chat',
    intents: [type('Hello'), press('send')],
    name: '`queue` sends while busy',
    setup: composer({ busy: true, queue: true }),
  },
  {
    family: 'chat',
    intents: [type('Hello'), press('send')],
    name: '`send-disabled` sends nothing',
    setup: composer({ 'send-disabled': true }),
  },
  {
    family: 'chat',
    intents: [READ],
    name: 'a `value` written stands in the field',
    setup: composer({ value: 'Draft' }),
  },
]
