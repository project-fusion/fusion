import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'

/**
 * Letting a control elsewhere on the page operate this one, declaratively.
 *
 * ```html
 * <helix-button commandfor="confirm" command="--show">Delete…</helix-button>
 * <helix-dialog id="confirm">…</helix-dialog>
 * ```
 *
 * The platform's own invoker rather than a convention of ours: the browser
 * resolves the id, wires the two together, and dispatches a `command` event at
 * the target when the trigger is activated, so it works for a click, for Enter,
 * for Space, and for whatever the platform decides counts as activation later.
 *
 * **Only custom commands reach a custom element.** `show-modal`, `close` and
 * `toggle-popover` are defined against native elements and applied by the
 * browser itself; pointed at a custom element they do nothing. Hence the `--`
 * prefix, which is the platform's marker for "the target decides".
 */
type Module = typeof import('./command-controller.js')

let CommandController: Module['CommandController']
let HelixFallbackCommandEvent: Module['HelixFallbackCommandEvent']
let supportsInvokers: Module['supportsInvokers']

/* Imported after registration rather than at the top of the file, because
   `HelixFallbackCommandEvent extends Event` captures whichever `Event` is
   global when the module is evaluated. A static import runs before `beforeAll`,
   so the class extended bun's built-in one and happy-dom refused every instance
   with "parameter 1 is not of type 'Event'". The same ordering is why an
   element class has to be defined in here rather than beside the imports. */
beforeAll(async () => {
  registerDom()
  ;({ CommandController, HelixFallbackCommandEvent, supportsInvokers } = await import(
    './command-controller.js'
  ))
})

const scene = (
  commands: Record<string, (source: Element | null) => void>,
): { host: HTMLElement; run: InstanceType<Module['CommandController']> } => {
  document.body.innerHTML = '<button id="trigger">go</button><span id="target"></span>'
  const host = document.getElementById('target') as HTMLElement
  Object.assign(host, { addController: () => {} })
  const run = new CommandController(host as never, { commands })
  run.hostConnected()
  return { host, run }
}

const trigger = (): HTMLElement => document.getElementById('trigger') as HTMLElement

describe('a command the host answers to', () => {
  test('is run', () => {
    const heard: string[] = []
    const { host } = scene({ '--show': () => heard.push('shown') })
    host.dispatchEvent(new HelixFallbackCommandEvent('--show', trigger()))
    expect(heard).toEqual(['shown'])
  })

  /* The element that asked, which is what lets a host anchor a popover to the
     button that opened it rather than to itself. */
  test('and told who asked', () => {
    let asked: Element | null = null
    const { host } = scene({
      '--show': (source) => {
        asked = source
      },
    })
    host.dispatchEvent(new HelixFallbackCommandEvent('--show', trigger()))
    expect<Element | null>(asked).toBe(trigger())
  })

  test('picking the right one out of several', () => {
    const heard: string[] = []
    const { host } = scene({
      '--hide': () => heard.push('hide'),
      '--show': () => heard.push('show'),
    })
    host.dispatchEvent(new HelixFallbackCommandEvent('--hide', null))
    expect(heard).toEqual(['hide'])
  })
})

describe('a command the host does not answer to', () => {
  /* Left alone rather than swallowed, so a host that answers `--show` does not
     quietly absorb a `--print` meant for something else. */
  test('is left alone, rather than absorbed by whoever happened to hear it', () => {
    const heard: string[] = []
    const { host } = scene({ '--show': () => heard.push('shown') })
    const event = new HelixFallbackCommandEvent('--print', null)
    host.dispatchEvent(event)
    expect(heard).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })
})

describe('the event a browser without invokers does not send', () => {
  /* Chrome 135, Firefox 137, Safari 18.4. Before those, a button set
     `commandForElement` on nothing, the wiring silently did not happen, and
     every `command` in the library was dead at once with no error and no
     warning: the markup right, the component right, and the button inert. */
  test('is dispatched under the platform’s own name', () => {
    expect(new HelixFallbackCommandEvent('--show', null).type).toBe('command')
  })

  test('carrying the two things the controller reads', () => {
    const event = new HelixFallbackCommandEvent('--show', trigger())
    expect([event.command, event.source]).toEqual(['--show', trigger()])
  })

  /* Matching the platform: fired at the invokee, cancelable, and not bubbling.
     The controller listens on the target itself, so there is nothing above it a
     bubble would reach anyway. */
  test('and behaving as the platform’s does, so nothing downstream can tell', () => {
    const event = new HelixFallbackCommandEvent('--show', null)
    expect([event.cancelable, event.bubbles]).toEqual([true, false])
  })
})

describe('asking whether the browser has invokers', () => {
  /* On the prototype rather than an instance, so it can be answered before
     anything has rendered, and guarded for a server, which has no
     `HTMLButtonElement` at all. */
  test('reads the prototype, so it can be asked before anything renders', () => {
    expect(supportsInvokers()).toBe(false)
    Object.defineProperty(HTMLButtonElement.prototype, 'commandForElement', {
      configurable: true,
      value: null,
      writable: true,
    })
    try {
      expect(supportsInvokers()).toBe(true)
    } finally {
      delete (HTMLButtonElement.prototype as unknown as Record<string, unknown>).commandForElement
    }
  })
})

describe('a host that has left the page', () => {
  test('stops answering', () => {
    const heard: string[] = []
    const { host, run } = scene({ '--show': () => heard.push('shown') })
    run.hostDisconnected()
    host.dispatchEvent(new HelixFallbackCommandEvent('--show', null))
    expect(heard).toEqual([])
  })
})
