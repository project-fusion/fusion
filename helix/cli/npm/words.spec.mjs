import { describe, expect, test } from 'bun:test'
import { allowed, unanswered, unloadable } from './visual/words.mjs'

describe('a config the runtime cannot read', () => {
  const unknown = Object.assign(new Error('Unknown file extension ".ts" for /a/visual.config.ts'), {
    code: 'ERR_UNKNOWN_FILE_EXTENSION',
  })

  test('names the Node version and the file to write instead', () => {
    const said = unloadable('/a/visual.config.ts', unknown, 'v20.20.2')
    expect(said).toContain('Node v20.20.2')
    expect(said).toContain('Node 22.18')
    expect(said).toContain('visual.config.mjs')
  })

  test('says only what went wrong for any other failure', () => {
    expect(unloadable('/a/visual.config.ts', new Error('a syntax error'), 'v26.0.0')).toBe(
      'a syntax error',
    )
    expect(unloadable('/a/visual.config.xyz', unknown, 'v26.0.0')).toBe(unknown.message)
  })
})

describe("a page's answer", () => {
  test('an error status is no page to picture', () => {
    expect(unanswered(500, undefined, 'http://a/')).toContain('answered 500 at http://a/')
    expect(unanswered(404, null, 'http://a/')).toContain('`{ path, status: 404 }`')
  })

  test('a success, a redirect, and a revalidated page are', () => {
    expect(unanswered(200, undefined, 'http://a/')).toBeUndefined()
    expect(unanswered(304, undefined, 'http://a/')).toBeUndefined()
    expect(unanswered(undefined, undefined, 'http://a/')).toBeUndefined()
  })

  test('a route that names its status is held to it', () => {
    expect(unanswered(404, 404, 'http://a/gone')).toBeUndefined()
    expect(unanswered(200, 404, 'http://a/gone')).toContain('its route names 404')
  })
})

describe('the allowed hosts', () => {
  test('match a host exactly, or the hosts under a domain', () => {
    expect(allowed('tiles.example.com', ['tiles.example.com'])).toBe(true)
    expect(allowed('a.tiles.example.com', ['tiles.example.com'])).toBe(false)
    expect(allowed('a.example.com', ['*.example.com'])).toBe(true)
    expect(allowed('example.com', ['*.example.com'])).toBe(false)
    expect(allowed('badexample.com', ['*.example.com'])).toBe(false)
    expect(allowed('example.com', [])).toBe(false)
  })
})
