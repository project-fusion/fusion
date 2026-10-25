/* Serves the export as the site does, from what `dist/host.json` says: the
   files under the base address, the manifest for the platform Expo Go names
   at the base address itself, with the headers a manifest needs, and the
   answer at `/message`. Every request is logged, one line each.

   `MESSAGE` replaces the answer at `/message`, to measure another one:
   `404`, `410`, `200` with no body, `close` to accept the socket and close it,
   `hold` to accept it and keep it open, and `hang` to answer nothing.

   bun run export -- --base http://127.0.0.1:8093/helix/app
   bun scripts/serve.ts */
import { join, normalize } from 'node:path'
import type { MessageAnswer } from './host'

const dist = join(import.meta.dir, '..', 'dist')
const host = (await Bun.file(join(dist, 'host.json')).json()) as {
  base: string
  manifestHeaders: Record<string, string>
  message: { answer: MessageAnswer; path: string }
  platform: { header: string; manifests: Record<string, string> }
}
const base = new URL(host.base)
const prefix = base.pathname.replace(/\/$/, '')
const answer = (process.env.MESSAGE ?? host.message.answer) as MessageAnswer
const started = Date.now()

const log = (request: Request, path: string, said: string) => {
  const seconds = ((Date.now() - started) / 1000).toFixed(1).padStart(7)
  const platform = request.headers.get(host.platform.header) ?? '-'
  console.log(`${seconds}s ${request.method} ${path} ${platform} ${said}`)
}

/** A file of the export under the base address, or nothing outside it. */
const fileAt = (path: string) => {
  const within = normalize(path.slice(prefix.length)).replace(/^\/+/, '')
  return within === '' || within.startsWith('..') ? undefined : Bun.file(join(dist, within))
}

const server = Bun.serve<MessageAnswer>({
  async fetch(request, server) {
    const path = new URL(request.url).pathname
    if (path === host.message.path) {
      if (answer === 'close' || answer === 'hold') {
        log(request, path, `upgrade ${answer}`)
        return server.upgrade(request, { data: answer })
          ? undefined
          : new Response('Expected a WebSocket upgrade', { status: 426 })
      }
      log(request, path, answer)
      if (answer === 'hang') {
        return new Promise<Response>(() => undefined)
      }
      return new Response(null, { status: Number(answer) })
    }
    if (path === prefix || path === `${prefix}/`) {
      const name = host.platform.manifests[request.headers.get(host.platform.header) ?? '']
      if (name === undefined) {
        log(request, path, '404 no platform')
        return new Response(`Open exp://${base.host}${prefix} in Expo Go.\n`, { status: 404 })
      }
      log(request, path, name)
      return new Response(Bun.file(join(dist, name)), { headers: host.manifestHeaders })
    }
    const name = Object.values(host.platform.manifests).find((one) => path === `${prefix}/${one}`)
    if (name !== undefined) {
      log(request, path, name)
      return new Response(Bun.file(join(dist, name)), { headers: host.manifestHeaders })
    }
    const file = path.startsWith(`${prefix}/`) ? fileAt(path) : undefined
    if (file === undefined || !(await file.exists())) {
      log(request, path, '404')
      return new Response('Not found', { status: 404 })
    }
    log(request, path, '200')
    return new Response(file)
  },
  hostname: base.hostname,
  idleTimeout: 0,
  port: Number(base.port || 80),
  websocket: {
    idleTimeout: 960,
    message: () => undefined,
    open: (socket) => {
      if (socket.data === 'close') {
        socket.close(1000, 'No development server')
      }
    },
  },
})

console.log(`Serving ${dist} at ${server.url}, /message answers ${answer}`)
console.log(`Open exp://${base.host}${prefix} in Expo Go.`)
