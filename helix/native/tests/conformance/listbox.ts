import type { Left } from '@fusion.dev/helix-testing/conformance'
import { screen } from '@testing-library/react-native'
import { formOf, HOST_STATES } from './forms'
import { itemsIn, pressOf, type Run } from './views'

/*
 * A list of options, as the React Native half of the conformance suite reads what
 * a screen reader hears of each option a filter leaves showing.
 */

/** What each option showing says. */
export const listboxLeft = (run: Run): Pick<Left, 'options'> => {
  if (formOf(run.scenario.setup.tag).api?.listbox === undefined) {
    return {}
  }
  return {
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

/** What a Select holds, which a closed list does not draw, and focus while its list stands open. */
export const selectLeft = (run: Run): Partial<Pick<Left, 'chosen' | 'focused'>> => {
  const { family, setup } = run.scenario
  if (family !== 'select') {
    return {}
  }
  const states = HOST_STATES.get(setup.tag)
  return {
    chosen: String(states?.chosen ?? '')
      .split('\n')
      .filter(Boolean),
    /* Open, an option holds focus, and the list on the web. Closed, focus can only be on the
       trigger, whose words are an option's, which would name that option. */
    focused: states?.open === true || run.focus.focused() === null ? null : setup.tag,
  }
}
