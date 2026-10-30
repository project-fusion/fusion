import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { jsx } from 'helix-shared/jsx-runtime'

/* A raw `<svg>` in code shared with the web draws through
   `react-native-svg`, in a slot as anywhere else. */

type Node = { type: string; props: Record<string, unknown>; children?: (Node | string)[] | null }

const all = (): Node[] => {
  const found: Node[] = []
  const walk = (node: Node | string | null) => {
    if (node !== null && typeof node !== 'string') {
      found.push(node)
      for (const child of node.children ?? []) {
        walk(child)
      }
    }
  }
  const tree = screen.toJSON() as unknown as Node | Node[]
  for (const node of Array.isArray(tree) ? tree : [tree]) {
    walk(node)
  }
  return found
}

const HEART = 'M12 21s-8-4.9-8-10.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 3.6C20 16.1 12 21 12 21z'

const heart = () =>
  jsx('svg', {
    'aria-hidden': 'true',
    children: jsx('path', { d: HEART }),
    fill: 'currentColor',
    slot: 'mark',
    viewBox: '0 0 24 24',
  })

describe('a raw svg', () => {
  test('draws its shapes where it stands, by the view box it names', async () => {
    await render(
      <HelixRoot mode="light">
        {jsx('svg', {
          children: jsx('circle', { cx: 12, cy: 12, r: 8, 'stroke-width': 2 }),
          viewBox: '0 0 24 24',
          width: 24,
        })}
      </HelixRoot>,
    )
    const nodes = all()
    expect(nodes.some((node) => node.type === 'RNSVGSvgView')).toBe(true)
    expect(nodes.some((node) => node.type === 'RNSVGCircle')).toBe(true)
  })

  test('draws in a slot, once for each mark of a rating and each of its two rows', async () => {
    await render(
      <HelixRoot mode="light">
        {jsx('helix-rating', { children: heart(), 'default-value': '3.5', label: 'Favorite' })}
      </HelixRoot>,
    )
    expect(all().filter((node) => node.type === 'RNSVGPath')).toHaveLength(10)
  })
})
