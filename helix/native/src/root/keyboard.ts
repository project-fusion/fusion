/** The software keyboard's height, as the layer host meets it. */
import { useEffect, useState } from 'react'
import { Keyboard, type KeyboardEvent, Platform } from 'react-native'

/** How the host meets the software keyboard. */
export type KeyboardHandling = 'avoid' | 'none'

/** The keyboard's height while it shows, under `"avoid"`, read from its events. */
export const useKeyboard = (handling: KeyboardHandling): number => {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    if (handling === 'none') {
      setHeight(0)
      return undefined
    }
    /* iOS tells before the keyboard moves, so the layers move with it.
       Android tells once it has, and only that. */
    const ios = Platform.OS === 'ios'
    const shows = Keyboard.addListener(
      ios ? 'keyboardWillShow' : 'keyboardDidShow',
      (event: KeyboardEvent) => setHeight(event.endCoordinates.height),
    )
    const hides = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setHeight(0),
    )
    return () => {
      shows.remove()
      hides.remove()
    }
  }, [handling])
  return height
}
