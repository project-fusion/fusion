/**
 * The safe area, heard from `react-native-safe-area-context` where the app
 * installs it, and kept by the environment capability.
 */

import { NO_INSETS } from '@fusion.dev/helix-core/capabilities/environment'
import type { Insets } from '@fusion.dev/helix-core/capabilities/types'
import { type ComponentType, type ReactNode, useLayoutEffect } from 'react'
import { Dimensions } from 'react-native'
import type * as SafeAreaContext from 'react-native-safe-area-context'
import { hearInsets } from '../capabilities/environment'

/** The package, loaded at the first draw: `null` where the app does not install it. */
let loaded: typeof SafeAreaContext | null | undefined

/**
 * Loads `react-native-safe-area-context` once.
 *
 * **A `require` inside a `try`**, which Metro bundles as an optional
 * dependency, as `expo-haptics` is loaded, so an app without the package
 * builds and its safe area reads 0 on each edge.
 */
const load = (): typeof SafeAreaContext | null => {
  if (loaded === undefined) {
    try {
      loaded = require('react-native-safe-area-context') as typeof SafeAreaContext
    } catch {
      loaded = null
    }
  }
  return loaded
}

/** Lets a spec load the package again, or stand in for one that is missing. */
export const resetSafeArea = (next?: typeof SafeAreaContext | null): void => {
  loaded = next
}

/** Tells the environment each safe area the provider above it measures. */
const heardFrom =
  (useInsets: () => Insets): ComponentType =>
  () => {
    const { bottom, left, right, top } = useInsets()
    useLayoutEffect(() => {
      hearInsets({ bottom, left, right, top })
    }, [bottom, left, right, top])
    return null
  }

/** The listener for the package loaded, made once. */
let listener: { readonly Listen: ComponentType; readonly from: typeof SafeAreaContext } | undefined

/**
 * What `HelixRoot` draws its app in: a safe-area provider whose insets the
 * environment capability reads, where the app installs
 * `react-native-safe-area-context`. **A provider inside another measures the
 * same window**, so an app with a provider of its own reads the same insets.
 * Without the package, the app is drawn as it is.
 */
export const SafeArea = ({ children }: { readonly children?: ReactNode }) => {
  const context = load()
  if (context === null) {
    return children
  }
  if (listener?.from !== context) {
    listener = { from: context, Listen: heardFrom(context.useSafeAreaInsets) }
  }
  const { Listen } = listener
  const { SafeAreaProvider, initialWindowMetrics } = context
  /* **Drawn at once, with no safe area, where the package has no first
     measure**, as in Jest: a provider with no metrics draws nothing until its
     native view measures one. */
  const { height, width } = Dimensions.get('window')
  const metrics = initialWindowMetrics ?? {
    frame: { height, width, x: 0, y: 0 },
    insets: NO_INSETS,
  }
  return (
    <SafeAreaProvider initialMetrics={metrics}>
      <Listen />
      {children}
    </SafeAreaProvider>
  )
}
