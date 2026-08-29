import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { AriaForwardController } from './aria-forward-controller.js'

/**
 * Carrying a host's ARIA references down to the control inside it.
 *
 * `<helix-button aria-describedby="tip">` puts the description on the host, and
 * the host is not what a reader is on: the accessibility tree exposes the
 * `<button>` in the shadow root, and the host beside it is a generic with a
 * description nobody hears. A plain `<button>` with the identical attribute
 * reads it out, so the reference is fine and only its destination is wrong.
 *
 * **An IDREF cannot make that trip and an element reference can.** The ids are
 * in the consumer's tree and the control is in a shadow root, so
 * `aria-describedby` copied inward resolves to nothing. `ariaDescribedByElements`
 * takes the elements, and a reference is valid into the same tree *or a
 * shadow-including ancestor* of it: from inside the shadow root looking out, the
 * document is exactly that.
 *
 * **happy-dom implements no element reflection at all**, measured: the property
 * is not on an element. So the two accessors are defined on the target here,
 * which is what an engine that has them provides. That is the input; the
 * resolving, the dropping of stale ids and the watching are the controller's
 * own and run for real. The absence is worth having both ways, so the guard is
 * tested against a target genuinely without them.
 */
beforeAll(() => {
  registerDom()
})

/** An element that reflects, as an engine with element reflection provides. */
const reflecting = (): HTMLElement => {
  const made = document.createElement('button')
  for (const property of ['ariaDescribedByElements', 'ariaLabelledByElements']) {
    Object.defineProperty(made, property, { value: null, writable: true })
  }
  return made
}

interface Scene {
  control: HTMLElement
  forward: AriaForwardController
  host: HTMLElement
}

const scene = (attributes: string, instead?: () => HTMLElement | null): Scene => {
  document.body.innerHTML = `<p id="tip">a tip</p><p id="also">and more</p><span ${attributes}></span>`
  const host = document.body.lastElementChild as HTMLElement
  Object.assign(host, { addController: () => {}, requestUpdate: () => {} })
  const control = reflecting()
  host.attachShadow({ mode: 'open' }).append(control)
  const target = instead ?? ((): HTMLElement => control)
  return { control, forward: new AriaForwardController(host as never, { target }), host }
}

const held = (control: HTMLElement, property: string): string[] | null => {
  const value = (control as unknown as Record<string, Element[] | null>)[property]
  return value === null ? null : value.map((one) => one.id)
}

describe('a reference a consumer wrote on the host', () => {
  test('reaches the control, which is what a reader is actually on', () => {
    const { control, forward } = scene('aria-describedby="tip"')
    forward.forward()
    expect(held(control, 'ariaDescribedByElements')).toEqual(['tip'])
  })

  test('and so does a label, which is the other half of the pair', () => {
    const { control, forward } = scene('aria-labelledby="tip"')
    forward.forward()
    expect(held(control, 'ariaLabelledByElements')).toEqual(['tip'])
  })

  test('all of them, in the order they were named', () => {
    const { control, forward } = scene('aria-describedby="also tip"')
    forward.forward()
    expect(held(control, 'ariaDescribedByElements')).toEqual(['also', 'tip'])
  })

  /* Nothing is removed and nothing is added: the consumer's markup is exactly
     what they wrote. What changes is only that the control now also holds the
     reference. */
  test('and stays on the host, because that is the markup they wrote', () => {
    const { forward, host } = scene('aria-describedby="tip"')
    forward.forward()
    expect(host.getAttribute('aria-describedby')).toBe('tip')
  })
})

describe('an id that resolves to nothing', () => {
  test('is dropped rather than passed on', () => {
    const { control, forward } = scene('aria-describedby="tip gone"')
    forward.forward()
    expect(held(control, 'ariaDescribedByElements')).toEqual(['tip'])
  })

  /* Null rather than an empty array, so a reference this controller established
     is cleared rather than left holding the last good value. An
     `aria-describedby` naming a heading that has been removed is a stale
     reference, not an unchanged one. The reference has to be established
     through the controller: clearing one assigned by hand is the case below,
     and the opposite answer. */
  test('and clears the property when none of them resolve', () => {
    const { control, forward, host } = scene('aria-describedby="tip"')
    forward.forward()
    host.setAttribute('aria-describedby', 'gone')
    forward.forward()
    expect(held(control, 'ariaDescribedByElements')).toBeNull()
  })

  test('as does the reference being taken off the host', () => {
    const { control, forward, host } = scene('aria-describedby="tip"')
    forward.forward()
    host.removeAttribute('aria-describedby')
    forward.forward()
    expect(held(control, 'ariaDescribedByElements')).toBeNull()
  })

  /* **A host that never named anything leaves the control alone**, which is the
     ordinary case and was the expensive one. `MixinField` writes
     `aria-describedby` on the control for its own hint, and assigning null to an
     element-reference property removes the content attribute rather than merely
     clearing the property, so forwarding nothing described the hint to nobody on
     every form control this reaches. */
  test('and a control the host said nothing about keeps what it wrote itself', () => {
    const { control, forward } = scene('')
    ;(control as unknown as Record<string, unknown>).ariaDescribedByElements = [document.body]
    forward.forward()
    expect(held(control, 'ariaDescribedByElements')).toEqual([''])
  })
})

describe('where the ids are looked up', () => {
  /* The host's own root rather than `document`, so a button inside another
     component's shadow root finds the ids written beside it there. */
  test('is the host’s own root, which may itself be a shadow root', () => {
    document.body.innerHTML = '<div id="outer"></div>'
    const outer = document.getElementById('outer') as HTMLElement
    const root = outer.attachShadow({ mode: 'open' })
    root.innerHTML = '<p id="tip">a tip</p><span aria-describedby="tip"></span>'
    const host = root.lastElementChild as HTMLElement
    Object.assign(host, { addController: () => {} })
    const control = reflecting()
    host.attachShadow({ mode: 'open' }).append(control)
    new AriaForwardController(host as never, { target: () => control }).forward()
    expect(held(control, 'ariaDescribedByElements')).toEqual(['tip'])
  })
})

describe('an engine with no element reflection', () => {
  /* Assigning a property an engine does not implement is a no-op rather than an
     error, so without the guard this would appear to work and do nothing. The
     guard is what makes the absence visible instead of silent. */
  test('is left alone rather than half written to', () => {
    const plain = document.createElement('button')
    const { forward } = scene('aria-describedby="tip"', () => plain)
    expect(() => {
      forward.forward()
    }).not.toThrow()
    expect('ariaDescribedByElements' in plain).toBe(false)
  })
})

describe('a control that does not exist yet', () => {
  test('is not written to, since there is nothing to forward to', () => {
    const { forward } = scene('aria-describedby="tip"', () => null)
    expect(() => {
      forward.forward()
    }).not.toThrow()
  })
})

describe('a reference that arrives later', () => {
  /* A framework rendering a tooltip after this element upgrades, or a consumer
     pointing `aria-describedby` at a different id, changes an attribute and
     nothing schedules a Lit update. */
  test('is picked up, because nothing else would schedule a look', async () => {
    const { control, forward, host } = scene('')
    forward.hostConnected()
    host.setAttribute('aria-describedby', 'tip')
    await new Promise((done) => setTimeout(done, 0))
    expect(held(control, 'ariaDescribedByElements')).toEqual(['tip'])
    forward.hostDisconnected()
  })

  test('and stops being watched once the host leaves', async () => {
    const { control, forward, host } = scene('')
    forward.hostConnected()
    forward.hostDisconnected()
    host.setAttribute('aria-describedby', 'tip')
    await new Promise((done) => setTimeout(done, 0))
    expect(held(control, 'ariaDescribedByElements')).toBeNull()
  })
})

describe('every update rather than only the first', () => {
  /* A component that re-renders its control, which `Button` does whenever
     `href` swaps it between an anchor and a button, produces a new element with
     none of this on it. */
  test('because a re-rendered control is a new element with none of this', () => {
    document.body.innerHTML = '<p id="tip">a tip</p><span aria-describedby="tip"></span>'
    const host = document.body.lastElementChild as HTMLElement
    Object.assign(host, { addController: () => {} })
    const root = host.attachShadow({ mode: 'open' })
    let control = reflecting()
    root.append(control)
    const forward = new AriaForwardController(host as never, { target: () => control })
    forward.hostUpdated()
    control.remove()
    control = reflecting()
    root.append(control)
    expect(held(control, 'ariaDescribedByElements')).toBeNull()
    forward.hostUpdated()
    expect(held(control, 'ariaDescribedByElements')).toEqual(['tip'])
  })
})
