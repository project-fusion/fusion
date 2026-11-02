import type { Left, Setup } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import type { Run, View } from './views'

/*
 * Pagination, as the React Native half of the conformance suite finds its presses
 * and reads what a screen reader hears of its row.
 */

/** Whether the setup draws a row of pages. */
export const paginates = (setup: Setup): boolean => setup.tag === 'helix-pagination'

const viewsWhere = (test: (node: View) => boolean): View[] =>
  (screen.root?.queryAll((node: View) => node.type === 'View' && test(node), {
    includeHiddenElements: true,
  } as never) ?? []) as unknown as View[]

const buttons = (): View[] => viewsWhere((node) => node.props.accessibilityRole === 'button')

const nameOf = (node: View): string => String(node.props.accessibilityLabel ?? '')

const LABELS: Readonly<Record<string, string>> = {
  first: 'First page',
  last: 'Last page',
  next: 'Next page',
  previous: 'Previous page',
}

/** The press of a step, by the name the row gives it. */
export const paginationPress = (setup: Setup, part: string | undefined): View | undefined => {
  const name = setup.props?.[`${part}-label`] ?? LABELS[part ?? '']
  return buttons().find((node) => nameOf(node) === name)
}

const spent = (node: View): boolean => node.props.accessibilityState?.disabled === true

/** What a screen reader hears of a row: its controls, the page it is on, and the words between. */
export const paginationLeft = (run: Run): Pick<Left, 'pagination'> => {
  if (!paginates(run.scenario.setup)) {
    return {}
  }
  const all = buttons()
  const current = all.find((node) => node.props.accessibilityValue?.text !== undefined)
  const status = screen.root?.queryAll(
    (node: View) => node.type === 'Text' && /^\d+ of \d+$/.test(String(node.props.children)),
    { includeHiddenElements: true } as never,
  )[0] as View | undefined
  return {
    pagination: {
      controls: all.map(nameOf),
      current: current === undefined ? null : nameOf(current),
      spent: all.filter(spent).map(nameOf),
      status: status === undefined ? null : String(status.props.children),
    },
  }
}
