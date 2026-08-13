import { describe, expect, test } from 'bun:test'
import {
  BaseCard,
  Card,
  type CardProps,
  type CardTitleProps,
  Disclosure,
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
