import { beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { helixEventNames } from './names.js'

type Module = typeof import('./events.js')

let events: Module
let HelixRejectEvent: Module['HelixRejectEvent']

/* Imported after registration, because the event classes capture whichever
   `Event` is global when the module is evaluated. Specs share one module cache,
   and this file can run before any DOM spec has registered happy-dom. A static
   import here gave every later DOM spec classes that extend bun's built-in
   `Event`, and happy-dom refused their instances with "parameter 1 is not of
   type 'Event'". The names come from `names.js`, which holds no class. */
beforeAll(async () => {
  registerDom()
  events = await import('./events.js')
  ;({ HelixRejectEvent } = events)
})

describe('the names this library dispatches', () => {
  test('are the names of the event classes, every one and no other', () => {
    const named = Object.values(events)
      .map((value) => (value as { eventName?: unknown }).eventName)
      .filter((name): name is string => typeof name === 'string')
    expect([...helixEventNames].sort()).toEqual([...new Set(named)].sort())
  })

  test('each class is in a module of its own, which a bundle drops whole when nothing uses it', () => {
    const crowded = readdirSync(import.meta.dir)
      .filter((file) => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
      .filter(
        (file) =>
          (readFileSync(join(import.meta.dir, file), 'utf8').match(/^export class /gm) ?? [])
            .length > 1,
      )
    expect(crowded).toEqual([])
  })

  test('ship without the event classes, so a family pays only for the events it sends', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'helix-events-'))
    try {
      const entry = join(dir, 'entry.js')
      writeFileSync(
        entry,
        `import { helixEventNames } from ${JSON.stringify(join(import.meta.dir, 'events.ts'))}\n` +
          'console.log(helixEventNames)\n',
      )
      const built = await Bun.build({ entrypoints: [entry], format: 'esm', target: 'browser' })
      const code = await built.outputs[0]?.text()
      expect(code).toContain('helix-before-open')
      expect(code).not.toContain('extends CustomEvent')
      expect(code).not.toContain('extends Event')
    } finally {
      rmSync(dir, { force: true, recursive: true })
    }
  })
})

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

describe('the events phase two sent as plain events', () => {
  test('bubble out of the shadow root, cannot be canceled, and are names this library dispatches', async () => {
    const {
      HelixActionEvent,
      HelixEndEvent,
      HelixExpandEvent,
      HelixLoadEvent,
      HelixRangeChangeEvent,
      HelixToggleEvent,
      HelixTypingEvent,
    } = await import('./events.js')
    const sent = [
      new HelixActionEvent(),
      new HelixEndEvent(),
      new HelixExpandEvent({ value: 'a,b' }),
      new HelixLoadEvent(),
      new HelixRangeChangeEvent({ first: 2, last: 9 }),
      new HelixToggleEvent({ checked: true }),
      new HelixTypingEvent({ typing: false }),
    ]
    expect(sent.map((event) => event.type)).toEqual([
      'helix-action',
      'helix-end',
      'helix-expand',
      'helix-load',
      'helix-range-change',
      'helix-toggle',
      'helix-typing',
    ])
    for (const event of sent) {
      expect(event.bubbles).toBe(true)
      expect(event.composed).toBe(true)
      expect(event.cancelable).toBe(false)
      expect(helixEventNames.has(event.type)).toBe(true)
    }
  })

  test('carry the state they report, where there is one', async () => {
    const { HelixExpandEvent, HelixRangeChangeEvent, HelixToggleEvent, HelixTypingEvent } =
      await import('./events.js')
    expect(new HelixExpandEvent({ value: 'a,b' }).detail.value).toBe('a,b')
    expect(new HelixRangeChangeEvent({ first: 2, last: 9 }).detail).toEqual({ first: 2, last: 9 })
    expect(new HelixToggleEvent({ checked: false }).detail.checked).toBe(false)
    expect(new HelixTypingEvent({ typing: true }).detail.typing).toBe(true)
  })
})

describe('the event a control sends once a press has acted', () => {
  test('is helix-press, carries what pressed it, bubbles out of the shadow root and cannot be canceled', async () => {
    const { HelixPressEvent } = await import('./events.js')
    const event = new HelixPressEvent({ pointerType: 'keyboard' })
    expect(event.type).toBe('helix-press')
    expect(event.detail.pointerType).toBe('keyboard')
    expect(event.bubbles).toBe(true)
    expect(event.composed).toBe(true)
    expect(event.cancelable).toBe(false)
    expect(helixEventNames.has('helix-press')).toBe(true)
  })
})
