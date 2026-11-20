import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import type { Run, View } from './views'

/*
 * A sandbox, as the React Native half of the conformance suite finds its file
 * tabs and reads which is chosen and the source the pane shown holds.
 */

/** Whether the setup draws a sandbox. */
export const sandboxes = (setup: Setup): boolean => setup.tag === 'helix-sandbox'

/** Every view, in order. */
const views = (): View[] =>
  (screen.root?.queryAll((node: View) => node.type === 'View') ?? []) as unknown as View[]

/** The file tabs, which a scenario presses by a row. */
export const sandboxPresses = (): View[] =>
  views().filter((node) => node.props.accessibilityRole === 'tab')

/** The words a node holds, with no spaces. */
const wordsIn = (node: unknown): string => {
  const text = (one: unknown): string => {
    if (typeof one === 'string') {
      return one
    }
    const held = (one as { children?: readonly unknown[] }).children ?? []
    return held.map(text).join('')
  }
  return text(node).replace(/\s/g, '')
}

/** What a sandbox says, as the record holds it. */
export const sandboxLeft = (run: Run): Pick<Left, 'sandbox'> => {
  if (!sandboxes(run.scenario.setup)) {
    return {}
  }
  const source = views().find((node) => node.props.accessibilityValue?.text !== undefined)
  return {
    sandbox: {
      code: String(source?.props.accessibilityValue?.text ?? '').replace(/\s/g, ''),
      tabs: sandboxPresses().map((tab) => ({
        selected: tab.props.accessibilityState?.selected === true,
        words: wordsIn(tab),
      })),
    },
  }
}
