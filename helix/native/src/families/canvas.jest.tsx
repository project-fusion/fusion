/*
 * The generated Canvas, drawn from its real intermediate form: the cards
 * placed on the plane, each connection's line and the view a screen reader
 * reaches over its middle, in the order the arrows walk them, a selection
 * asked and said, the zoom controls, and the minimap. `test:native` writes
 * the component beside this file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixCanvas, HelixCanvasNode, type HelixCanvasProps } from './canvas/index.native'

let announced: FakeAnnounce

beforeEach(() => {
  announced = fakeAnnounce()
  setAnnounce(announced)
})

/** A connection, as the gallery's tag writes one: a component the board finds by its tag. */
const Edge = Object.assign((_: Readonly<Record<string, unknown>>) => null, {
  tag: 'helix-canvas-edge',
})

const Board = (props: Partial<HelixCanvasProps> & { readonly extra?: ReactNode }) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <HelixCanvas label="Document approval" {...props}>
          <HelixCanvasNode height={64} name="write" width={160} x={0} y={0}>
            Write the draft
          </HelixCanvasNode>
          <HelixCanvasNode height={64} name="ship" tone="success" width={160} x={160} y={200}>
            Publish the draft
          </HelixCanvasNode>
          <HelixCanvasNode height={64} name="review" tone="accent" width={160} x={320} y={0}>
            Review the draft
          </HelixCanvasNode>
          <Edge from="write" label="when it is complete" to="review" />
          <Edge from="review" to="ship" tone="success" />
          {props.extra}
        </HelixCanvas>
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** Every view laid out at once, as the viewport is measured. */
const layOut = async () => {
  await act(async () => {
    for (const node of screen.root?.queryAll((one) => typeof one.props.onLayout === 'function') ??
      []) {
      fireEvent(node, 'layout', {
        nativeEvent: { layout: { height: 300, width: 360, x: 0, y: 0 } },
      })
    }
  })
}

/** What a screen reader walks, in order: each card's name and each connection's. */
const walked = () =>
  (
    screen.root?.queryAll(
      (node) =>
        typeof node.type === 'string' &&
        (node.props.accessibilityRole === 'button' ||
          node.props.accessibilityLabel !== undefined) &&
        typeof node.props.accessibilityLabel === 'string' &&
        typeof node.props.onClick === 'function' &&
        !String(node.props.accessibilityLabel).startsWith('Zoom'),
    ) ?? []
  ).map((node) => node.props.accessibilityLabel as string)

/** The paths the board paints, by the component `react-native-svg`'s mock names. */
const paths = () => screen.root?.queryAll((node) => node.type === 'RNSVGPath') ?? []

const live = () => announced.said.map((one) => one.message.trim())

const activate = async (label: string) => {
  await act(async () =>
    fireEvent.press(screen.getByLabelText(label, { includeHiddenElements: true })),
  )
}

describe('the board', () => {
  test('walks each card in reading order, then the connections leaving it', async () => {
    await render(<Board />)
    await layOut()
    expect(walked()).toEqual([
      'Write the draft',
      'From Write the draft to Review the draft',
      'Review the draft',
      'From Review the draft to Publish the draft',
      'Publish the draft',
    ])
  })

  test('draws each connection with its target, its line, and its arrowhead, and its label', async () => {
    await render(<Board />)
    await layOut()
    expect(paths()).toHaveLength(6)
    expect(screen.getByText('when it is complete', { includeHiddenElements: true })).toBeTruthy()
  })

  test('describes a card by where its connections go, and a connection by its tone and label', async () => {
    await render(<Board toneLabels={{ success: 'Done' }} />)
    await layOut()
    const card = screen.getByLabelText('Review the draft', { includeHiddenElements: true })
    expect(card.props.accessibilityHint).toBe('leads to Publish the draft; from Write the draft')
    const edge = screen.getByLabelText('From Review the draft to Publish the draft', {
      includeHiddenElements: true,
    })
    expect(edge.props.accessibilityHint).toBe('Done')
  })
})

describe('a diamond', () => {
  test('draws its outline as a shape filling the card', async () => {
    await render(
      <Board
        extra={
          <HelixCanvasNode height={80} name="ok" shape="diamond" width={120} x={0} y={160}>
            Approved?
          </HelixCanvasNode>
        }
      />,
    )
    await layOut()
    const shape = paths().find((one) => String(one.props.d).startsWith('M50 0'))
    expect(shape).toBeTruthy()
  })
})

describe('a selection', () => {
  test('is asked and made', async () => {
    const told: string[] = []
    await render(
      <Board
        onBeforeSelect={(event) => told.push(`before ${event.detail.value}`)}
        onSelect={(event) => told.push(`select ${event.detail.value}`)}
      />,
    )
    await layOut()
    await activate('From Write the draft to Review the draft')
    expect(told).toEqual(['before write->review', 'select write->review'])
    const edge = screen.getByLabelText('From Write the draft to Review the draft', {
      includeHiddenElements: true,
    })
    expect(edge.props.accessibilityState).toEqual({ selected: true })
  })

  test('a card pressed is selected', async () => {
    const told: string[] = []
    await render(<Board onSelect={(event) => told.push(event.detail.value ?? '')} />)
    await layOut()
    await activate('Write the draft')
    expect(told).toEqual(['write'])
    const card = screen.getByLabelText('Write the draft', { includeHiddenElements: true })
    expect(card.props.accessibilityState).toEqual({ selected: true })
  })

  test('a page refuses', async () => {
    await render(<Board onBeforeSelect={(event) => event.preventDefault()} />)
    await layOut()
    await activate('Write the draft')
    const card = screen.getByLabelText('Write the draft', { includeHiddenElements: true })
    expect(card.props.accessibilityState).toEqual({ selected: false })
  })

  test('the page holds', async () => {
    await render(<Board selected="review" />)
    await layOut()
    const flat = (style: unknown): Record<string, unknown> =>
      Object.assign({}, ...[style].flat(9).filter(Boolean))
    /* The selected card's own edge, an outline over its border. */
    const ringed = screen.root?.queryAll(
      (node) => typeof node.type === 'string' && flat(node.props.style).outlineWidth === 2,
    )
    expect(ringed).toHaveLength(1)
    const card = screen.getByLabelText('Review the draft', { includeHiddenElements: true })
    expect(card.props.accessibilityState).toEqual({ selected: true })
  })
})

describe('the controls', () => {
  test('zoom in by a quarter and say so', async () => {
    const zoomed: unknown[] = []
    await render(<Board onCanvasZoom={(event) => zoomed.push(event.detail)} />)
    await layOut()
    await act(async () => fireEvent.press(screen.getByLabelText('Zoom in')))
    expect(zoomed).toEqual([{ by: 1 }])
    expect(live().some((one) => one.startsWith('Zoom '))).toBe(true)
  })

  test('the minimap draws each card and the frame on screen', async () => {
    await render(<Board controls="zoom minimap" />)
    await layOut()
    expect(screen.root?.queryAll((node) => node.type === 'RNSVGRect').length).toBe(4)
  })
})
