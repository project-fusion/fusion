import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@helix-io/testing/dom'

/**
 * A group handing its own disabled state down to its members.
 *
 * The cascade itself is `inheritDisabled`, tested beside it. What this adds is
 * *when* it runs, and that is the part with a bug in it worth guarding: members
 * arrive through a slot, so a group disabled before its children are assigned
 * has nothing to write to, and a group whose children change afterwards has to
 * write again. `slotchange` on the render root is the signal, and it is bound
 * there rather than on the host because `slotchange` bubbles and is *not*
 * composed, so a listener on the host never hears it.
 */
type Item = HTMLElement & { disabled: boolean }

let Controller: new (
  host: unknown,
  options: { items: () => Item[] },
) => {
  hostConnected(): void
  hostUpdated(): void
}

beforeAll(async () => {
  registerDom()
  Controller = (await import('./disabled-cascade-controller.js'))
    .DisabledCascadeController as unknown as typeof Controller
})

/** A host that records nothing and answers everything a controller asks of it. */
const group = (disabled: boolean, items: Item[]) => {
  const root = document.createElement('div')
  const host = {
    addController: () => {},
    addEventListener: () => {},
    disabled,
    removeController: () => {},
    removeEventListener: () => {},
    renderRoot: root,
    requestUpdate: () => {},
    updateComplete: Promise.resolve(true),
  }
  const controller = new Controller(host, { items: () => items })
  return { controller, host, root }
}

const items = (...disabled: boolean[]): Item[] =>
  disabled.map((state) => {
    const el = document.createElement('div') as unknown as Item
    el.disabled = state
    return el
  })

describe('a group that is disabled', () => {
  test('writes its state onto its members when it updates', () => {
    const all = items(false, false)
    const { controller } = group(true, all)
    controller.hostUpdated()
    expect(all.map((one) => one.disabled)).toEqual([true, true])
  })

  test('and releasing them returns each to what it was', () => {
    const all = items(false, true)
    const held = group(true, all)
    held.controller.hostUpdated()
    const released = group(false, all)
    released.controller.hostUpdated()
    expect(all.map((one) => one.disabled)).toEqual([false, true])
  })
})

describe('members that arrive later', () => {
  /* The case a group cannot see coming: it is disabled before anything is
     slotted, so the first cascade writes to an empty list and the members that
     turn up afterwards would be enabled inside a disabled group. */
  test('are caught by `slotchange` rather than left enabled', () => {
    const all: Item[] = []
    const { controller, root } = group(true, all)
    controller.hostConnected()
    controller.hostUpdated()

    all.push(...items(false, false))
    root.dispatchEvent(new Event('slotchange', { bubbles: true }))
    expect(all.map((one) => one.disabled)).toEqual([true, true])
  })

  /* Bound to the render root and not to the host, because `slotchange` bubbles
     and is not composed: it reaches the shadow root that owns the slot and stops
     there, so a handler on the host simply never runs. */
  test('and the host hears nothing, which is why the render root is the target', () => {
    const all: Item[] = []
    const { controller, root, host } = group(true, all)
    controller.hostConnected()
    let onHost = 0
    ;(host as unknown as HTMLElement & { addEventListener: unknown }).addEventListener = () => {
      onHost += 1
    }
    all.push(...items(false))
    root.dispatchEvent(new Event('slotchange', { bubbles: true }))
    expect([all[0]?.disabled, onHost]).toEqual([true, 0])
  })
})
