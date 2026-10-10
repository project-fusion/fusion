import { afterEach, describe, expect, test } from 'bun:test'
import { isFetch, RELAY_LIMIT, relayAddress, relayFetch, relayPrefixes } from './relay.js'

const ORIGIN = 'https://preview.example.dev'
const BASE = `${ORIGIN}/sandbox/frame.html`
const PREFIXES = ['/sandbox/', '/fonts/', '/media/models/']

const allowed = (path: string): string | undefined =>
  relayAddress(path, BASE, ORIGIN, PREFIXES)?.href

describe('relayPrefixes', () => {
  test('takes paths that start and end with a slash', () => {
    expect(relayPrefixes(' /sandbox/  /fonts/\n/media/models/ ')).toEqual(PREFIXES)
  })

  test('refuses the whole site, a path without a closing slash, and a step up', () => {
    expect(relayPrefixes('/ /api /a/../ /./ https://x.dev/sandbox/ /%2e%2e/')).toEqual([])
  })
})

describe('relayAddress', () => {
  test('allows a file under a prefix, relative or absolute, with its build stamp', () => {
    expect(allowed('./frame.js?v=1a2b3c4d')).toBe(`${ORIGIN}/sandbox/frame.js?v=1a2b3c4d`)
    expect(allowed('/fonts/geist-latin.woff2')).toBe(`${ORIGIN}/fonts/geist-latin.woff2`)
    expect(allowed(`${ORIGIN}/media/models/brain.glb`)).toBe(`${ORIGIN}/media/models/brain.glb`)
  })

  test('refuses another origin, however it is written', () => {
    expect(allowed('https://evil.example/sandbox/frame.js')).toBeUndefined()
    expect(allowed('//evil.example/sandbox/frame.js')).toBeUndefined()
    expect(allowed('http://preview.example.dev/sandbox/frame.js')).toBeUndefined()
    expect(allowed('https://preview.example.dev:8443/sandbox/frame.js')).toBeUndefined()
  })

  test('refuses a path outside the prefixes, including one that climbs out of them', () => {
    expect(allowed('/api/session')).toBeUndefined()
    expect(allowed('/sandbox/../api/session')).toBeUndefined()
    expect(allowed('../api/session')).toBeUndefined()
    expect(allowed('/sandbox/%2e%2e/api/session')).toBeUndefined()
    expect(allowed('/sandboxed/frame.js')).toBeUndefined()
  })

  test('refuses an encoded slash or backslash a server might decode after the check', () => {
    expect(allowed('/sandbox/..%2fapi/session')).toBeUndefined()
    expect(allowed('/sandbox/%5c..%5capi')).toBeUndefined()
    expect(allowed('/sandbox\\..\\api')).toBeUndefined()
  })

  test('refuses credentials, a fragment, an odd query, and other schemes', () => {
    expect(allowed(`https://user:pass@preview.example.dev/sandbox/frame.js`)).toBeUndefined()
    expect(allowed('/sandbox/frame.js#x')).toBeUndefined()
    expect(allowed('/sandbox/frame.js?next=https://evil.example')).toBeUndefined()
    expect(allowed('javascript:alert(1)')).toBeUndefined()
    expect(allowed('data:text/javascript,alert(1)')).toBeUndefined()
  })

  test('refuses everything where no prefix was named, and an empty or long path', () => {
    expect(relayAddress('/sandbox/frame.js', BASE, ORIGIN, [])).toBeUndefined()
    expect(allowed('')).toBeUndefined()
    expect(allowed(`/sandbox/${'a'.repeat(1100)}`)).toBeUndefined()
  })
})

describe('isFetch', () => {
  test('reads a request in the shape the frame sends', () => {
    expect(
      isFetch({
        as: 'text',
        id: 'relay-1',
        path: '/sandbox/frame.js',
        type: 'helix-preview-fetch',
      }),
    ).toBe(true)
  })

  test('refuses anything else', () => {
    expect(isFetch({ as: 'json', id: 'a', path: '/x', type: 'helix-preview-fetch' })).toBe(false)
    expect(isFetch({ as: 'text', id: '', path: '/x', type: 'helix-preview-fetch' })).toBe(false)
    expect(
      isFetch({ as: 'text', id: 'a'.repeat(65), path: '/x', type: 'helix-preview-fetch' }),
    ).toBe(false)
    expect(isFetch({ as: 'text', id: 'a', path: 1, type: 'helix-preview-fetch' })).toBe(false)
    expect(isFetch(null)).toBe(false)
  })
})

describe('relayFetch', () => {
  const original = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = original
  })

  const serve = (body: BodyInit, headers: Record<string, string>, status = 200): RequestInit[] => {
    const seen: RequestInit[] = []
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      seen.push(init ?? {})
      return new Response(body, { headers, status })
    }) as unknown as typeof fetch
    return seen
  }

  const url = new URL(`${ORIGIN}/sandbox/frame.js`)

  test('fetches same origin with the page’s cookies, following no redirect', async () => {
    const seen = serve('console.log(1)', { 'content-type': 'text/javascript; charset=utf-8' })
    expect(await relayFetch(url, 'text')).toEqual({
      body: 'console.log(1)',
      contentType: 'text/javascript; charset=utf-8',
    })
    expect(seen[0]).toMatchObject({
      credentials: 'same-origin',
      method: 'GET',
      mode: 'same-origin',
      redirect: 'error',
    })
  })

  test('passes bytes on as bytes', async () => {
    serve(new Uint8Array([1, 2, 3]), { 'content-type': 'model/gltf-binary' })
    const fetched = await relayFetch(url, 'bytes')
    expect(new Uint8Array(fetched?.body as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]))
  })

  test('refuses a document, data, a failed answer, and a redirect', async () => {
    serve('<html>Log in</html>', { 'content-type': 'text/html' })
    expect(await relayFetch(url, 'text')).toBeUndefined()
    serve('{"token":"x"}', { 'content-type': 'application/json' })
    expect(await relayFetch(url, 'text')).toBeUndefined()
    serve('nope', { 'content-type': 'text/javascript' }, 401)
    expect(await relayFetch(url, 'text')).toBeUndefined()
    globalThis.fetch = (async () => {
      throw new TypeError('redirect')
    }) as unknown as typeof fetch
    expect(await relayFetch(url, 'text')).toBeUndefined()
  })

  test('refuses a file over the limit, by its header or by what arrived', async () => {
    serve('x', { 'content-length': String(RELAY_LIMIT + 1), 'content-type': 'text/css' })
    expect(await relayFetch(url, 'text')).toBeUndefined()
    serve(new Uint8Array(RELAY_LIMIT + 1), { 'content-type': 'font/woff2' })
    expect(await relayFetch(url, 'bytes')).toBeUndefined()
  })
})
