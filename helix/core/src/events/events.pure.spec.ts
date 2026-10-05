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

describe('the events that carried no class before', () => {
  test('helix-clear and helix-copy-error bubble out of the shadow root and cannot be canceled', async () => {
    const { HelixClearEvent, HelixCopyErrorEvent } = await import('./events.js')
    for (const event of [new HelixClearEvent(), new HelixCopyErrorEvent()]) {
      expect(event.bubbles).toBe(true)
      expect(event.composed).toBe(true)
      expect(event.cancelable).toBe(false)
    }
    expect(new HelixClearEvent().type).toBe('helix-clear')
    expect(new HelixCopyErrorEvent().type).toBe('helix-copy-error')
    expect(helixEventNames.has('helix-clear')).toBe(true)
    expect(helixEventNames.has('helix-copy-error')).toBe(true)
  })

  test('helix-aura-fallback says why the gradient shows', async () => {
    const { HelixAuraFallbackEvent } = await import('./events.js')
    const event = new HelixAuraFallbackEvent({ reason: 'lost' })
    expect(event.type).toBe('helix-aura-fallback')
    expect(event.detail.reason).toBe('lost')
    expect(event.bubbles).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(helixEventNames.has('helix-aura-fallback')).toBe(true)
  })
})

describe('the notifications a sandbox sends once a request is applied', () => {
  test('helix-edit, helix-split and helix-panel-resize carry the new value and cannot be canceled', async () => {
    const { HelixEditEvent, HelixPanelResizeEvent, HelixSplitEvent } = await import('./events.js')
    const sent = [
      new HelixEditEvent({ value: '<p>' }),
      new HelixSplitEvent({ value: '60' }),
      new HelixPanelResizeEvent({ value: '120' }),
    ]
    expect(sent.map((event) => event.type)).toEqual([
      'helix-edit',
      'helix-split',
      'helix-panel-resize',
    ])
    for (const event of sent) {
      expect(event.cancelable).toBe(false)
      expect(event.bubbles).toBe(true)
      expect(event.composed).toBe(true)
      expect(helixEventNames.has(event.type)).toBe(true)
    }
  })
})

describe('the event a reader sends to ask for more items', () => {
  test('is helix-load-more, carries nothing and cannot be canceled', async () => {
    const { HelixLoadMoreEvent } = await import('./events.js')
    const event = new HelixLoadMoreEvent()
    expect(event.type).toBe('helix-load-more')
    expect(event.bubbles).toBe(true)
    expect(event.composed).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(helixEventNames.has('helix-load-more')).toBe(true)
  })
})
