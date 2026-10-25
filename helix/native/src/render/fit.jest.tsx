import { setEnvironment } from '@fusion.dev/helix-core/capabilities/environment'
import { fakeEnvironment } from '@fusion.dev/helix-core/capabilities/environment/fake'
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import type { Family, Rule } from '../style/form'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'
import { useOpenPhase } from './fit'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A stage in miniature: its row fits what it holds, open while `open` is
   set, and hidden while closed, as a step's stage is. */
const stage: Family = {
  api: {
    events: [],
    props: [{ attribute: true, default: false, name: 'open', tier: 'headless', type: 'boolean' }],
    states: [],
  },
  name: 'stage',
  rules: [
    rule({
      order: 0,
      set: [
        ['display', { text: 'grid' }],
        ['grid-template-rows', { fit: 0 }],
        ['row-gap', { text: '4px' }],
        ['transition', { space: [{ text: 'grid-template-rows' }, { text: '200ms' }] }],
        ['visibility', { text: 'hidden' }],
      ],
      specificity: [0, 1, 0],
      target: 'content',
    }),
    rule({
      order: 1,
      set: [
        ['grid-template-rows', { fit: 1 }],
        ['visibility', { text: 'visible' }],
      ],
      specificity: [0, 2, 0],
      target: 'content',
      when: [{ kind: 'attribute', name: 'open', value: null }],
    }),
  ],
  tag: 'helix-stage',
  tree: [
    {
      attributes: { part: 'content' },
      children: [{ kind: 'region', name: 'default' }],
      kind: 'box',
      name: 'content',
    },
  ],
  version: '1.0',
}

const Stage = element(stage, () => ({
  marks: [],
  parts: { content: { view: { testID: 'content' } } },
}))

const drawn = (open: boolean) => (
  <ThemeProvider tokens={{}}>
    <Stage open={open}>
      <Text testID="words">Words</Text>
    </Stage>
  </ThemeProvider>
)

/** The content part, which a screen reader skips while it is closed. */
const part = () => screen.getByTestId('content', { includeHiddenElements: true })

/** The view inside the part that is measured. */
const measured = () => part().children[0] as ReturnType<typeof part>

/** The style the content part is drawn with, flattened. */
const style = (): Record<string, unknown> =>
  Object.assign({}, ...[part().props.style].flat(3).filter(Boolean))

/** Lays out what the part holds at `height`. */
const measure = (height: number) =>
  fireEvent(measured(), 'layout', {
    nativeEvent: { layout: { height, width: 100, x: 0, y: 0 } },
  })

beforeEach(() => {
  jest.useFakeTimers()
  setEnvironment(fakeEnvironment())
})

afterEach(() => {
  jest.useRealTimers()
})

describe('a row that fits its content', () => {
  test('is drawn at no height while closed, and its visibility hides it from a screen reader', async () => {
    await render(drawn(false))
    expect(style()).toMatchObject({ height: 0, overflow: 'hidden' })
    expect(part().props.accessibilityElementsHidden).toBe(true)
    expect(screen.getByText('Words', { includeHiddenElements: true })).toBeTruthy()
  })

  test('opens to the measured height, then takes no height of its own', async () => {
    const view = await render(drawn(false))
    await act(async () => measure(120))
    await act(async () => view.rerender(drawn(true)))
    expect(style()).toMatchObject({ height: 120, transitionProperty: ['height'] })
    /* Content that grows on the way moves the end of the motion with it. */
    await act(async () => measure(150))
    expect(style().height).toBe(150)
    await act(async () => jest.advanceTimersByTime(200))
    expect(style().height).toBeUndefined()
    expect(part().props.accessibilityElementsHidden).toBeUndefined()
  })

  test('closes from the measured height to none', async () => {
    const view = await render(drawn(true))
    await act(async () => measure(80))
    await act(async () => view.rerender(drawn(false)))
    expect(style().height).toBe(80)
    await act(async () => jest.advanceTimersByTime(16))
    expect(style().height).toBe(0)
    await act(async () => jest.advanceTimersByTime(200))
    expect(part().props.accessibilityElementsHidden).toBe(true)
  })

  test('opens at once under reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const view = await render(drawn(false))
    await act(async () => view.rerender(drawn(true)))
    expect(style().height).toBeUndefined()
  })

  test('keeps the gap between what it holds on the view it measures', async () => {
    await render(drawn(true))
    expect(style()).not.toHaveProperty('rowGap')
    expect(measured().props.style).toMatchObject({ rowGap: 4 })
  })
})

describe('useOpenPhase', () => {
  const Phase = ({ open, settled }: { open: boolean; settled: (phase: string) => void }) => (
    <Text testID="phase">{useOpenPhase(open, { duration: 100, easing: 'ease' }, settled)}</Text>
  )

  test('moves through opening and signals when its motion is done', async () => {
    const settled = jest.fn()
    const view = await render(<Phase open={false} settled={settled} />)
    expect(screen.getByTestId('phase').props.children).toBe('closed')
    await act(async () => view.rerender(<Phase open settled={settled} />))
    expect(screen.getByTestId('phase').props.children).toBe('opening')
    expect(settled).not.toHaveBeenCalled()
    await act(async () => jest.advanceTimersByTime(100))
    expect(screen.getByTestId('phase').props.children).toBe('open')
    expect(settled).toHaveBeenCalledWith('open')
  })
})

describe('a part that is visibility: hidden', () => {
  test('takes no press and is passed over by a screen reader, as on the web', async () => {
    await render(drawn(false))
    expect(part().props).toMatchObject({
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    })
    expect(style()).toMatchObject({ opacity: 0, pointerEvents: 'none' })
  })
})

/* A panel that fades out, its `visibility` moving with its opacity. */
const fading: Family = {
  ...stage,
  name: 'fading',
  rules: [
    rule({
      order: 0,
      set: [
        ['opacity', { number: 0 }],
        [
          'transition',
          {
            list: [
              { space: [{ text: 'opacity' }, { text: '200ms' }] },
              { space: [{ text: 'visibility' }, { text: '200ms' }] },
            ],
          },
        ],
        ['visibility', { text: 'hidden' }],
      ],
      specificity: [0, 1, 0],
      target: 'content',
    }),
    rule({
      order: 1,
      set: [
        ['opacity', { number: 1 }],
        ['visibility', { text: 'visible' }],
      ],
      specificity: [0, 2, 0],
      target: 'content',
      when: [{ kind: 'attribute', name: 'open', value: null }],
    }),
  ],
  tag: 'helix-fading',
}

const Fading = element(fading, () => ({
  marks: [],
  parts: { content: { view: { testID: 'content' } } },
}))

const faded = (open: boolean) => (
  <ThemeProvider tokens={{}}>
    <Fading open={open}>
      <Text>Words</Text>
    </Fading>
  </ThemeProvider>
)

describe('a part whose visibility moves', () => {
  test('stays seen and reachable until its transition ends, as the web keeps it', async () => {
    const view = await render(faded(true))
    await act(async () => view.rerender(faded(false)))
    expect(part().props.accessibilityElementsHidden).toBeUndefined()
    expect(style()).toMatchObject({ pointerEvents: 'auto' })
    await act(async () => jest.advanceTimersByTime(200))
    expect(part().props.accessibilityElementsHidden).toBe(true)
    expect(style()).toMatchObject({ opacity: 0, pointerEvents: 'none' })
  })

  test('is reachable again as soon as it shows', async () => {
    const view = await render(faded(false))
    expect(part().props.accessibilityElementsHidden).toBe(true)
    await act(async () => view.rerender(faded(true)))
    expect(part().props.accessibilityElementsHidden).toBeUndefined()
  })

  test('hides at once under reduced motion', async () => {
    setEnvironment(fakeEnvironment({ reducedMotion: true }))
    const view = await render(faded(true))
    await act(async () => view.rerender(faded(false)))
    expect(part().props.accessibilityElementsHidden).toBe(true)
  })
})
