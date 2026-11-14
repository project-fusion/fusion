import { el, type PropValue, type Scenario } from '../format.js'

/*
 * The scenarios of Toast, whose messages each close on their dismiss button
 * or their spent `duration`, sending `dismiss` with their words, which the
 * stack hears after each message and may refuse. Past the stack's
 * `max-visible`, a message waits, and its clock starts once a message before
 * it goes. Each message names itself by a `value` the harnesses know it by,
 * which a message does not read. The clocks run on the fake clock each half
 * sets as the timers capability. A press hands focus on to the message
 * beside it, which the web's synthetic tap, which focuses nothing, does not
 * take, so a press is made on a stack of one.
 */

/** A dismissible message with these words, known by `value`. */
const message = (value: string, words: string, props: Readonly<Record<string, PropValue>> = {}) =>
  el('helix-toast-item', { dismissible: true, value, ...props }, [words])

/** A stack holding these messages. */
const stack = (
  messages: readonly ReturnType<typeof message>[],
  props: Readonly<Record<string, PropValue>> = {},
) => el('helix-toast', props, messages)

/** Toasts: a dismissal, one the stack refuses, a spent duration, one held while away, and a queue. */
export const TOAST: readonly Scenario[] = [
  {
    family: 'toast',
    intents: [{ item: 'saved', kind: 'press', part: 'dismiss' }],
    name: 'a dismissal says the message by its words',
    setup: stack([message('saved', 'Project saved.')]),
  },
  {
    family: 'toast',
    intents: [
      { event: 'dismiss', kind: 'refuse' },
      { item: 'failed', kind: 'press', part: 'dismiss' },
    ],
    name: 'a refused dismissal is sent and refused',
    setup: stack([message('failed', 'Upload failed.')]),
  },
  {
    family: 'toast',
    intents: [
      { kind: 'wait', ms: 4_999 },
      { kind: 'wait', ms: 1 },
    ],
    name: 'a spent duration dismisses the message once it is spent',
    setup: stack([message('saved', 'Project saved.', { duration: 5_000 })]),
  },
  {
    family: 'toast',
    intents: [
      { kind: 'wait', ms: 2_000 },
      { kind: 'hide' },
      { kind: 'wait', ms: 10_000 },
      { kind: 'show' },
      { kind: 'wait', ms: 2_999 },
      { kind: 'wait', ms: 1 },
    ],
    name: 'a duration holds while the page is away, and runs on from what was left',
    setup: stack([message('saved', 'Project saved.', { duration: 5_000 })]),
  },
  {
    family: 'toast',
    intents: [
      { kind: 'wait', ms: 1_000 },
      { kind: 'wait', ms: 999 },
      { kind: 'wait', ms: 1 },
    ],
    name: 'a message past max-visible waits, and its clock starts once the one before it goes',
    setup: stack(
      [
        message('saved', 'Project saved.', { duration: 1_000 }),
        message('uploaded', 'Two files were uploaded.', { duration: 1_000 }),
      ],
      { 'max-visible': 1 },
    ),
  },
]
