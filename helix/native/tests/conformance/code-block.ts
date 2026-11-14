import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { formOf } from './forms'
import type { Run, View } from './views'

/*
 * A code block, as the React Native half of the conformance suite finds what it
 * presses and reads what a screen reader hears of it.
 */

/** Whether the setup draws a code block. */
export const codeBlocks = (setup: Setup): boolean => formOf(setup.tag).api?.codeBlock !== undefined

/** Whether a view is drawn: a row holds a box for each kind, and hides all but one. */
const shown = (node: View): boolean =>
  (StyleSheet.flatten(node.props.style) as { display?: string } | undefined)?.display !== 'none'

/** Every view drawn, in order. */
const views = (): View[] =>
  (screen.root?.queryAll((node: View) => node.type === 'View' && shown(node)) ??
    []) as unknown as View[]

const isTab = (node: View): boolean => node.props.accessibilityRole === 'tab'

const isWrap = (node: View): boolean => node.props.accessibilityRole === 'togglebutton'

const isFold = (node: View): boolean =>
  node.props.accessibilityState?.expanded !== undefined &&
  node.props.accessibilityElementsHidden !== true

/** The presses a scenario names by a row: tabs, the wrap button, and the folds. */
export const codeBlockPresses = (): View[] =>
  views().filter((node) => isTab(node) || isWrap(node) || isFold(node))

/** The words a view holds, with no spaces. */
const wordsIn = (node: View): string => {
  const text = (one: unknown): string => {
    if (typeof one === 'string') {
      return one
    }
    const held = (one as { children?: readonly unknown[] }).children ?? []
    return held.map(text).join('')
  }
  return text(node).replace(/\s/g, '')
}

/** Every text at the top of its paragraph, of the code a block draws. */
const codeWords = (): string =>
  (
    screen.root?.queryAll(
      (node: View) => typeof (node.props as { onTextLayout?: unknown }).onTextLayout === 'function',
    ) ?? []
  )
    .slice(0, 1)
    .map((node) => wordsIn(node as unknown as View))
    .join('')

/** What a code block says, as the record holds it. */
export const codeBlockLeft = (run: Run): Pick<Left, 'codeBlock'> => {
  if (!codeBlocks(run.scenario.setup)) {
    return {}
  }
  const all = views()
  const copy = all.find(
    (node) =>
      node.props.accessibilityRole === 'button' &&
      /^Copy/.test(String(node.props.accessibilityLabel ?? '')),
  )
  return {
    codeBlock: {
      code: codeWords(),
      copy: String(copy?.props.accessibilityLabel ?? ''),
      folds: all.filter(isFold).map((node) => ({
        expanded: node.props.accessibilityState?.expanded === true,
        words: wordsIn(node),
      })),
      lines: all
        .filter((node) => node.props.accessible === true && isLine(node))
        .map((node) => String(node.props.accessibilityLabel).replace(/\s/g, '')),
      pressed: all.find(isWrap)?.props.accessibilityState?.checked === true,
      tabs: all.filter(isTab).map((node) => ({
        selected: node.props.accessibilityState?.selected === true,
        words: wordsIn(node),
      })),
    },
  }
}

/** A row of a diff, which says its words as its label. */
const isLine = (node: View): boolean =>
  typeof node.props.accessibilityLabel === 'string' &&
  node.props.accessibilityLabel !== '' &&
  node.props.accessibilityRole === undefined &&
  node.props.accessibilityState === undefined
