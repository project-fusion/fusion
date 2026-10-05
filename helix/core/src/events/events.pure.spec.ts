import { describe, expect, test } from 'bun:test'
import { HelixRejectEvent, helixEventNames } from './events.js'

describe('the event a file field sends for the files it refused', () => {
  test('is helix-reject, bubbling out of the shadow root, and cannot be canceled', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' })
    const event = new HelixRejectEvent({ files: [{ file, reason: 'type' }] })
    expect(event.type).toBe('helix-reject')
    expect(event.bubbles).toBe(true)
    expect(event.composed).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(event.detail.files[0]?.file).toBe(file)
    expect(event).toBeInstanceOf(CustomEvent)
  })

  test('is a name this library dispatches', () => {
    expect(helixEventNames.has('helix-reject')).toBe(true)
  })
})
