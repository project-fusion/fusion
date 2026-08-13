import { describe, expect, test } from 'bun:test'
import { createComponent } from './create-component.js'
import { Disclosure, type DisclosureProps } from './generated/index.js'

describe('generated composition namespace', () => {
  test('exposes parts through dot notation', () => {
    expect(Disclosure.Root).toBeDefined()
    expect(typeof Disclosure.Root).toBe('object')
  })

  test('the root renders its custom element', () => {
    expect((Disclosure.Root as { displayName?: string }).displayName).toBe('helix-disclosure')
  })

  // The namespace object owns the bare group name, so the component itself has
  // to carry its part or the two collide in the generated module.
  test('the namespace is not the component', () => {
    expect(Disclosure).not.toBe(Disclosure.Root)
  })
})

describe('generated props', () => {
  // Compile-time assertions: this file failing to typecheck is the test.
  test('accepts documented props and the event callback', () => {
    const props: DisclosureProps = {
      appearance: 'outlined',
      defaultOpen: true,
      dense: false,
      onOpenChange: (detail) => detail,
      open: true,
    }
    expect(props.appearance).toBe('outlined')
  })

  test('rejects a value outside the literal union', () => {
    // @ts-expect-error 'ghost' is not one of the element's appearances.
    const props: DisclosureProps = { appearance: 'ghost' }
    expect(props).toBeDefined()
  })

  // isOpen is a getter. Emitting it as a writable prop hands consumers an API
  // that throws on assignment.
  test('omits read-only members', () => {
    // @ts-expect-error isOpen is readonly on the element and not authorable.
    const props: DisclosureProps = { isOpen: true }
    expect(props).toBeDefined()
  })
})

describe('createComponent', () => {
  test('names the component after its tag', () => {
    const Thing = createComponent({ events: {}, properties: [], tagName: 'helix-thing' })
    expect((Thing as { displayName?: string }).displayName).toBe('helix-thing')
  })
})
