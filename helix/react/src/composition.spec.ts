import { describe, expect, test } from 'bun:test'
import type { HelixCard } from '@helix-io/web'
import { createRef, type RefObject } from 'react'
import {
  BaseCard,
  Card,
  type CardProps,
  type CardTitleProps,
  Disclosure,
  type DisclosureProps,
} from './generated/index.js'

const tagOf = (component: unknown): string | undefined =>
  (component as { displayName?: string }).displayName

describe('composition namespaces', () => {
  test('a multi-part family exposes every part', () => {
    expect(Object.keys(Card).sort()).toEqual(['Body', 'Footer', 'Header', 'Root', 'Title'])
  })

  // Alphabetical rather than Root-first: namespace key order carries no
  // meaning, and the formatter alphabetizes generated files regardless.
  test('parts are alphabetized so the generator and formatter agree', () => {
    expect(Object.keys(Card)).toEqual([...Object.keys(Card)].sort())
  })

  test('each part renders its own element', () => {
    expect(tagOf(Card.Root)).toBe('helix-card')
    expect(tagOf(Card.Header)).toBe('helix-card-header')
    expect(tagOf(Card.Title)).toBe('helix-card-title')
    expect(tagOf(Card.Body)).toBe('helix-card-body')
    expect(tagOf(Card.Footer)).toBe('helix-card-footer')
  })

  test('a single-part family still uses Root', () => {
    expect(Object.keys(Disclosure)).toEqual(['Root'])
  })
})

describe('the headless tier is its own family', () => {
  // BaseCard rather than CardBase: the headless tier is a parallel entry
  // point, not an implementation detail of the styled one, and the prefix
  // keeps the two adjacent in an autocomplete list.
  test('mirrors the styled family part for part', () => {
    expect(Object.keys(BaseCard).sort()).toEqual(Object.keys(Card).sort())
  })

  test('renders the base elements, not the styled ones', () => {
    expect(tagOf(BaseCard.Root)).toBe('helix-base-card')
    expect(tagOf(BaseCard.Title)).toBe('helix-base-card-title')
  })

  test('is a distinct namespace from the styled family', () => {
    expect(BaseCard.Root).not.toBe(Card.Root)
  })
})

describe('generated prop types', () => {
  test('the root carries its own props, not its parts', () => {
    const props: CardProps = { appearance: 'elevated', dense: true }
    expect(props.appearance).toBe('elevated')
  })

  test('a part carries only its own props', () => {
    const title: CardTitleProps = { level: 2 }
    expect(title.level).toBe(2)
  })

  test('rejects an appearance outside the union', () => {
    // @ts-expect-error 'glass' is not a card appearance. Material is for
    // surfaces that layer over content, which a card is not.
    const props: CardProps = { appearance: 'glass' }
    expect(props).toBeDefined()
  })

  test('rejects an out-of-range heading level', () => {
    // @ts-expect-error there is no h7.
    const title: CardTitleProps = { level: 7 }
    expect(title).toBeDefined()
  })

  test("a part does not accept the root's props", () => {
    // @ts-expect-error `dense` belongs to Card.Root, not Card.Title.
    const title: CardTitleProps = { dense: true }
    expect(title).toBeDefined()
  })
})

describe('wrapper prop surface', () => {
  // Compile-time assertions: this file failing to typecheck is the test.
  test('native React handlers and attributes pass through', () => {
    const props: CardProps = {
      className: 'surface',
      id: 'card-1',
      onClick: (event) => event.preventDefault(),
      onFocus: () => undefined,
      style: { margin: 0 },
      tabIndex: 0,
    }
    expect(props.id).toBe('card-1')
  })

  test('a ref is typed as the element, not a bare HTMLElement', () => {
    const ref: RefObject<HelixCard | null> = createRef<HelixCard>()
    // `appearance` exists on HelixCard and on no plain HTMLElement, so this
    // line is what proves the ref carries the component's own type.
    const read = (): string | undefined => ref.current?.appearance
    expect(read()).toBeUndefined()
  })

  test('an event callback receives the typed detail', () => {
    const props: DisclosureProps = {
      onHelixOpenChange: (event) => {
        const open: boolean = event.detail.open
        return open
      },
    }
    expect(props.onHelixOpenChange).toBeDefined()
  })

  test('rejects a handler that assumes the wrong detail shape', () => {
    const props: DisclosureProps = {
      // @ts-expect-error `detail` carries `open`, not `expanded`.
      onHelixOpenChange: (event) => event.detail.expanded,
    }
    expect(props).toBeDefined()
  })
})
