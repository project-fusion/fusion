import { describe, expect, test } from 'bun:test'
import type { HelixCard } from '@helix-io/web'
import { createRef, type RefObject } from 'react'
import {
  BaseCard,
  Card,
  type CardProps,
  Disclosure,
  type DisclosureProps,
} from './generated/index.js'

const tagOf = (component: unknown): string | undefined =>
  (component as { displayName?: string }).displayName

describe('composition namespaces', () => {
  // Card is one element with slotted regions, so its namespace has one member.
  // A family gets separate part elements only where a part carries behavior or
  // API of its own, which a header, body, and footer do not.
  test('a slot-based family exposes only its root', () => {
    expect(Object.keys(Card)).toEqual(['Root'])
  })

  // Alphabetical rather than Root-first: namespace key order carries no
  // meaning, and the formatter alphabetizes generated files regardless.
  test('parts are alphabetized so the generator and formatter agree', () => {
    expect(Object.keys(Card)).toEqual([...Object.keys(Card)].sort())
  })

  test('the root renders its element', () => {
    expect(tagOf(Card.Root)).toBe('helix-card')
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

  test('renders the base element, not the styled one', () => {
    expect(tagOf(BaseCard.Root)).toBe('helix-base-card')
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

  test('rejects an appearance outside the union', () => {
    // @ts-expect-error 'glass' is not a card appearance. Material is for
    // surfaces that layer over content, which a card is not.
    const props: CardProps = { appearance: 'glass' }
    expect(props).toBeDefined()
  })

  test('rejects a prop the element does not have', () => {
    // @ts-expect-error there is no `level` on a card.
    const props: CardProps = { level: 2 }
    expect(props).toBeDefined()
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
      onOpenChange: (event) => {
        const open: boolean = event.detail.open
        return open
      },
    }
    expect(props.onOpenChange).toBeDefined()
  })

  test('rejects a handler that assumes the wrong detail shape', () => {
    const props: DisclosureProps = {
      // @ts-expect-error `detail` carries `open`, not `expanded`.
      onOpenChange: (event) => event.detail.expanded,
    }
    expect(props).toBeDefined()
  })
})
