/**
 * The page's half of a relay that fetches a frame's own files for it.
 *
 * **A sandboxed frame cannot always load its own files.** It has an opaque
 * origin, so every request it makes is cross-site. Where the site sits behind
 * a login, such as a Vercel preview, the cookie that proves the login is not
 * sent on a cross-site request, and the frame's script, its stylesheet, its
 * fonts, and its models come back as the login page. The page around the frame
 * is on the site's own origin and sends the cookie, so the frame asks it.
 *
 * **What the frame can ask for is narrow, and the page decides it.** A path
 * is fetched only where it resolves to the page's own origin, under one of the
 * prefixes the page named, in plain characters, with a `GET` that follows no
 * redirect, and the answer is passed on only when it is a script, a
 * stylesheet, a font, a model, or an image under the size limit. An example in
 * the frame is untrusted, and with this it can read only what the site already
 * serves to anyone under those prefixes.
 */

/** A file the frame asks the page to fetch for it. */
export interface PreviewFetch {
  /** Whether the frame wants the body as text, for a script or a stylesheet, or as bytes. */
  as: 'bytes' | 'text'
  /** What the answer carries back, so the frame can match it to the request. */
  id: string
  /** The file, as a path on the site, such as `/sandbox/frame.js?v=1a2b3c4d`. */
  path: string
  type: 'helix-preview-fetch'
}

/** The page's answer to a `PreviewFetch`. */
export interface PreviewFetched {
  /** The file's body, where the page fetched it. */
  body?: ArrayBuffer | string
  /** The file's content type, where the page fetched it. */
  contentType?: string
  /** The `id` of the request it answers. */
  id: string
  /** Whether the page fetched the file. */
  ok: boolean
  type: 'helix-preview-fetched'
}

/** The most bytes the page passes on for one file: four times the largest the site serves. */
export const RELAY_LIMIT = 8 * 1024 * 1024

/** The most requests one frame may have open at once. */
export const RELAY_OPEN = 16

/** A path the page will fetch, once resolved: plain characters, and no step up. */
const PATH = /^\/[A-Za-z0-9._~/-]*$/

/** A query the page will pass on, such as the build stamp `?v=1a2b3c4d`. */
const QUERY = /^(?:\?[A-Za-z0-9=&._~-]*)?$/

/** The kinds of file the page passes on. Never a document or data. */
const KINDS =
  /^(?:text\/css|text\/javascript|application\/javascript|application\/x-javascript|font\/[a-z0-9.+-]+|model\/[a-z0-9.+-]+|image\/(?:png|jpeg|webp|avif|gif)|application\/octet-stream)(?:\s*;|$)/

/** Whether `data` is a request the frame sent, in the shape the page reads. */
export const isFetch = (data: unknown): data is PreviewFetch => {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const { as, id, path, type } = data as Partial<PreviewFetch>
  return (
    type === 'helix-preview-fetch' &&
    (as === 'bytes' || as === 'text') &&
    typeof id === 'string' &&
    id.length > 0 &&
    id.length <= 64 &&
    typeof path === 'string'
  )
}

/**
 * The prefixes a `relay` value names: each a path that starts and ends with a
 * slash, such as `/sandbox/`. Anything else in the value is ignored, so `/`
 * alone, which would be the whole site, is not a prefix.
 */
export const relayPrefixes = (value: string): string[] =>
  value
    .split(/\s+/)
    .filter((prefix) => PATH.test(prefix) && prefix.length > 2 && prefix.endsWith('/'))
    .filter((prefix) => !prefix.split('/').some((part) => part === '.' || part === '..'))

/**
 * The address the page fetches for `path`, or undefined where it may not.
 *
 * `path` is resolved against `base`, the frame document's address, so a
 * relative path the frame wrote means what it meant there. The answer has to
 * be on `origin`, the page's own, under one of `prefixes`, with no user, no
 * password, and no fragment. The resolved path is held to plain characters, so
 * an encoded slash or dot, which a server may decode after this check, is
 * refused rather than trusted.
 */
export const relayAddress = (
  path: string,
  base: string,
  origin: string,
  prefixes: readonly string[],
): URL | undefined => {
  if (path.length === 0 || path.length > 1024 || prefixes.length === 0) {
    return undefined
  }
  let url: URL
  try {
    url = new URL(path, base)
  } catch {
    return undefined
  }
  if (
    url.origin !== origin ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    !PATH.test(url.pathname) ||
    !QUERY.test(url.search) ||
    url.pathname.split('/').some((part) => part === '.' || part === '..')
  ) {
    return undefined
  }
  return prefixes.some((prefix) => url.pathname.startsWith(prefix)) ? url : undefined
}

/**
 * Fetches a file the frame asked for, from an address `relayAddress` allowed,
 * and returns it, or undefined where it is not one to pass on.
 *
 * Same origin only, with the page's cookies, as a `GET` that follows no
 * redirect: a login page redirecting is a refusal, never a file. The body is
 * passed on only for a script, a stylesheet, a font, a model, or an image, and
 * only under `RELAY_LIMIT`, counted on what arrived as well as on what the
 * headers claimed.
 */
export const relayFetch = async (
  url: URL,
  as: PreviewFetch['as'],
): Promise<Pick<PreviewFetched, 'body' | 'contentType'> | undefined> => {
  let response: Response
  try {
    response = await fetch(url, {
      cache: 'default',
      credentials: 'same-origin',
      method: 'GET',
      mode: 'same-origin',
      redirect: 'error',
      referrerPolicy: 'same-origin',
    })
  } catch {
    return undefined
  }
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()
  const claimed = Number(response.headers.get('content-length') ?? '0')
  if (!response.ok || !KINDS.test(contentType) || claimed > RELAY_LIMIT) {
    return undefined
  }
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > RELAY_LIMIT) {
    return undefined
  }
  return {
    body: as === 'text' ? new TextDecoder().decode(bytes) : bytes,
    contentType,
  }
}
