import { describe, expect, test } from 'bun:test'
import { createComponent } from './create-component.js'
import { Accordion, type AccordionItemProps, type AccordionProps } from './generated/index.js'

describe('generated composition namespace', () => {
  test('exposes parts through dot notation', () => {
    expect(Accordion.Root).toBeDefined()
    expect(Accordion.Item).toBeDefined()
  })

  test('the root renders its custom element', () => {
    expect((Accordion.Root as { displayName?: string }).displayName).toBe('helix-accordion')
    expect((Accordion.Item as { displayName?: string }).displayName).toBe('helix-accordion-item')
  })

  // The namespace object owns the bare group name, so the component itself has
  // to carry its part or the two collide in the generated module.
  test('the namespace is not the component', () => {
    expect(Accordion).not.toBe(Accordion.Root)
  })
})

describe('generated props', () => {
  // Compile-time assertions: this file failing to typecheck is the test.
  test('accepts documented props and the event callback', () => {
    const props: AccordionItemProps = {
      defaultOpen: true,
      dense: false,
      onOpenChange: (event) => event.detail.open,
      open: true,
    }
    expect(props.defaultOpen).toBe(true)
  })

  test('rejects a value outside the literal union', () => {
    // @ts-expect-error 'ghost' is not one of the accordion's appearances.
    const props: AccordionProps = { appearance: 'ghost' }
    expect(props).toBeDefined()
  })

  // isOpen is a getter. Emitting it as a writable prop hands consumers an API
  // that throws on assignment.
  test('omits read-only members', () => {
    // @ts-expect-error isOpen is readonly on the element and not authorable.
    const props: AccordionItemProps = { isOpen: true }
    expect(props).toBeDefined()
  })
})

describe('createComponent', () => {
  test('names the component after its tag', () => {
    const Thing = createComponent({ events: {}, properties: [], tagName: 'helix-thing' })
    expect((Thing as { displayName?: string }).displayName).toBe('helix-thing')
  })
})
