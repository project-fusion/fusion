/**
 * What has been typed, carried in the URL fragment.
 *
 * The query string already says which example you are looking at, so a link
 * reproduced the page and never the edit: type into the sandbox, copy the
 * address, open it, and you were handed the example's own file back. The whole
 * point of an editable preview is the thing you changed.
 *
 * **The fragment rather than the query**, for two reasons that both matter. It
 * is not sent to the server, so a document a reader is part way through writing
 * does not end up in a request log or a referrer header. And the query is the
 * *share format* described in `url-state.ts`, six short keys a person can read
 * and hand-edit; a base64 blob in the middle of it would make every sandbox link
 * unreadable whether or not anything had been typed.
 *
 * **Only when it differs from the example.** An untouched sandbox writes no
 * fragment at all, so the common link stays short and a reader who opens one and
 * changes nothing shares exactly what they were given.
 */

/** Keys, short because they sit in an address someone may look at. */
const MARKUP = 'm'
const CSS = 'c'

/** What the fragment can carry, either half independently. */
export interface SandboxHashState {
  /** The stylesheet, or null where it is the example's own. */
  css: string | null
  /** The markup, or null where it is the example's own. */
  markup: string | null
}

/**
 * UTF-8 into base64url.
 *
 * `btoa` takes bytes, not characters, and throws on anything past U+00FF, so a
 * single curly quote in an example was enough to lose the whole fragment.
 * `TextEncoder` first, then the byte-wise conversion `btoa` is actually for.
 *
 * And base64url rather than base64: `+` and `/` are legal in a fragment but `+`
 * is decoded as a space by enough tooling to be a real hazard, and `=` padding
 * is noise in an address bar. All three are put back on the way in.
 */
const encode = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * And back, returning null on anything that does not decode.
 *
 * A fragment is the most hand-editable part of a URL and the easiest to
 * truncate, so a bad one has to read as "no edit" rather than as a broken page.
 * Same reasoning as `oneOf` in `url-state.ts`.
 */
const decode = (raw: string): string | null => {
  try {
    const padded = raw.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '='))
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return null
  }
}

/** Reads whatever a fragment carries, and nothing where it carries nothing. */
export const readHashState = (hash: string): SandboxHashState => {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const markup = params.get(MARKUP)
  const css = params.get(CSS)
  return {
    css: css === null ? null : decode(css),
    markup: markup === null ? null : decode(markup),
  }
}

/**
 * The fragment for an edit, empty where there is none.
 *
 * Each half is compared against what the example ships and omitted when they
 * match, so switching syntax and back, or opening a stylesheet without touching
 * it, leaves the address alone.
 */
export const writeHashState = (state: SandboxHashState, original: SandboxHashState): string => {
  const params = new URLSearchParams()
  if (state.markup !== null && state.markup !== original.markup) {
    params.set(MARKUP, encode(state.markup))
  }
  if (state.css !== null && state.css !== original.css) {
    params.set(CSS, encode(state.css))
  }
  const query = params.toString()
  return query ? `#${query}` : ''
}
