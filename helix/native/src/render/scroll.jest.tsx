import { afterEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dimensions, type HostInstance, ScrollView, StyleSheet } from 'react-native'
import * as measure from '../capabilities/measure'
import * as capability from '../capabilities/scroll'
import { HelixTab, HelixTabs } from '../families/tabs/index.native'
import type { Family, Rule } from '../style/form'
import { HelixTheme } from '../theme/helix-theme'
import { ThemeProvider } from '../theme/theme'
import { element } from './element'
import { type Pager, ScrollArea } from './scroll'

const rule = (fields: Partial<Rule> & Pick<Rule, 'order' | 'specificity' | 'target'>): Rule => ({
  kind: 'rule',
  set: [],
  values: [],
  webOnly: false,
  when: [],
  ...fields,
})

/* A strip of tabs in miniature: a row that scrolls along its line, with a
   scroll button at each end that is not drawn while it is hidden. */
const strip: Family = {
  api: { events: [], props: [], states: [] },
  name: 'strip',
  rules: [
    rule({
      order: 0,
      set: [
        ['display', { text: 'flex' }],
        ['gap', { number: 4 }],
        ['overflow-x', { text: 'auto' }],
      ],
      specificity: [0, 1, 0],
      target: 'strip',
    }),
    ...['scroll-start', 'scroll-end'].map((target, order) =>
      rule({
        order: order + 1,
        set: [['display', { text: 'none' }]],
        specificity: [0, 2, 0],
        target,
        when: [{ kind: 'part', name: 'hidden', value: true }],
      }),
    ),
  ],
  tag: 'helix-strip',
  tree: [
    {
      attributes: { label: 'Sections', role: 'tablist' },
      children: [
        {
          attributes: { decorative: true, scrolls: 'start' },
          kind: 'pressable',
          name: 'scroll-start',
        },
        { kind: 'region', name: 'default' },
        { attributes: { decorative: true, scrolls: 'end' }, kind: 'pressable', name: 'scroll-end' },
      ],
      kind: 'box',
      name: 'strip',
    },
  ],
  version: '2.0',
}

const Strip = element(strip, () => ({
  marks: [],
  parts: {
    'scroll-end': { view: { testID: 'end' } },
    'scroll-start': { view: { testID: 'start' } },
  },
}))

/** The strip's scroll view, which holds the words passed in. */
const scrollView = () => {
  const view = screen.getByText('Words').parent?.parent
  if (view === null || view === undefined) {
    throw new Error('The words are not in a scroll view.')
  }
  return view
}

/** Whether the scroll button by `id` is drawn. */
const shows = (id: string) =>
  StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style)
    .display !== 'none'

afterEach(() => {
  jest.restoreAllMocks()
})

describe('scroll', () => {
  test('a scrolling part holds content at least as long as itself, and across lays it out at its width, so items that grow share it', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Strip>Words</Strip>
      </ThemeProvider>,
    )
    const view = scrollView()
    expect(view.props.horizontal).toBe(true)
    expect(view.props.contentContainerStyle).toEqual({
      flexDirection: 'row',
      flexGrow: 1,
      gap: 4,
      width: '100%',
    })
    expect(view.parent?.props).toMatchObject({
      accessibilityLabel: 'Sections',
      accessibilityRole: 'tablist',
    })
  })

  test('a scroll button shows while there is more the way it scrolls, held to that edge', async () => {
    await render(
      <ThemeProvider tokens={{}}>
        <Strip>Words</Strip>
      </ThemeProvider>,
    )
    expect([shows('start'), shows('end')]).toEqual([false, false])
    const view = scrollView()
    await fireEvent(view, 'contentSizeChange', 600, 40)
    await fireEvent(view, 'layout', { nativeEvent: { layout: { height: 40, width: 200 } } })
    expect([shows('start'), shows('end')]).toEqual([false, true])
    await fireEvent.scroll(view, { nativeEvent: { contentOffset: { x: 400, y: 0 } } })
    expect([shows('start'), shows('end')]).toEqual([true, false])
    expect(screen.getByTestId('end', { includeHiddenElements: true })).toHaveStyle({
      bottom: 0,
      end: 0,
      position: 'absolute',
      top: 0,
    })
  })

  test('a scrolling part pages most of its length toward an end, and no further than its content', async () => {
    const scrolled: unknown[] = []
    jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation((to) => {
      scrolled.push(to)
    })
    let pager: Pager | null = null
    const Paged = element(strip, () => ({
      marks: [],
      parts: {
        strip: {
          view: {
            pager: (handed: Pager | null) => {
              pager = handed
            },
          },
        },
      },
    }))
    await render(
      <ThemeProvider tokens={{}}>
        <Paged>Words</Paged>
      </ThemeProvider>,
    )
    const view = scrollView()
    await fireEvent(view, 'contentSizeChange', 600, 40)
    await fireEvent(view, 'layout', { nativeEvent: { layout: { height: 40, width: 200 } } })
    await fireEvent.scroll(view, { nativeEvent: { contentOffset: { x: 300, y: 0 } } })
    ;(pager as Pager | null)?.page('end')
    ;(pager as Pager | null)?.page('start')
    expect(scrolled).toEqual([
      { animated: true, x: 400 },
      { animated: true, x: 150 },
    ])
  })

  test('a scrolling part hands a binding the view its content is laid out in, and reports its size', async () => {
    const reported = jest.spyOn(measure, 'layoutChanged')
    const handed: unknown[] = []
    const Handing = element(strip, () => ({
      marks: [],
      parts: { strip: { view: { contentRef: (node: unknown) => handed.push(node) } } },
    }))
    await render(
      <ThemeProvider tokens={{}}>
        <Handing>Words</Handing>
      </ThemeProvider>,
    )
    const view = scrollView()
    /* React Native hands the scroll view its content's view, which its Jest mock does not draw. */
    const content = { view: 'content' } as unknown as HostInstance
    await act(() => view.props.innerViewRef(content))
    expect(handed).toEqual([content])
    await fireEvent(view, 'contentSizeChange', 600, 40)
    expect(reported).toHaveBeenCalledWith(content, { height: 40, width: 600, x: 0, y: 0 })
    expect(view.parent?.props).not.toHaveProperty('contentRef')
  })

  test('a scroll view tells the scroll capability how far it has scrolled', async () => {
    const told = jest.spyOn(capability, 'scrolled')
    await render(
      <ScrollArea testID="page">
        <ThemeProvider tokens={{}}>
          <Strip>Words</Strip>
        </ThemeProvider>
      </ScrollArea>,
    )
    await fireEvent.scroll(screen.getByTestId('page'), {
      nativeEvent: { contentOffset: { x: 0, y: 120 } },
    })
    await fireEvent.scroll(scrollView(), { nativeEvent: { contentOffset: { x: 40, y: 0 } } })
    expect(told.mock.calls.map(([, point]) => point)).toEqual([
      { x: 0, y: 120 },
      { x: 40, y: 0 },
    ])
  })

  test('a scroll view takes no scroll while a layer holds the screen still', async () => {
    await render(
      <ScrollArea testID="page">
        <ThemeProvider tokens={{}}>
          <Strip>Words</Strip>
        </ThemeProvider>
      </ScrollArea>,
    )
    const stop = await act(async () => capability.nativeScroll.lock({} as HostInstance))
    expect(screen.getByTestId('page').props.scrollEnabled).toBe(false)
    expect(scrollView().props.scrollEnabled).toBe(false)
    await act(async () => stop())
    expect(screen.getByTestId('page').props.scrollEnabled).toBe(true)
  })
})

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

/** An element a query finds. */
type Found = ReturnType<typeof screen.getByText>

const flatStyle = (node: Found) =>
  (StyleSheet.flatten(node.props.style) ?? {}) as Record<string, unknown>

/** The host of the tab whose label is `label`: the view the tab set sizes. */
const tabHost = (label: string): Found => {
  let node: Found | null = screen.getByText(label)
  while (node !== null && flatStyle(node).flexShrink === undefined) {
    node = node.parent
  }
  if (node === null) {
    throw new Error(`No sized view holds ${label}.`)
  }
  return node
}

/** Lays out each tab at its own width, as a phone does. */
const measureTabs = async (widths: Readonly<Record<string, number>>) => {
  for (const [label, width] of Object.entries(widths)) {
    await fireEvent(tabHost(label), 'layout', {
      nativeEvent: { layout: { height: 40, width, x: 0, y: 0 } },
    })
  }
}

const drawFullTabs = async () => {
  await render(
    <HelixTheme mode="light">
      <HelixTabs defaultActive="preview" width="full">
        <HelixTab value="preview">Preview</HelixTab>
        <HelixTab value="code">Code</HelixTab>
      </HelixTabs>
    </HelixTheme>,
  )
}

describe('a full-width strip', () => {
  afterEach(() => {
    atTextSize(1)
  })

  /* The default size; 1.353, where space stops growing; and 3.571, the largest of iOS's sizes. */
  test.each([1, 1.353, 3.571])(
    'at %p, draws each tab at its own width, then grows it from there, so the strip scrolls once they overflow',
    async (size) => {
      atTextSize(size)
      await drawFullTabs()
      expect(flatStyle(tabHost('Preview'))).toMatchObject({ flexGrow: 0, flexShrink: 0 })
      expect(flatStyle(tabHost('Preview')).flex).toBeUndefined()
      const preview = 200 * size
      const code = 120 * size
      await measureTabs({ Code: code, Preview: preview })
      expect(flatStyle(tabHost('Preview'))).toMatchObject({
        flexBasis: 0,
        flexGrow: 1,
        flexShrink: 1,
        minWidth: preview,
      })
      expect(flatStyle(tabHost('Code'))).toMatchObject({ flexGrow: 1, minWidth: code })
      let view: Found | null = tabHost('Preview')
      while (view !== null && view.props.horizontal === undefined) {
        view = view.parent
      }
      expect(view?.props.horizontal).toBe(true)
      expect(view?.props.scrollEnabled).toBe(true)
      expect(view?.props.contentContainerStyle).toMatchObject({ flexGrow: 1 })
    },
  )

  test('measures the tabs again when the reader changes the text size', async () => {
    await drawFullTabs()
    await measureTabs({ Code: 120, Preview: 200 })
    expect(flatStyle(tabHost('Preview')).minWidth).toBe(200)
    await act(() => atTextSize(3.571))
    expect(flatStyle(tabHost('Preview'))).toMatchObject({ flexGrow: 0, flexShrink: 0 })
    await measureTabs({ Code: 430, Preview: 714 })
    expect(flatStyle(tabHost('Preview')).minWidth).toBe(714)
  })
})
