/*
 * The generated Breadcrumbs, drawn from its real intermediate forms: a list
 * named by its label, each crumb a link that opens through the app's
 * open-link, the current page said in words after its own, separators a
 * screen reader passes over, and space that stops growing at the largest
 * standard text size while the words grow on. `test:native` writes the
 * components beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { type FakeOpenLink, fakeOpenLink } from '@fusion.dev/helix-core/capabilities/open-link/fake'
import { clearWords, registerWords } from '@fusion.dev/helix-core/words'
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import type { GlyphProps } from '../theme/theme'
import {
  HelixBreadcrumb,
  type HelixBreadcrumbProps,
  HelixBreadcrumbs,
} from './breadcrumbs/index.native'
import { HelixButton } from './button/index.native'

/** A glyph that shows what it was asked to draw, as a view a spec can read. */
const Recorded = ({ color, name, size }: GlyphProps) => (
  <View style={{ backgroundColor: color, height: size, width: size }} testID={`glyph ${name}`} />
)

/** Sets the reader's text size, as iOS and Android report a change to it. */
const atTextSize = (fontScale: number): void => {
  Dimensions.set({
    screen: { ...Dimensions.get('screen'), fontScale },
    window: { ...Dimensions.get('window'), fontScale },
  })
}

let opened: FakeOpenLink = fakeOpenLink()

/* React Native's Jest setup reports a font scale of 2, and a spec starts at the default size. */
beforeEach(() => {
  atTextSize(1)
  setFocus(fakeFocus<unknown>())
  setKeys(fakeKeys<unknown>())
  opened = fakeOpenLink()
  setOpenLink(opened)
})

afterEach(() => {
  clearWords()
})

/** What a view is drawn with, flattened. */
const styleOf = (view: { props: { style?: unknown } } | null | undefined) =>
  StyleSheet.flatten(view?.props.style as never) as Readonly<Record<string, unknown>>

/** A drawn tree, as `toJSON` gives it. */
interface Json {
  readonly children?: readonly (Json | string)[] | null
  readonly props: Readonly<Record<string, unknown>>
}

/** Each view in a drawn tree, depth first. */
const views = (tree: Json | readonly Json[] | null = screen.toJSON() as Json | null): Json[] => {
  const nodes: readonly Json[] = tree === null ? [] : Array.isArray(tree) ? tree : [tree as Json]
  return nodes.flatMap((node) => [
    node,
    ...views((node.children ?? []).filter((child): child is Json => typeof child !== 'string')),
  ])
}

/** A drawn view and its parents, as the testing library gives them. */
interface Drawn {
  readonly parent: Drawn | null
  readonly props: Readonly<Record<string, unknown>>
}

/** The view a screen reader reaches as one element around `drawn`. */
const elementAround = (drawn: Drawn): Drawn | null =>
  drawn.props.accessible === true
    ? drawn
    : drawn.parent === null
      ? null
      : elementAround(drawn.parent)

/** The element around the words `text`. */
const reached = (text: string): Drawn | null => elementAround(screen.getByText(text) as Drawn)

const themed = (children: ReactNode) => (
  <HelixTheme Glyph={Recorded} mode="light">
    {children}
  </HelixTheme>
)

/** Home, Docs, and Install, the current page, which has an `href` of its own. */
const Trail = (props: { readonly docs?: Partial<HelixBreadcrumbProps>; readonly label?: string }) =>
  themed(
    <HelixBreadcrumbs {...(props.label === undefined ? {} : { label: props.label })}>
      <HelixBreadcrumb href="/home">Home</HelixBreadcrumb>
      <HelixBreadcrumb href="/docs" {...props.docs}>
        Docs
      </HelixBreadcrumb>
      <HelixBreadcrumb current href="/install">
        Install
      </HelixBreadcrumb>
    </HelixBreadcrumbs>,
  )

/** Each separator's glyph, which is the crumb's chevron. */
const chevrons = () => screen.getAllByTestId('glyph caret-right', { includeHiddenElements: true })

describe('the generated Breadcrumbs', () => {
  test('is a navigation named by its label, `Breadcrumb` until it is given one, around a list of crumbs', async () => {
    const view = await render(<Trail />)
    const landmarks = () => views().filter((node) => node.props.role === 'navigation')
    expect(landmarks().map((node) => node.props.accessibilityLabel)).toEqual(['Breadcrumb'])
    expect(views().filter((node) => node.props.accessibilityRole === 'list')).toHaveLength(1)
    expect(views().filter((node) => node.props.role === 'listitem')).toHaveLength(3)
    await view.rerender(<Trail label="Where you are" />)
    expect(landmarks().map((node) => node.props.accessibilityLabel)).toEqual(['Where you are'])
  })

  test('draws each crumb with an `href` as a link named by its words', async () => {
    await render(<Trail />)
    expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Docs' })).toBeTruthy()
  })

  test('says the current page in words after its own, and draws it as no link', async () => {
    await render(<Trail />)
    expect(screen.queryByRole('link', { name: 'Install' })).toBeNull()
    expect(reached('Install')?.props.accessibilityValue).toEqual({ text: 'Current page' })
    expect(
      (reached('Docs')?.props.accessibilityValue as { text?: string } | undefined)?.text,
    ).toBeUndefined()
  })

  test('says the current page in the words an app registers', async () => {
    registerWords('en', { 'helix-current': { page: 'You are here' } })
    await render(<Trail />)
    expect(reached('Install')?.props.accessibilityValue).toEqual({ text: 'You are here' })
  })

  test('draws a crumb with no `href` as its words, which no press holds', async () => {
    await render(<Trail docs={{ href: '' }} />)
    expect(screen.queryByRole('link', { name: 'Docs' })).toBeNull()
    expect(reached('Docs')).toBeNull()
  })

  test('sends `select` with the `href` as its value, then opens the link through open-link', async () => {
    const told: unknown[] = []
    await render(
      <Trail
        docs={{ onSelect: (event) => told.push((event.detail as { value: unknown }).value) }}
      />,
    )
    await fireEvent.press(screen.getByRole('link', { name: 'Docs' }))
    expect(told).toEqual(['/docs'])
    expect(opened.opened).toEqual(['/docs'])
  })

  test('opens nothing where a handler refused `select`', async () => {
    await render(<Trail docs={{ onSelect: (event) => event.preventDefault() }} />)
    await fireEvent.press(screen.getByRole('link', { name: 'Docs' }))
    expect(opened.opened).toEqual([])
  })

  test('hides each separator from screen readers, and draws none before the first crumb', async () => {
    await render(<Trail />)
    const marks = chevrons()
    expect(marks).toHaveLength(3)
    for (const mark of marks) {
      expect(screen.queryAllByTestId('glyph caret-right')).not.toContain(mark)
    }
    const separator = (at: number) => (marks[at] as unknown as Drawn).parent?.parent
    expect(styleOf(separator(0) as never).display).toBe('none')
    expect(styleOf(separator(1) as never).display).not.toBe('none')
  })

  test('draws a slash in the chevron’s box under `separator="slash"`, hidden from screen readers', async () => {
    await render(
      themed(
        <HelixBreadcrumbs separator="slash">
          <HelixBreadcrumb href="/home">Home</HelixBreadcrumb>
          <HelixBreadcrumb current href="/docs">
            Docs
          </HelixBreadcrumb>
        </HelixBreadcrumbs>,
      ),
    )
    /* A slash before each crumb, and each chevron put away. */
    const all = views()
    const slashes = all.filter((node) => node.children?.includes('/') === true)
    expect(slashes).toHaveLength(2)
    for (const mark of chevrons()) {
      expect(styleOf((mark as unknown as Drawn).parent as never).display).toBe('none')
    }
    /* The slash is centered in a box an em of the crumb's words wide. */
    const slash = slashes[1] as Json
    const box = all.find((node) => node.children?.includes(slash) === true)
    const size = styleOf(slash as never).fontSize as number
    expect(styleOf(slash as never).textAlign).toBe('center')
    expect(styleOf(box as never).width).toBe(size)
    /* A screen reader passes over it, as it does the chevron. */
    expect(screen.queryAllByText('/')).toEqual([])
  })

  test('draws a control in `end` beside the link, as a control of its own', async () => {
    await render(
      themed(
        <HelixBreadcrumbs>
          <HelixBreadcrumb end={<HelixButton>Switch</HelixButton>} href="/acme">
            acme
          </HelixBreadcrumb>
        </HelixBreadcrumbs>,
      ),
    )
    const link = screen.getByRole('link', { name: 'acme' })
    const button = screen.getByRole('button', { name: 'Switch' })
    expect(elementAround(button as unknown as Drawn)).not.toBe(link)
  })

  test('grows its words fully with the text size, and stops its separators at 1.353 times', async () => {
    await render(<Trail />)
    const words = styleOf(screen.getByText('Docs')).fontSize as number
    const mark = styleOf(chevrons()[1]).height as number
    await act(() => atTextSize(3.571))
    expect(styleOf(screen.getByText('Docs')).fontSize as number).toBeCloseTo(words * 3.571, 1)
    expect(styleOf(chevrons()[1]).height as number).toBeCloseTo(mark * 1.353, 1)
  })
})
