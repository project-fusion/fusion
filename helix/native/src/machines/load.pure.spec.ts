import { describe, expect, test } from 'bun:test'
import { firstLoad, loadAfter, loadStates } from './load'

describe('the load machine', () => {
  test('starts idle with no source and loading with one', () => {
    expect(firstLoad('')).toBe('idle')
    expect(firstLoad('lake.png')).toBe('loading')
  })

  test('answers once: a picture loads or fails only while it is loading', () => {
    expect(loadAfter('loading', 'load')).toBe('loaded')
    expect(loadAfter('loading', 'error')).toBe('failed')
    expect(loadAfter('loaded', 'error')).toBe('loaded')
    expect(loadAfter('failed', 'load')).toBe('failed')
    expect(loadAfter('idle', 'load')).toBe('idle')
  })

  test('starts over at a new source, and goes idle once it has none', () => {
    expect(loadAfter('loaded', 'source')).toBe('loading')
    expect(loadAfter('failed', 'source')).toBe('loading')
    expect(loadAfter('loading', 'empty')).toBe('idle')
  })

  test("sets the web's states, an idle picture standing in the one empty names", () => {
    expect(loadStates('loading', 'loading')).toEqual({
      error: false,
      loaded: false,
      loading: true,
    })
    expect(loadStates('failed', 'loading')).toEqual({ error: true, loaded: false, loading: false })
    expect(loadStates('idle', 'loading').loading).toBe(true)
    expect(loadStates('idle', 'error').error).toBe(true)
    expect(loadStates('loaded', 'error').loaded).toBe(true)
  })
})
