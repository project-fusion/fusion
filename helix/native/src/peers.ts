/**
 * The packages the native components need, checked before anything else in
 * this package's entry runs.
 *
 * **Each one is an optional peer of `@fusion.dev/helix`, which ships the
 * components.** That package serves the web too, where none of them belongs,
 * so an app on the web installs none of them. Where any is missing, this
 * throws one error that names every missing one and the command that installs
 * them.
 *
 * **Each `require` sits inside a `try` of its own.** Metro bundles that as an
 * optional dependency (`allowOptionalDependencies` is on by default), as
 * `expo-haptics` is loaded, and a bundler finds a dependency only by a name
 * written out. The runtime still imports these packages at the top of its
 * modules, and Metro refuses to bundle a missing one with an error of its own
 * that names the first. This error is the one a runtime that loads each module
 * as it runs it reports, as Jest does.
 */

/** Whether each peer resolves, by the peer's name. */
export type Probes = Readonly<Record<string, () => boolean>>

/** Each required peer, in the order an error names them. */
export const PROBES: Probes = {
  react: () => {
    try {
      require('react')
      return true
    } catch {
      return false
    }
  },
  'react-native': () => {
    try {
      require('react-native')
      return true
    } catch {
      return false
    }
  },
  'react-native-gesture-handler': () => {
    try {
      require('react-native-gesture-handler')
      return true
    } catch {
      return false
    }
  },
  'react-native-reanimated': () => {
    try {
      require('react-native-reanimated')
      return true
    } catch {
      return false
    }
  },
  'react-native-worklets': () => {
    try {
      require('react-native-worklets')
      return true
    } catch {
      return false
    }
  },
}

/** The peers `probes` cannot find, in the order they are listed. */
export const missingPeers = (probes: Probes = PROBES): readonly string[] =>
  Object.entries(probes)
    .filter(([, resolves]) => !resolves())
    .map(([name]) => name)

/** `names` as a sentence lists them: `a`, `a and b`, or `a, b, and c`. */
const listed = (names: readonly string[]): string =>
  names.length < 3
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')}, and ${names.at(-1) ?? ''}`

/** The error that names each missing peer and the command that installs them. */
export const peerError = (names: readonly string[]): Error =>
  new Error(
    `Helix's native components need ${listed(names)}, which the app does not install. ` +
      `In an Expo app, install ${names.length === 1 ? 'it' : 'them'} with ` +
      `\`npx expo install ${names.join(' ')}\`.`,
  )

/**
 * Throws the error that names every peer `probes` cannot find, where any is
 * missing.
 */
export const requirePeers = (probes: Probes = PROBES): void => {
  const missing = missingPeers(probes)
  if (missing.length > 0) {
    throw peerError(missing)
  }
}

requirePeers()
