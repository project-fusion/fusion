/*
 * The generated Graph, drawn from its real intermediate form: the list of
 * notes in core's order, the search that narrows it, a selection asked and
 * said, the legend that hides a group, and the picture drawn once the
 * drawing's box is measured. `test:native` writes the component beside this
 * file.
 */
import { setAnnounce } from '@fusion.dev/helix-core/capabilities/announce'
import { type FakeAnnounce, fakeAnnounce } from '@fusion.dev/helix-core/capabilities/announce/fake'
import { beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { LayerHostView } from '../root/layers'
import { HelixTheme } from '../theme/helix-theme'
import { HelixGraph, type HelixGraphProps } from './graph/index.native'

let announced: FakeAnnounce

beforeEach(() => {
  announced = fakeAnnounce()
  setAnnounce(announced)
})

const nodes = [
  { group: 'Sources', id: 'pricing', label: 'Pricing' },
  { group: 'Sources', id: 'plans', label: 'Plans and tiers' },
  { group: 'Answers', id: 'churn', label: 'Churn review' },
  { group: 'Answers', id: 'budget', label: 'Budget' },
]

const links = [
  { source: 'pricing', target: 'plans' },
  { source: 'churn', target: 'pricing' },
  { source: 'pricing', target: 'budget' },
  { source: 'budget', target: 'pricing' },
]

const Frame = (props: Partial<HelixGraphProps>) => (
  <GestureHandlerRootView>
    <HelixTheme mode="light">
      <LayerHostView>
        <HelixGraph label="Company notes" links={links} nodes={nodes} {...props} />
      </LayerHostView>
    </HelixTheme>
  </GestureHandlerRootView>
)

/** The list's rows, in order: each a press the list holds. */
const options = () => {
  const list = screen.getByLabelText('Notes', { includeHiddenElements: true })
  return list.queryAll(
    (node) => node.props.accessibilityRole === 'button' && typeof node.type === 'string',
  )
}

/** The notes the list draws, in order: each row's name. */
const rows = () => options().map((row) => row.props.accessibilityLabel as string)

/** Every view laid out at once, as the drawing's box is measured. */
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

/** The paths the drawing paints, by the component `react-native-svg`'s mock names. */
const paths = () => screen.root?.queryAll((node) => node.type === 'RNSVGPath') ?? []

/** What the live region said. */
const live = () => announced.said.map((one) => one.message.trim())

describe('the list', () => {
  test('holds every note by its name, with none selected', async () => {
    await render(<Frame />)
    expect(rows()).toEqual(['Budget', 'Churn review', 'Plans and tiers', 'Pricing'])
    expect(screen.getAllByText('4 notes', { includeHiddenElements: true }).length).toBeGreaterThan(
      0,
    )
  })

  test('puts the selected note first, then its links, each said by how it links', async () => {
    await render(<Frame defaultActive="pricing" />)
    expect(rows()).toEqual(['Pricing', 'Budget', 'Churn review', 'Plans and tiers'])
    const [first, second, third] = options()
    expect(first?.props.accessibilityState?.selected).toBe(true)
    expect(second?.props.accessibilityLabel).toBe('Budget')
    expect(
      screen.getAllByText('Linked both ways with Pricing', { includeHiddenElements: true }),
    ).toHaveLength(1)
    expect(third?.props.accessibilityLabel).toBe('Churn review')
    expect(screen.getAllByText('Links to Pricing', { includeHiddenElements: true })).toHaveLength(1)
    expect(
      screen.getAllByText('Linked from Pricing', { includeHiddenElements: true }),
    ).toHaveLength(1)
  })
})

describe('a selection', () => {
  test('is asked, sent, and said with the count', async () => {
    const heard: string[] = []
    await render(
      <Frame
        onActivate={(event: { detail: { value: string } }) =>
          heard.push(`activate ${event.detail.value}`)
        }
        onBeforeActivate={(event: { detail: { value: string } }) =>
          heard.push(`before ${event.detail.value}`)
        }
      />,
    )
    const churn = options()[1]
    await act(async () => {
      fireEvent.press(churn as never)
    })
    expect(heard).toEqual(['before churn', 'activate churn'])
    expect(rows()[0]).toBe('Churn review')
    expect(live()).toContain('Churn review, selected. 4 notes')
  })

  test('a refused selection stays where it was', async () => {
    await render(
      <Frame
        defaultActive="pricing"
        onBeforeActivate={(event: { preventDefault: () => void }) => event.preventDefault()}
      />,
    )
    await act(async () => {
      fireEvent.press(options()[2] as never)
    })
    expect(rows()[0]).toBe('Pricing')
  })

  test('keeps the local graph with depth', async () => {
    await render(<Frame defaultActive="plans" depth={1} />)
    expect(rows()).toEqual(['Plans and tiers', 'Pricing'])
  })
})

describe('the search', () => {
  test('narrows the list and says the count', async () => {
    await render(<Frame />)
    const field = screen.getByLabelText('Find a note', { includeHiddenElements: true })
    await act(async () => {
      fireEvent.changeText(field, 'pr')
    })
    expect(rows()).toEqual(['Pricing'])
    expect(live()).toContain('1 note')
  })
})

describe('the legend', () => {
  test('hides a group through the request a page can refuse', async () => {
    const heard: string[] = []
    await render(
      <Frame
        legend
        onBeforeGraphFilter={(event: { detail: { hidden: readonly string[] } }) =>
          heard.push(`before ${event.detail.hidden.join()}`)
        }
        onGraphFilter={(event: { detail: { hidden: readonly string[] } }) =>
          heard.push(`filter ${event.detail.hidden.join()}`)
        }
      />,
    )
    const answers = screen.getByText('Answers', { includeHiddenElements: true })
    await act(async () => {
      fireEvent.press(answers)
    })
    expect(heard).toEqual(['before Answers', 'filter Answers'])
    expect(rows()).toEqual(['Plans and tiers', 'Pricing'])
    expect(live()).toContain('2 notes')
  })

  test('is not drawn for one group', async () => {
    await render(<Frame legend nodes={nodes.map((node) => ({ ...node, group: 'All' }))} />)
    expect(screen.queryByRole('toolbar', { name: 'Groups' })).toBeNull()
  })
})

describe('the picture', () => {
  test('draws nothing until its box is measured, then each link and note', async () => {
    await render(<Frame defaultActive="pricing" />)
    expect(paths()).toHaveLength(0)
    await layOut()
    expect(paths().length).toBeGreaterThan(0)
    /* The selected note and its links are named over the drawing. */
    expect(screen.getAllByText('Pricing', { includeHiddenElements: true }).length).toBeGreaterThan(
      1,
    )
  })
})
