import type { Keys } from '@fusion.dev/helix-core/capabilities/keys'
import type { KeyPress } from '@fusion.dev/helix-core/capabilities/types'
import type * as Expo from 'expo'
import { findNodeHandle, type HostInstance } from 'react-native'
import { heardKey } from './focus-visible'

/** A key pressed on a hardware keyboard, as the native module hands it over. */
export interface NativePress {
  readonly alt: boolean
  readonly control: boolean
  /** The press's number, which `claim` and `answer` name it by. */
  readonly id: number
  /** The key's value, as the web's `KeyboardEvent.key` names it. */
  readonly key: string
  readonly meta: boolean
  /**
   * The tag of the view with focus, then the tag of each view it is inside,
   * nearest first. Empty where no view has focus.
   */
  readonly path: readonly number[]
  /** Whether the key is held down and repeating. */
  readonly repeat: boolean
  readonly shift: boolean
}

/**
 * The native module `HelixKeys`, as `helix/native/ios` and
 * `helix/native/android` define it.
 *
 * **The module holds the platform's main thread while JavaScript decides a
 * press.** It sends the press, then waits for `claim` and `answer`, and only
 * then lets the platform act on the key or drops it. It sends a press only
 * where a watched tag is in the press's path, or where something watches
 * anywhere, so a key nothing listens for never waits.
 */
export interface KeysModule {
  readonly addListener: (
    event: 'press',
    listener: (press: NativePress) => void,
  ) => { readonly remove: () => void }
  /** Says whether a claimed press is taken, which ends the module's wait. */
  readonly answer: (id: number, taken: boolean) => void
  /**
   * Answers `true` where the module still holds the press, and `false` where it
   * waited too long and gave the press to the platform.
   */
  readonly claim: (id: number) => boolean
  /**
   * Holds focus on the view with `tag`, so the presses that follow start
   * there, and has another first responder give up the keyboard. The focus
   * capability calls it. A module built before it was added does not have it.
   */
  readonly focus?: (tag: number) => void
  /**
   * The tag of the view the module holds focus on, or `null` where none
   * does, as after the iPad's focus system moves focus to an item outside it.
   */
  readonly focused?: () => number | null
  /** Stops sending the presses made while the view with `tag`, or a view inside it, has focus. */
  readonly unwatch: (tag: number) => void
  /** Sends the presses made while the view with `tag`, or a view inside it, has focus. */
  readonly watch: (tag: number) => void
  /** Sends every press, or stops sending the ones no watched tag asks for. */
  readonly watchAnywhere: (watching: boolean) => void
}

/** One call to `listen` or `listenAnywhere`, kept whole, so the same function listening twice is two listeners. */
interface Listener {
  readonly heard: (press: KeyPress) => boolean
}

/** A press without `claimed`, which each listener hears as the listeners before it left it. */
type Unclaimed = Omit<KeyPress, 'claimed'>

/** Hears nothing: the keys where no native module delivers them, as in Expo Go and Jest. */
const silent: Keys<HostInstance> = {
  listen: () => () => undefined,
  listenAnywhere: () => () => undefined,
}

/**
 * Hands `press` to each listener in `on`, and answers whether it is taken once
 * they have heard it. A listener hears it claimed where a listener before it
 * took it, as a later `keydown` listener on the web reads `defaultPrevented`.
 * Each one is looked for again before it hears the press, so one stopped by an
 * earlier listener hears nothing.
 */
const hear = (on: ReadonlySet<Listener>, press: Unclaimed, taken: boolean): boolean => {
  let now = taken
  for (const one of [...on]) {
    if (on.has(one) && one.heard({ ...press, claimed: now })) {
      now = true
    }
  }
  return now
}

/** The tag of the view React Native draws for `node`, or `null` where it draws none. */
export const tagOf = (node: HostInstance): number | null => {
  try {
    return findNodeHandle(node) ?? null
  } catch {
    return null
  }
}

/**
 * The keys capability over `module`: hearing nothing where it is `null`.
 *
 * **A listener on a node hears a press made while the node, or a view inside
 * it, has focus.** On iOS that is the first responder, then the view the
 * focus capability last moved focus to, then the focus system's focused
 * item. On Android it is a text input with focus, then the view the focus
 * capability last moved focus to, then the focused view. Nearer listeners
 * hear it first, as a `keydown` bubbles on the web. **A listener anywhere hears every press
 * first**, and a press it takes reaches no listener on a node. There is one
 * window, so a listener anywhere hears a press whatever node it named.
 *
 * **A press the module gave up waiting for reaches no listener**, since the
 * platform has already acted on it.
 */
export const keysThrough = (
  module: KeysModule | null,
  tagFor: (node: HostInstance) => number | null = tagOf,
): Keys<HostInstance> => {
  if (module === null) {
    return silent
  }
  const tagged = new Map<number, Set<Listener>>()
  const anywhere = new Set<Listener>()
  let subscription: { readonly remove: () => void } | undefined

  const route = (pressed: NativePress): boolean => {
    const { alt, control, key, meta, repeat, shift } = pressed
    const press: Unclaimed = { alt, control, key, meta, repeat, shift }
    if (hear(anywhere, press, false)) {
      return true
    }
    let taken = false
    for (const tag of pressed.path) {
      const on = tagged.get(tag)
      if (on !== undefined) {
        taken = hear(on, press, taken)
      }
    }
    return taken
  }

  /* The answer is sent whatever a listener does, since the module holds the
     platform's main thread until it arrives. */
  const pressed = (press: NativePress): void => {
    if (!module.claim(press.id)) {
      return
    }
    let taken = false
    try {
      taken = route(press)
    } finally {
      module.answer(press.id, taken)
      /* After the listeners, so a ring is drawn where the key left focus. */
      heardKey()
    }
  }

  /* Subscribed before the first watch and unsubscribed after the last
     unwatch, so the module never sends a press nothing will claim. */
  const subscribed = (): void => {
    const listening = tagged.size > 0 || anywhere.size > 0
    if (listening && subscription === undefined) {
      subscription = module.addListener('press', pressed)
    } else if (!listening && subscription !== undefined) {
      subscription.remove()
      subscription = undefined
    }
  }

  return {
    listen: (node, heard) => {
      const tag = tagFor(node)
      if (tag === null) {
        return () => undefined
      }
      const entry: Listener = { heard }
      const on = tagged.get(tag) ?? new Set<Listener>()
      tagged.set(tag, on)
      on.add(entry)
      subscribed()
      if (on.size === 1) {
        module.watch(tag)
      }
      return () => {
        if (!on.delete(entry)) {
          return
        }
        if (on.size === 0) {
          tagged.delete(tag)
          module.unwatch(tag)
        }
        subscribed()
      }
    },
    listenAnywhere: (_node, heard) => {
      const entry: Listener = { heard }
      anywhere.add(entry)
      subscribed()
      if (anywhere.size === 1) {
        module.watchAnywhere(true)
      }
      return () => {
        if (!anywhere.delete(entry)) {
          return
        }
        if (anywhere.size === 0) {
          module.watchAnywhere(false)
        }
        subscribed()
      }
    },
  }
}

/** The native module once looked for, `null` where the app has none, and `undefined` before. */
let found: KeysModule | null | undefined

/**
 * The native module `HelixKeys`, loaded once through `expo`, or `null` where
 * the app has none. The keys and focus capabilities both use it.
 *
 * **A `require` inside a `try`**, which Metro bundles as an optional
 * dependency, so an app without `expo` builds and hears no keys. Expo Go and
 * Jest have `expo` and not the module, and `requireOptionalNativeModule`
 * answers `null` there without an error.
 */
export const keysModule = (): KeysModule | null => {
  if (found === undefined) {
    try {
      const expo = require('expo') as typeof Expo
      found = expo.requireOptionalNativeModule<KeysModule>('HelixKeys')
    } catch {
      found = null
    }
  }
  return found
}

/** The keys over the native module, built at the first listener. */
let loaded: Keys<HostInstance> | undefined

const load = (): Keys<HostInstance> => {
  loaded ??= keysThrough(keysModule())
  return loaded
}

/**
 * Hears the keys of a hardware keyboard on iPad, on iPhone, and on Android,
 * through the native module this package ships.
 *
 * **A development build has the module, and Expo Go does not.** Expo
 * autolinks it into a build made with `npx expo prebuild` or
 * `npx expo run:ios`. Where it is missing, as in Expo Go, each listener hears
 * nothing, without an error.
 */
export const nativeKeys: Keys<HostInstance> = {
  listen: (node, heard) => load().listen(node, heard),
  listenAnywhere: (node, heard) => load().listenAnywhere(node, heard),
}
