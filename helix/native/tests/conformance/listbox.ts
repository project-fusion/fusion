import type { Left } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { formOf } from './forms'
import { itemsIn, pressOf, type Run } from './views'

/*
 * A list of options, as the React Native half of the conformance suite reads what
 * a screen reader hears of each option a filter leaves showing.
 */

/** What each option showing says. */
export const listboxLeft = (run: Run): Pick<Left, 'focused' | 'options'> => {
  if (formOf(run.scenario.setup.tag).api?.listbox === undefined) {
    return {}
  }
  /* The web keeps focus on the list, and a phone's option holds it for the keys. */
  return {
    focused: null,
    options: itemsIn(run).flatMap((item) => {
      if (screen.queryByText(item.words) === null) {
        return []
      }
      const state = pressOf(item.words).props.accessibilityState ?? {}
      return [
        {
          disabled: state.disabled === true,
          selected: state.selected === true,
          value: item.value,
        },
      ]
    }),
  }
}
