import { screen } from '@testing-library/react-native'
import type { View } from './views'

/*
 * A press the React Native half finds by the words a screen reader hears of it, as
 * a calendar's day is named by its whole date and its controls by their labels.
 */

/** The press named by these words, where the element draws one. */
export const namedPress = (label: string): View | undefined =>
  screen.queryAllByLabelText(label, { exact: true })[0] as unknown as View | undefined
