import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { HOST_STATES } from './forms'
import type { Run, View } from './views'

/*
 * Chat, as the React Native half of the conformance suite finds its presses and
 * reads what a screen reader hears of each turn.
 */

/** Whether the setup draws a chat or a composer. */
export const chats = (setup: Setup): boolean =>
  setup.tag === 'helix-chat' || setup.tag === 'helix-chat-composer'

/** What a setup draws with its turns as data. */
export const chatProps = (setup: Setup): Readonly<Record<string, unknown>> =>
  setup.turns === undefined ? {} : { turns: setup.turns }

const viewsWhere = (test: (node: View) => boolean): View[] =>
  (screen.root?.queryAll((node: View) => node.type === 'View' && test(node), {
    includeHiddenElements: true,
  } as never) ?? []) as unknown as View[]

const wordsIn = (node: View): string =>
  (node.queryAll((inner: View) => inner.type === 'Text') as unknown as View[])
    .map((inner) => {
      const held = inner.props.children
      return typeof held === 'string' ? held : Array.isArray(held) ? held.join('') : ''
    })
    .join('')

/** The press of a part, by what it is named or what it says. */
export const chatPress = (part: string): View | undefined => {
  const buttons = viewsWhere((node) => node.props.accessibilityRole === 'button')
  switch (part) {
    case 'send':
      return buttons.find((node) => /^(Send|Stop)$/.test(String(node.props.accessibilityLabel)))
    case 'retry':
      return buttons.find((node) => wordsIn(node) === 'Try again')
    default:
      return undefined
  }
}

/** Whether a word stands anywhere drawn. */
const said = (words: string): boolean =>
  (screen.queryAllByText(words, { includeHiddenElements: true }) as unknown as View[]).length > 0

/** What a chat says of its turns, and what a composer's button is called. */
export const chatLeft = (run: Run): Pick<Left, 'chat'> => {
  const { setup } = run.scenario
  if (!chats(setup)) {
    return {}
  }
  if (setup.tag === 'helix-chat-composer') {
    const named = viewsWhere((node) => node.props.accessibilityRole === 'button').map((node) =>
      String(node.props.accessibilityLabel ?? ''),
    )
    return { chat: { lines: [], named: [], send: named[0] ?? '', status: '' } }
  }
  const turns = viewsWhere(
    (node) =>
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityRole !== 'button' &&
      node.props.accessibilityRole !== 'image' &&
      node.props.accessibilityLabel !== String(setup.props?.label ?? ''),
  )
  const states = HOST_STATES.get(setup.tag)
  const lines = (['Sending', 'Not sent'] as const).filter(said)
  const status = [
    String(states?.typingWords ?? states?.['typing-words'] ?? ''),
    states?.historyShown === true || states?.['history-shown'] === true
      ? String(setup.props?.['history-text'] ?? 'Loading earlier messages')
      : '',
    setup.props?.loading === true ? 'Loading' : '',
    states?.blank === true ? 'Nothing to show' : '',
  ].filter((one) => one !== '')
  return {
    chat: {
      lines: [...lines],
      named: turns.map((node) => String(node.props.accessibilityLabel)),
      send: '',
      status: status.join(' '),
    },
  }
}
