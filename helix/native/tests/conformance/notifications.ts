import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { formOf, HOST_STATES } from './forms'
import { rowNode } from './inspector'
import type { Run, View } from './views'

/*
 * A feed of notifications, as the React Native half of the conformance suite finds
 * its rows and its presses, and reads what a screen reader hears of each.
 */

/** Whether the setup draws a feed. */
export const feeds = (setup: Setup): boolean =>
  formOf(setup.tag).api?.notificationsRoot !== undefined

/** The views drawn, in order, that `test` holds of. */
const viewsWhere = (test: (node: View) => boolean): View[] =>
  (screen.root?.queryAll((node: View) => node.type === 'View' && test(node)) ??
    []) as unknown as View[]

/** Each row's words, as its label box is named. */
export const feedRows = (): View[] =>
  (screen.root?.queryAll(
    (node: View) =>
      typeof node.type === 'string' &&
      node.props.accessibilityRole === 'text' &&
      node.props.accessible === true,
  ) ?? []) as unknown as View[]

/** The press of a part of the feed, a row, or a group, by what it is named or holds. */
export const feedPress = (part: string, row: number | undefined): View | undefined => {
  const named = (words: RegExp) =>
    viewsWhere(
      (node) =>
        node.props.accessibilityRole === 'button' &&
        words.test(String(node.props.accessibilityLabel ?? '')),
    )
  switch (part) {
    case 'dismiss':
      return named(/^Dismiss/)[row ?? 0]
    case 'trigger':
      return viewsWhere(
        (node) =>
          node.props.accessibilityRole === 'button' &&
          node.props.accessibilityState?.expanded !== undefined,
      )[0]
    default:
      return viewsWhere((node) => node.props.accessibilityRole === 'button').find(
        (node) => wordsIn(node) === (part === 'more' ? 'Load more' : 'Mark all as read'),
      )
  }
}

/** The words a view draws. */
const wordsIn = (node: View): string =>
  (node.queryAll((inner: View) => inner.type === 'Text') as unknown as View[])
    .map((inner) => String(inner.props.children ?? ''))
    .join('')

/** The box a row at `at` takes focus on, as the keys capability hears it. */
export const feedFocus = (run: Run, at: number): unknown => rowNode(run, feedRows()[at])

/** What the feed says of its rows, its lines, and its presses. */
export const feedLeft = (run: Run): Pick<Left, 'feed'> => {
  const { setup } = run.scenario
  if (!feeds(setup)) {
    return {}
  }
  const states = HOST_STATES.get(setup.tag)
  const rows = feedRows().map((row) => String(row.props.accessibilityLabel).replace(/\s/g, ''))
  const focused = run.focus.focused()
  const at = feedRows().findIndex((row) => rowNode(run, row) === focused)
  const button = (words: string) =>
    viewsWhere((node) => node.props.accessibilityRole === 'button').some(
      (node) => wordsIn(node) === words,
    )
  const grouped = setup.children?.some(
    (child) => typeof child !== 'string' && child.tag === 'helix-notification-group',
  )
  const counts = grouped ? HOST_STATES.get('helix-notification-group')?.['count-words'] : undefined
  const status = [
    states?.['error-shown'] === true ? states?.['error-words'] : undefined,
    states?.['error-shown'] !== true && states?.['loading-shown'] === true
      ? setup.props?.['loading-text']
      : undefined,
    states?.blank === true ? setup.props?.['empty-text'] : undefined,
  ].find((one) => one !== undefined)
  return {
    feed: {
      count: counts === undefined ? null : String(counts),
      focused: focused === null || at < 0 ? null : at,
      live: String(states?.said ?? ''),
      marksAll: button('Mark all as read'),
      more: button('Load more'),
      rows,
      status: String(status ?? ''),
    },
  }
}
