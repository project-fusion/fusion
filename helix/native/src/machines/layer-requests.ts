/**
 * The close requests a layer hears while it stands open: a phone's back,
 * which Android sends, and Escape from a hardware keyboard, wherever focus
 * is in the app, each while the layer is the last one open. A decorative
 * layer hears neither.
 */
import { keys } from '@fusion.dev/helix-core/capabilities/keys'
import { useEffect } from 'react'
import { BackHandler } from 'react-native'

/** What a layer's close requests read, at one render. */
export interface Requests {
  /** Whether the layer is a look alone, which hears no request. */
  readonly decorative: boolean
  /** Asks to dismiss the layer by a close request, and says whether it took the request. */
  readonly dismiss: (by: 'request') => boolean
  readonly modal: boolean
  /** Whether the layer is a notice, which leaves a key it does not take to what has focus. */
  readonly notice: boolean
  readonly open: boolean
  /** Whether the layer is the last one open, which alone hears a request. */
  readonly top: () => boolean
  /** The layer's own view, which Escape is heard in the window of. */
  readonly view: unknown
}

/** Hears a layer's close requests while it stands open. */
export const useCloseRequests = ({
  decorative,
  dismiss,
  modal,
  notice,
  open,
  top,
  view,
}: Requests): void => {
  /* A phone's back, which Android sends, while the layer is the last one open. */
  useEffect(() => {
    if (!open || decorative) {
      return undefined
    }
    const heard = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!top()) {
        return false
      }
      return dismiss('request') || modal
    })
    return () => heard.remove()
  }, [decorative, dismiss, modal, open, top])
  /* Escape from a hardware keyboard, wherever focus is in the app. */
  useEffect(() => {
    if (!open || decorative || view === null) {
      return undefined
    }
    return keys().listenAnywhere(view, (press) => {
      const plain = !press.alt && !press.control && !press.meta && !press.shift
      if (press.key !== 'Escape' || !plain || !top()) {
        return false
      }
      /* A notice that takes no close request leaves the key to what has
         focus, as a toast's message closes on its own Escape. */
      return dismiss('request') || !notice
    })
  }, [decorative, dismiss, notice, open, top, view])
}
