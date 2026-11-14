import { upgradeWebSocket } from '@vercel/functions'

/**
 * **The socket Expo Go opens beside the Helix gallery, accepted and kept
 * open.** Expo Go takes the host its bundle came from for a development
 * server and opens a WebSocket at `/message` on it, at the root of the host.
 * Any other answer, a socket that closes included, brings another attempt two
 * seconds later. Measured on October 11, 2026, in Expo Go 58.0.2 on iOS 27,
 * over two minutes: 56 requests for a 404 and 1 for a socket kept open. The
 * gallery is at `/helix/app`, from `scripts/copy-helix-app.mjs`.
 *
 * **Held until the function's time limit**, when Vercel closes it and Expo Go
 * opens another. Nothing is sent and what arrives is dropped: the gallery is
 * a static export, and there is no development server to reload it.
 *
 * `upgradeWebSocket` answers on Vercel alone. `next start` and `next dev`
 * close the upgrade before it reaches this route, and a request without one
 * is told to upgrade.
 */
export const dynamic = 'force-dynamic'

/** The longest a Pro function runs without the extended-duration beta. */
export const maxDuration = 800

export function GET(request: Request) {
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    return new Response('Open a WebSocket here.\n', {
      headers: { 'cache-control': 'no-store', upgrade: 'websocket' },
      status: 426,
    })
  }
  return upgradeWebSocket(
    (socket) =>
      new Promise<void>((closed) => {
        socket.on('close', () => closed())
        socket.on('error', () => closed())
      }),
    { maxPayload: 64 * 1024 },
  )
}
