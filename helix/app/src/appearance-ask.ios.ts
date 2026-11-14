import { ActionSheetIOS } from 'react-native'
import type { Asked } from './appearance-ask'

/** Asks which of these to use in the iOS action sheet, and hands back the one picked. */
export const askWith = <Value>(
  choices: readonly Asked<Value>[],
  apply: (value: Value) => void,
): void => {
  ActionSheetIOS.showActionSheetWithOptions(
    {
      cancelButtonIndex: choices.length,
      options: [...choices.map((choice) => choice.label), 'Cancel'],
      title: 'Appearance',
    },
    (index) => {
      const picked = choices[index]
      if (picked !== undefined) {
        apply(picked.value)
      }
    },
  )
}
