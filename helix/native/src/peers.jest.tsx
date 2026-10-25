import { describe, expect, test } from '@jest/globals'
import { missingPeers, PROBES, peerError, requirePeers } from './peers'

/** Probes for `names`, each resolving where `found` holds it. */
const probes = (names: readonly string[], found: readonly string[]) =>
  Object.fromEntries(names.map((name) => [name, () => found.includes(name)]))

describe('requirePeers', () => {
  test('finds every peer installed for the specs', () => {
    expect(missingPeers(PROBES)).toEqual([])
    expect(() => requirePeers()).not.toThrow()
  })

  test('names every missing peer in one error, in the order they are listed', () => {
    const listed = probes(['react', 'react-native-reanimated', 'react-native-worklets'], ['react'])
    expect(missingPeers(listed)).toEqual(['react-native-reanimated', 'react-native-worklets'])
    expect(() => requirePeers(listed)).toThrow(
      "Helix's native components need react-native-reanimated and react-native-worklets, " +
        'which the app does not install. In an Expo app, install them with ' +
        '`npx expo install react-native-reanimated react-native-worklets`.',
    )
  })

  test('lists one, two, or more peers as a sentence does', () => {
    expect(peerError(['a']).message).toContain('need a, which')
    expect(peerError(['a']).message).toContain('install it with `npx expo install a`')
    expect(peerError(['a', 'b', 'c']).message).toContain('need a, b, and c, which')
  })
})
