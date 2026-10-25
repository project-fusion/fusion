/**
 * The view Android's blur reads: expo-blur blurs on Android only what a
 * `BlurTargetView` holds, so the layer host draws the app inside one, and a
 * blur drawn over the app names it.
 */
import {
  type ComponentType,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
} from 'react'
import { Platform, StyleSheet } from 'react-native'

/** What expo-blur's view takes, as far as a backdrop uses it. */
export interface BlurProps {
  readonly blurMethod?: 'dimezisBlurViewSdk31Plus'
  readonly blurTarget?: RefObject<unknown>
  readonly intensity: number
  readonly pointerEvents: 'none'
  readonly style: Readonly<Record<string, unknown>>
  readonly tint: 'default'
}

/** What a `BlurTargetView` takes. */
interface TargetProps {
  readonly children?: ReactNode
  readonly ref: RefObject<unknown>
  readonly style: Readonly<Record<string, unknown>>
}

/** expo-blur's two views, as far as Helix draws them. */
export interface Blurs {
  readonly BlurTargetView: ComponentType<TargetProps>
  readonly BlurView: ComponentType<BlurProps>
}

/** expo-blur, loaded at the first use: `null` where the app does not install it. */
let loaded: Blurs | null | undefined

/**
 * Loads `expo-blur` once. **A `require` inside a `try`**, which Metro bundles
 * as an optional dependency, so an app without the package builds and its
 * parts draw no blur.
 */
export const blurs = (): Blurs | null => {
  if (loaded === undefined) {
    try {
      loaded = require('expo-blur') as Blurs
    } catch {
      loaded = null
    }
  }
  return loaded
}

/**
 * The app's blur target, where Android draws one, and whether what reads it
 * is drawn inside the target. **A blur drawn inside the target it reads
 * draws nothing**, since the BlurView library refuses to blur a view that
 * holds it.
 */
export interface BlurTargetOf {
  readonly inside: boolean
  readonly target: RefObject<unknown>
}

const BlurTargetContext = createContext<BlurTargetOf | undefined>(undefined)

/** The app's blur target and where the reader stands to it, or `undefined` where there is none. */
export const useBlurTarget = (): BlurTargetOf | undefined => useContext(BlurTargetContext)

/** Whether the app draws a blur target: on Android, where the app installs expo-blur. */
export const drawsTarget = (): boolean => Platform.OS === 'android' && blurs() !== null

/**
 * Draws the app inside a `BlurTargetView` on Android, where expo-blur is
 * installed, with `target` its ref, and the app alone elsewhere.
 */
export const BlurTarget = ({
  children,
  target,
}: {
  readonly children?: ReactNode
  readonly target: RefObject<unknown>
}) => {
  const found = drawsTarget() ? blurs() : null
  if (found === null) {
    return <>{children}</>
  }
  return (
    <found.BlurTargetView ref={target} style={styles.fill}>
      <BlurTargetContext.Provider value={{ inside: true, target }}>
        {children}
      </BlurTargetContext.Provider>
    </found.BlurTargetView>
  )
}

/** Gives what is drawn over the app, the layers, the app's blur target to read. */
export const OverTarget = ({
  children,
  target,
}: {
  readonly children?: ReactNode
  readonly target: RefObject<unknown>
}) =>
  drawsTarget() ? (
    <BlurTargetContext.Provider value={{ inside: false, target }}>
      {children}
    </BlurTargetContext.Provider>
  ) : (
    children
  )

const styles = StyleSheet.create({ fill: { flex: 1 } })
