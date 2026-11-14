import { Alert } from 'react-native'

/** A choice the ask offers: what it says, and the value it picks. */
export type Asked<Value> = { readonly label: string; readonly value: Value }

/* The iOS sheet stands in `appearance-ask.ios.ts`, which Metro takes on an iPhone. */

/** Asks which of these to use in an alert, and hands back the one picked. */
export const askWith = <Value>(
  choices: readonly Asked<Value>[],
  apply: (value: Value) => void,
): void => {
  Alert.alert(
    'Appearance',
    undefined,
    choices.map((choice) => ({ onPress: () => apply(choice.value), text: choice.label })),
    { cancelable: true },
  )
}
