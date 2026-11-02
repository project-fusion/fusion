/* What a host serving the export answers beyond its files, which
   `manifests.ts` writes into `dist/host.json` for the host to read, and which
   `serve.ts` does locally as the site does. */

/** The answers `/message` can give, by name. */
export type MessageAnswer = '200' | '404' | '410' | 'close' | 'hang' | 'hold'

export const HOST = {
  /**
   * The headers on a manifest. **Without the protocol headers Expo Go reads
   * the manifest as a legacy one and refuses it.** The manifest at the base
   * address depends on a request header, so a cache keys it by that header.
   */
  manifestHeaders: {
    'cache-control': 'no-cache',
    'content-type': 'application/expo+json',
    'expo-protocol-version': '0',
    'expo-sfv-version': '0',
    vary: 'expo-platform',
  },
  /**
   * **What `/message` answers: a WebSocket, accepted and kept open.** Expo Go
   * opens one to the development server it takes the bundle's host for, at
   * the root of that host, and opens it again two seconds after any other
   * answer, a socket that closes included. Each attempt also opens one more
   * empty connection than the last, so the connections a minute grow without
   * end. Measured on October 11, 2026 in Expo Go 58.0.2 on iOS 27, over two
   * minutes: 56 requests for 404, 410, 200, and a socket closed at once, 26
   * for no answer at all, and 1 for a socket kept open.
   */
  message: { answer: 'hold' as MessageAnswer, path: '/message' },
  /**
   * The base address, with or without its final slash, answers with the
   * manifest for the platform Expo Go names in the `expo-platform` header.
   * Each manifest is also at its own name under the base address.
   */
  platform: {
    header: 'expo-platform',
    manifests: { android: 'android.json', ios: 'ios.json' },
  },
}
