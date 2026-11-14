import { Appearance } from 'react-native'
import { askWith } from './appearance-ask'

/* **Light and dark, as the sandbox's color mode has them**: the gallery
   follows the phone until you pick one. React Native's own override sets the
   app's appearance, so the header, the status bar, and every token follow
   it. */

/** An appearance, or `unspecified` for the phone's. */
export type Choice = 'dark' | 'light' | 'unspecified'

const CHOICES: readonly { readonly label: string; readonly value: Choice }[] = [
  { label: 'Follow the phone', value: 'unspecified' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

let chosen: Choice = 'unspecified'

/** The appearance picked last, for as long as the app runs. */
export const currentChoice = (): Choice => chosen

/** What a choice says, as its row shows it. */
export const said = (choice: Choice): string =>
  choice === 'unspecified' ? 'Follows the phone' : choice === 'light' ? 'Light' : 'Dark'

/** Asks which appearance to use, as the platform asks, and applies it. */
export const askAppearance = (then: (choice: Choice) => void): void => {
  const apply = (value: Choice) => {
    chosen = value
    Appearance.setColorScheme(value)
    then(value)
  }
  askWith(CHOICES, apply)
}
