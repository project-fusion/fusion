import { afterEach, describe, expect, test } from 'bun:test'
import { fakeRenderer } from './fake.js'
import { renderer, setRenderer } from './index.js'
import { serverRenderer } from './server.js'
import { webRenderer } from './web.js'

afterEach(() => {
  setRenderer(serverRenderer)
})

describe('renderer', () => {
  test('is the server implementation until one is set, which draws nothing', () => {
    expect(renderer()).toBe(serverRenderer)
    expect(renderer().available('map')).toBe(false)
    expect(renderer().available('terminal')).toBe(false)
  })

  test('calls the implementation set last, for each kind apart', () => {
    const fake = fakeRenderer(['map'])
    setRenderer(fake)
    expect(renderer().available('map')).toBe(true)
    expect(renderer().available('terminal')).toBe(false)
    fake.draws.delete('map')
    expect(renderer().available('map')).toBe(false)
  })

  test("on the web, answers yes for every kind, which the page's own renderer draws", () => {
    expect(webRenderer.available('map')).toBe(true)
    expect(webRenderer.available('terminal')).toBe(true)
  })
})
