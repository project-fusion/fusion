import { createContext, useContext } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { heardTouch } from '../capabilities/focus-visible'
import { installNativeCapabilities } from '../capabilities/install'
import { HelixTheme, type HelixThemeProps } from '../theme/helix-theme'
import { type KeyboardHandling, LayerHostView } from './layers'
import { SafeArea } from './safe-area'

/** Whether the capabilities are installed, which happens once for the app. */
let installed = false

/** Whether a `HelixRoot` is drawn around, which only the root itself provides. */
const AroundContext = createContext(false)

/**
 * Whether a `HelixRoot` is drawn around the component that calls it, so code
 * that draws a root of its own, such as a router's layout, draws none inside
 * another.
 */
export const useInsideHelixRoot = (): boolean => useContext(AroundContext)

/** What `HelixRoot` takes: a theme, how layers meet the keyboard, and a style for the view that fills the app. */
export interface HelixRootProps extends HelixThemeProps {
  /**
   * How the layers Helix draws meet the software keyboard. Under `avoid`,
   * the default, a sheet, a dialog, or a popover stands above the keyboard
   * while it shows. Under `none`, the layers stand where they would without
   * it, for an app that moves its own content out of the keyboard's way.
   */
  readonly keyboard?: KeyboardHandling
  readonly style?: StyleProp<ViewStyle>
}

/**
 * What an app wraps itself in once, at its root: the native capabilities,
 * Gesture Handler's root view, which every drag needs above it, the theme,
 * a safe-area provider where the app installs
 * `react-native-safe-area-context`, whose insets the environment reads, and
 * the layer host, which draws every dialog, popover, menu, and tooltip over
 * the app.
 *
 * **The capabilities are installed as the root first draws**, before anything
 * inside it runs an effect: an element's layout effects run before the
 * root's own, and one that measures or focuses needs the native
 * implementation by then. They are installed once, however many times the
 * root draws, and an app that sets one of its own sets it after.
 *
 * **The layer host is inside Gesture Handler's root view and the theme**, so
 * a drag works inside a layer, and what a layer draws carries the theme and
 * the sets of the element that opens it.
 */
export const HelixRoot = ({ children, keyboard, style, ...theme }: HelixRootProps) => {
  if (!installed) {
    installed = true
    installNativeCapabilities()
  }
  return (
    <GestureHandlerRootView onTouchStartCapture={heardTouch} style={[{ flex: 1 }, style]}>
      <SafeArea>
        <HelixTheme {...theme}>
          <LayerHostView {...(keyboard === undefined ? {} : { keyboard })}>
            <AroundContext.Provider value={true}>{children}</AroundContext.Provider>
          </LayerHostView>
        </HelixTheme>
      </SafeArea>
    </GestureHandlerRootView>
  )
}
