import { beforeAll, describe, expect, test } from 'bun:test'
import { registerDom } from '@fusion.dev/helix-testing/dom'
import { assignSlots } from './assign-slots.js'

beforeAll(() => {
  registerDom()
})

/** A host whose shadow root assigns by hand, holding the given children. */
const manual = (slots: string, children: string) => {
  const host = document.createElement('div')
  host.innerHTML = children
  document.body.replaceChildren(host)
  const root = host.attachShadow({ mode: 'open', slotAssignment: 'manual' } as ShadowRootInit)
  root.innerHTML = slots
  const slot = (name: string) =>
    root.querySelector<HTMLSlotElement>(name === '' ? 'slot:not([name])' : `slot[name="${name}"]`)
  const held = (name: string) =>
    (slot(name)?.assignedNodes() ?? []).map((node) => (node as Element).id)
  return { held, host, root, slot }
}

describe('slots assigned by hand', () => {
  test('a child goes to the slot it names, and one that names none to the default slot', () => {
    const { held, host, root } = manual(
      '<slot name="header"></slot><slot></slot>',
      '<p id="a"></p><h2 id="h" slot="header"></h2><p id="b"></p>',
    )
    assignSlots(root, host.children)
    expect(held('header')).toEqual(['h'])
    expect(held('')).toEqual(['a', 'b'])
  })

  test('the host places a child before its slot attribute is read', () => {
    const { held, host, root } = manual(
      '<slot name="items"></slot><slot name="footer"></slot><slot></slot>',
      '<i id="one"></i><i id="two" slot="footer"></i><b id="note"></b>',
    )
    assignSlots(root, host.children, (child) => (child.localName === 'i' ? 'items' : undefined))
    expect(held('items')).toEqual(['one', 'two'])
    expect(held('footer')).toEqual([])
    expect(held('')).toEqual(['note'])
  })

  test('a child named for a slot the root does not draw reaches nothing', () => {
    const { held, host, root } = manual(
      '<slot></slot>',
      '<p id="a"></p><p id="x" slot="nowhere"></p>',
    )
    assignSlots(root, host.children)
    expect(held('')).toEqual(['a'])
  })

  test('a slot that already holds what it would be given is not assigned again', () => {
    const { host, root, slot } = manual('<slot></slot>', '<p id="a"></p>')
    assignSlots(root, host.children)
    const target = slot('') as HTMLSlotElement
    let calls = 0
    const assign = target.assign.bind(target)
    target.assign = (...nodes: (Element | Text)[]) => {
      calls += 1
      assign(...nodes)
    }
    assignSlots(root, host.children)
    expect(calls).toBe(0)
    host.append(document.createElement('p'))
    assignSlots(root, host.children)
    expect(calls).toBe(1)
  })

  test('nothing to assign into is no error', () => {
    expect(() => assignSlots(null, [])).not.toThrow()
  })
})
