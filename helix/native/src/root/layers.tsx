/**
 * The layer host: one view over the app, inside Gesture Handler's root view,
 * that draws every layer a Helix element opens, as the web's top layer
 * draws a dialog and a popover over the page.
 *
 * **React Native's `Modal` is not used.** A modal is a window of its own,
 * where Gesture Handler's root view, the theme, and the toolbar's contexts do
 * not reach, so each layer is drawn here, in the app's own window, and
 * carries the contexts it needs from where its element is drawn.
 *
 * **A modal layer holds the reader.** While one is open, the app under the
 * host and every layer opened before it are hidden from screen readers, as
 * `showModal()` makes the page inert: `accessibilityElementsHidden` on iOS
 * and `importantForAccessibility` on Android. The modal layer's own view is
 * `accessibilityViewIsModal`, and its scrim takes every touch outside it.
 *
 * **A decorative layer stands over what is in the page, and under every other
 * layer**, as a tour's spotlight dims the app and a drawer that is no modal,
 * which on the web is `dialog.show()` in the page's own stacking, and stands
 * under a menu it points into, which on the web is in the top layer. It takes no
 * touch, no key, and nothing a screen reader reaches.
 *
 * **A guide stands above every layer but a notice**, as a tour's stop stands
 * over a menu or a drawer its tour opens to point into, whichever opened
 * first, so its controls stay pressable over the scrim of what it points at.
 *
 * **A notice stands above every other layer**, as a toast's stack does: it
 * is drawn after the rest whenever it opened, and stays read and pressable
 * while a modal layer holds the reader. It takes a close request only while
 * no other layer is open.
 *
 * **The software keyboard.** Under `keyboard="avoid"`, which `HelixRoot`
 * takes by default, the host ends above the keyboard while it shows, so a
 * sheet or a centered dialog stands above it, and a layer placed against an
 * anchor has the room above it to land in. Under `"none"`, the host fills
 * the window whatever the keyboard does, for an app that moves its own
 * content out of the keyboard's way.
 *
 * **On Android the app is drawn inside expo-blur's `BlurTargetView`**, where
 * the app installs expo-blur, and the layers beside it, so a blur a layer
 * draws blurs the app under it, as on iOS and the web.
 */
import { environment, NO_INSETS } from '@fusion.dev/helix-core/capabilities/environment'
import type { Insets } from '@fusion.dev/helix-core/capabilities/types'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { type GestureResponderEvent, StyleSheet, View } from 'react-native'
import { BlurTarget, OverTarget } from '../render/blur-target'
import { type KeyboardHandling, useKeyboard } from './keyboard'

export type { KeyboardHandling } from './keyboard'

/** One layer the host draws, as its element hands it over. */
export interface HostedLayer {
  /** What it draws, with the contexts it carries provided again. */
  readonly content: ReactNode
  /** Whether it holds the reader, hiding the app and the layers under it. */
  readonly modal: boolean
  /** Whether it is a look alone, drawn over what is in the page and never the top one. */
  readonly decorative?: boolean
  /** Whether it stands in the page's own stacking on the web: open, not modal, and placed against nothing. */
  readonly inPage?: boolean
  /** Whether it is a guide, drawn above every layer but a notice and the top one while it is open. */
  readonly guide?: boolean
  /** Whether it is a notice, drawn above every other layer and never hidden by one. */
  readonly notice?: boolean
  /** Hears a touch that starts on the app outside every layer, in window points. */
  readonly outside?: (x: number, y: number) => void
}

/** A view that measures itself in the window, as React Native's host instances do. */
interface Measures {
  readonly measureInWindow?: (done: (x: number, y: number) => void) => void
}

/** A point in the window, in points. */
export interface Origin {
  readonly x: number
  readonly y: number
}

/** What the host offers the layers its app opens. */
export interface LayerHost {
  /** The safe area at each edge, in points, and none at the bottom while the keyboard covers it. */
  readonly insets: Insets
  /** How tall the software keyboard stands over the host, in points: 0 while it is hidden or under `"none"`. */
  readonly keyboard: number
  /** Where the host stands in the window, which an anchor measured in the window is moved by. */
  readonly origin: Origin
  /** Draws a layer, or draws it anew, under the key it was opened with. */
  readonly place: (key: object, layer: HostedLayer) => void
  /** Takes a layer away. */
  readonly remove: (key: object) => void
  /**
   * Whether the layer under `key` takes the keys and a phone's back: the
   * last one opened, and a notice only while it is the one layer open. A
   * decorative layer never does.
   */
  readonly top: (key: object) => boolean
}

const LayerHostContext = createContext<LayerHost | undefined>(undefined)

/** The host layers are drawn in, or `undefined` outside `HelixRoot`. */
export const useLayerHost = (): LayerHost | undefined => useContext(LayerHostContext)

/** Hidden from screen readers on both platforms, with what it holds. */
const UNREAD = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const

/** The safe area the environment capability last heard, the same object while it holds. */
let insetsSeen: Insets = NO_INSETS
const insetsNow = (): Insets => {
  const now = environment().read().insets
  const same = (['bottom', 'left', 'right', 'top'] as const).every(
    (edge) => now[edge] === insetsSeen[edge],
  )
  if (!same) {
    insetsSeen = now
  }
  return insetsSeen
}
const hearInsets = (changed: () => void) => environment().observe(() => changed())

/**
 * The layers in the order they are drawn: each layer in the page's stacking,
 * then each decorative layer, then each other layer, then each guide, then each
 * notice, each in the order it opened.
 */
export const drawnOrder = <
  Layer extends Pick<HostedLayer, 'decorative' | 'guide' | 'inPage' | 'notice'>,
>(
  layers: readonly (readonly [object, Layer])[],
): (readonly [object, Layer])[] => [
  ...layers.filter(([, layer]) => layer.inPage === true),
  ...layers.filter(([, layer]) => layer.decorative === true),
  ...layers.filter(
    ([, layer]) =>
      layer.notice !== true &&
      layer.decorative !== true &&
      layer.guide !== true &&
      layer.inPage !== true,
  ),
  ...layers.filter(([, layer]) => layer.guide === true),
  ...layers.filter(([, layer]) => layer.notice === true),
]

/** What `LayerHostView` takes: the app, and how the host meets the keyboard. */
export interface LayerHostProps {
  readonly children?: ReactNode
  readonly keyboard?: KeyboardHandling
}

/**
 * Draws the app, and over it each layer its elements open, in the order they
 * opened, with the notices above. `HelixRoot` draws it inside Gesture
 * Handler's root view.
 */
export const LayerHostView = ({ children, keyboard = 'avoid' }: LayerHostProps) => {
  const [layers, setLayers] = useState<ReadonlyMap<object, HostedLayer>>(new Map())
  const order = useRef<object[]>([])
  const notices = useRef(new WeakSet<object>())
  const looks = useRef(new WeakSet<object>())
  const guides = useRef(new WeakSet<object>())
  /* Each layer's own number, which keys its view while layers come and go. */
  const ids = useRef(new WeakMap<object, number>())
  const next = useRef(0)
  const height = useKeyboard(keyboard)
  const safe = useSyncExternalStore(hearInsets, insetsNow, insetsNow)
  const [origin, setOrigin] = useState<Origin>({ x: 0, y: 0 })
  const app = useRef<unknown>(null)
  /* The view Android's blur reads, which holds the app and no layer. */
  const target = useRef<unknown>(null)
  const keep = useCallback((node: unknown) => {
    app.current = node
  }, [])
  const place = useCallback((key: object, layer: HostedLayer) => {
    if (!order.current.includes(key)) {
      order.current = [...order.current, key]
    }
    if (layer.notice === true) {
      notices.current.add(key)
    }
    if (layer.decorative === true) {
      looks.current.add(key)
    }
    if (layer.guide === true) {
      guides.current.add(key)
    }
    if (!ids.current.has(key)) {
      ids.current.set(key, next.current)
      next.current += 1
    }
    setLayers((now) => new Map(now).set(key, layer))
  }, [])
  const remove = useCallback((key: object) => {
    order.current = order.current.filter((one) => one !== key)
    setLayers((now) => {
      const next = new Map(now)
      next.delete(key)
      return next
    })
  }, [])
  const top = useCallback((key: object) => {
    const drawn = order.current.filter((one) => !looks.current.has(one))
    const others = drawn.filter((one) => !notices.current.has(one))
    const standing = others.filter((one) => guides.current.has(one))
    const ranked = standing.length > 0 ? standing : others
    return (ranked.length === 0 ? drawn : ranked).at(-1) === key
  }, [])
  const insets = useMemo<Insets>(() => (height > 0 ? { ...safe, bottom: 0 } : safe), [height, safe])
  const host = useMemo<LayerHost>(
    () => ({ insets, keyboard: height, origin, place, remove, top }),
    [height, insets, origin, place, remove, top],
  )
  /* Where the app, and the host over it, stands in the window. */
  const measure = useCallback(() => {
    ;(app.current as Measures | null)?.measureInWindow?.((x, y) => {
      setOrigin((now) => (now.x === x && now.y === y ? now : { x, y }))
    })
  }, [])
  const drawn = drawnOrder([...layers.entries()])
  /* Everything under the last modal layer is hidden from a screen reader,
     and no notice is. */
  const holding = drawn.reduce((last, [, layer], at) => (layer.modal ? at : last), -1)
  /* A touch that starts on the app, outside every layer, reaches each open
     layer that a press outside dismisses, and goes on to what it landed on. */
  const touched = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent
    for (const [, layer] of drawn) {
      layer.outside?.(pageX, pageY)
    }
  }
  return (
    <LayerHostContext.Provider value={host}>
      <View
        onLayout={measure}
        onTouchStartCapture={touched}
        ref={keep}
        style={styles.app}
        {...(holding >= 0 ? UNREAD : {})}
      >
        <BlurTarget target={target}>{children}</BlurTarget>
      </View>
      {drawn.length === 0 ? null : (
        <View pointerEvents="box-none" style={[styles.layers, { bottom: height }]}>
          <OverTarget target={target}>
            {drawn.map(([key, layer], at) => (
              <View
                key={ids.current.get(key)}
                pointerEvents="box-none"
                style={StyleSheet.absoluteFill}
                {...(at < holding && layer.notice !== true ? UNREAD : {})}
              >
                {layer.content}
              </View>
            ))}
          </OverTarget>
        </View>
      )}
    </LayerHostContext.Provider>
  )
}

const styles = StyleSheet.create({
  app: { flex: 1 },
  layers: { left: 0, position: 'absolute', right: 0, top: 0 },
})
