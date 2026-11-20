import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { jsx } from 'helix-shared/jsx-runtime'

/* A hook written in a `style` in code shared with the web, as an example
   writes `--qr-code-size`, is the element's hook on a phone. */

type Node = { props: { style?: unknown }; children?: (Node | string)[] | null }

const flat = (style: unknown): Record<string, unknown> =>
  Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : typeof style === 'object' && style !== null
      ? (style as Record<string, unknown>)
      : {}

/** The square: the node drawn with an aspect ratio of 1. */
const square = (): Record<string, unknown> => {
  const all: Node[] = []
  const walk = (node: Node | string | null) => {
    if (node !== null && typeof node !== 'string') {
      all.push(node)
      for (const child of node.children ?? []) {
        walk(child)
      }
    }
  }
  walk(screen.toJSON() as unknown as Node)
  return all.map((node) => flat(node.props.style)).find((style) => style.aspectRatio === 1) ?? {}
}

describe('a size in a style', () => {
  test('sizes the element, in rems as the web does', async () => {
    await render(
      <HelixRoot mode="light">
        {jsx('helix-splitter', {
          children: [
            jsx('helix-text', { children: 'A', slot: 'start' }),
            jsx('helix-text', { children: 'B', slot: 'end' }),
          ],
          style: { blockSize: '12rem' },
        })}
      </HelixRoot>,
    )
    const all: Node[] = []
    const walk = (node: Node | string | null) => {
      if (node !== null && typeof node !== 'string') {
        all.push(node)
        for (const child of node.children ?? []) {
          walk(child)
        }
      }
    }
    walk(screen.toJSON() as unknown as Node)
    expect(all.some((node) => flat(node.props.style).height === 192)).toBe(true)
  })
})

describe('a hook in a style', () => {
  test('sets the hook of the element it is on', async () => {
    await render(
      <HelixRoot mode="light">
        {jsx('helix-qr-code', { style: { '--qr-code-size': '8rem' }, value: 'hello' })}
      </HelixRoot>,
    )
    expect(square().width).toBe(128)
  })

  test('leaves a custom property that is no hook of the element to the web', async () => {
    await render(
      <HelixRoot mode="light">
        {jsx('helix-qr-code', { style: { '--button-inline-size': '8rem' }, value: 'hello' })}
      </HelixRoot>,
    )
    expect(square().width).toBe(192)
  })
})
