import type { Left } from '@fusion.dev/helix-testing/conformance'
import { formOf } from './forms'
import { itemsIn, pressOf, type Run } from './views'

/*
 * A tree, as the React Native half of the conformance suite reads what a screen
 * reader hears of each row it can reach.
 */

/** Whether a view stands inside a closed branch, which a screen reader does not reach. */
const hidden = (view: ReturnType<typeof pressOf>): boolean => {
  for (let up = view.parent; up !== null; up = up.parent) {
    if (up.props.accessibilityElementsHidden === true) {
      return true
    }
  }
  return false
}

/** What a phone says of a row's level and place, read back from its value. */
const PLACE = /Level (\d+), (\d+) of (\d+)/

/** What each row a reader can reach says. */
export const treeLeft = (run: Run): Pick<Left, 'open' | 'tree'> => {
  if (formOf(run.scenario.setup.tag).api?.treeRoot === undefined) {
    return {}
  }
  return {
    open: itemsIn(run)
      .filter((item) => pressOf(item.words).props.accessibilityState?.expanded === true)
      .map((item) => item.value),
    tree: itemsIn(run).flatMap((item) => {
      const row = pressOf(item.words)
      if (hidden(row)) {
        return []
      }
      const state = row.props.accessibilityState ?? {}
      const place = PLACE.exec(String(row.props.accessibilityValue?.text ?? ''))
      return [
        {
          checked: state.checked ?? null,
          disabled: state.disabled === true,
          expanded: state.expanded ?? null,
          level: Number(place?.[1] ?? 0),
          position: Number(place?.[2] ?? 0),
          selected: state.selected ?? null,
          size: Number(place?.[3] ?? 0),
          value: item.value,
        },
      ]
    }),
  }
}
