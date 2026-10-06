import { describe, expect, test } from 'bun:test'
import { barOf, saysStatus } from './status.js'

describe('a file’s upload status', () => {
  test('draws a bar held between 0 and 1, one without a measure while under way, and none otherwise', () => {
    expect(barOf({ progress: 0.4 })).toBe(0.4)
    expect(barOf({ progress: 1.7 })).toBe(1)
    expect(barOf({ progress: -1 })).toBe(0)
    expect(barOf({ state: 'uploading' })).toBe('unmeasured')
    expect(barOf({ state: 'done', text: 'Uploaded' })).toBeUndefined()
  })

  test('is said when it finishes or fails with words, once', () => {
    expect(saysStatus({ state: 'done', text: 'Uploaded' }, { state: 'uploading' })).toBe(true)
    expect(saysStatus({ state: 'done', text: 'Uploaded' }, { state: 'done' })).toBe(false)
    expect(saysStatus({ state: 'error' }, undefined)).toBe(false)
    expect(saysStatus({ progress: 0.5, text: 'Half' }, undefined)).toBe(false)
  })
})
