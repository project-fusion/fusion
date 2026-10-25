/*
 * The generated Accordion and Accordion Item, drawn from their real
 * intermediate forms: a trigger inside a heading that says it is expanded or
 * collapsed, `before-open` and `before-close` that a handler may refuse,
 * content kept drawn and out of a screen reader's reach while closed, the
 * set's modes, a chevron that turns and stands where `chevron-placement`
 * says, and the seams and frames of `separation`. `test:native` writes the
 * components beside this file.
 */
import { setFocus } from '@fusion.dev/helix-core/capabilities/focus'
import { type FakeFocus, fakeFocus } from '@fusion.dev/helix-core/capabilities/focus/fake'
import { setKeys } from '@fusion.dev/helix-core/capabilities/keys'
import { type FakeKeys, fakeKeys } from '@fusion.dev/helix-core/capabilities/keys/fake'
import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ReactNode } from 'react'
import { Text } from 'react-native'
import { HelixTheme } from '../theme/helix-theme'
import { light } from '../theme/light.generated'
import { HelixAccordion, HelixAccordionItem } from './accordion/index.native'
import { type Drawn, nodes, styleOf } from './drawn'

let keys: FakeKeys<unknown> = fakeKeys()
let focus: FakeFocus<unknown> = fakeFocus()
/* The views listening for keys, each once, in the order they first started. */
let heardOn: unknown[] = []

beforeEach(() => {
  focus = fakeFocus<unknown>()
  setFocus(focus)
  const fake = fakeKeys<unknown>()
  heardOn = []
  keys = {
    ...fake,
    listen: (node, hear) => {
      if (!heardOn.includes(node)) {
        heardOn.push(node)
      }
      return fake.listen(node, hear)
    },
  }
  setKeys(keys)
})

/** Presses `key` on the trigger that started listening `at`th. */
const pressKey = (at: number, key: string) => act(() => void keys.press(heardOn[at], key))

/** Which trigger focus moved to last, by the order they started listening. */
const focusedAt = (): number => heardOn.indexOf(focus.moved.at(-1)?.node)

const themed = (children: ReactNode) => <HelixTheme mode="light">{children}</HelixTheme>

type Heard = (name: string, value: string, event: { preventDefault: () => void }) => void

/** Shipping open, then Returns and Sizes closed, under the accordion's props. */
const drawn = (
  props: Readonly<Record<string, unknown>>,
  heard: Heard = () => undefined,
  item: Readonly<Record<string, unknown>> = {},
) =>
  themed(
    <HelixAccordion {...props}>
      {['Shipping', 'Returns', 'Sizes'].map((words) => (
        <HelixAccordionItem
          defaultOpen={words === 'Shipping'}
          key={words}
          onBeforeClose={(event) => heard('before-close', words, event)}
          onBeforeOpen={(event) => heard('before-open', words, event)}
          summary={<Text>{words}</Text>}
          {...item}
        >
          <Text>{`${words} words`}</Text>
        </HelixAccordionItem>
      ))}
    </HelixAccordion>,
  )

/** The trigger around a summary: the nearest node that says whether it is expanded. */
const trigger = (words: string): Drawn => {
  const all = nodes(screen.toJSON())
  const text = all.find((node) => node.type === 'Text' && node.children?.[0] === words)
  const around = all.filter(
    (node) =>
      (node.props.accessibilityState as { expanded?: boolean } | undefined)?.expanded !==
        undefined && nodes(node).includes(text as Drawn),
  )
  const found = around.at(-1)
  if (found === undefined) {
    throw new Error(`no trigger around "${words}"`)
  }
  return found
}

const expanded = (words: string): boolean =>
  (trigger(words).props.accessibilityState as { expanded?: boolean }).expanded === true

const press = async (words: string) => {
  await fireEvent.press(screen.getByText(words))
  await act(async () => undefined)
}

/** How a chevron is turned: the last scale on its height. */
const turned = (chevron: Drawn): number | undefined =>
  (styleOf(chevron).transform as readonly Readonly<Record<string, unknown>>[])
    .map((one) => one.scaleY)
    .filter((one): one is number => typeof one === 'number')
    .at(-1)

/** The chevrons drawn: the boxes turned by a transform. */
const chevrons = (): Drawn[] =>
  nodes(screen.toJSON()).filter((node) => styleOf(node).transform !== undefined)

describe('the generated Accordion', () => {
  test('draws each trigger inside a heading, and says whether it is expanded', async () => {
    await render(drawn({}))
    expect(expanded('Shipping')).toBe(true)
    expect(expanded('Returns')).toBe(false)
    const headers = nodes(screen.toJSON()).filter(
      (node) => node.props.accessibilityRole === 'header',
    )
    expect(headers).toHaveLength(3)
    expect(trigger('Returns').props.accessibilityRole).toBe('button')
  })

  test('opens a section with before-open, and a refused close keeps it open', async () => {
    const heard = jest.fn<Heard>((name, _words, event) => {
      if (name === 'before-close') {
        event.preventDefault()
      }
    })
    await render(drawn({}, heard))
    await press('Returns')
    expect(expanded('Returns')).toBe(true)
    await press('Shipping')
    expect(expanded('Shipping')).toBe(true)
    expect(heard.mock.calls.map(([name, words]) => `${name} ${words}`)).toEqual([
      'before-open Returns',
      'before-close Shipping',
    ])
  })

  test('keeps closed content drawn and out of what a screen reader reaches', async () => {
    await render(drawn({}))
    expect(screen.getByText('Shipping words')).toBeTruthy()
    expect(screen.queryByText('Returns words')).toBeNull()
    expect(screen.getByText('Returns words', { includeHiddenElements: true })).toBeTruthy()
  })

  test('closes the open section as another opens under single-collapsible', async () => {
    await render(drawn({ mode: 'single-collapsible' }))
    await press('Sizes')
    expect([expanded('Shipping'), expanded('Sizes')]).toEqual([false, true])
    await press('Sizes')
    expect(expanded('Sizes')).toBe(false)
  })

  test('opens the first section under single where none is open, and keeps it open', async () => {
    const heard = jest.fn<Heard>()
    await render(drawn({ mode: 'single' }, heard, { defaultOpen: false }))
    expect(expanded('Shipping')).toBe(true)
    await press('Shipping')
    expect(expanded('Shipping')).toBe(true)
    expect(heard).not.toHaveBeenCalled()
  })

  test('turns the chevron as a section opens, at the end unless placed at the start', async () => {
    const view = await render(drawn({}))
    expect(chevrons().map(turned)).toEqual([-1, 1, 1])
    expect(styleOf(chevrons()[1] ?? { props: {} }).marginStart).toBe('auto')
    await view.rerender(drawn({}, undefined, { chevronPlacement: 'start' }))
    expect(styleOf(chevrons()[1] ?? { props: {} }).marginStart).toBeUndefined()
    const first = (trigger('Returns').children ?? [])[0]
    expect(typeof first === 'object' && styleOf(first).transform !== undefined).toBe(true)
  })

  test('draws the chevron in its own subtle ink, as the web does, not the summary’s', async () => {
    const Glyph = ({ color, name }: { readonly color: string; readonly name: string }) => (
      <Text>{`${name} ${color}`}</Text>
    )
    await render(
      <HelixTheme Glyph={Glyph} mode="light">
        <HelixAccordion>
          <HelixAccordionItem summary={<Text>Returns</Text>}>
            <Text>Returns words</Text>
          </HelixAccordionItem>
        </HelixAccordion>
      </HelixTheme>,
    )
    const glyphs = nodes(screen.toJSON())
      .filter((node) => node.type === 'Text')
      .map((node) => node.children?.[0])
    expect(glyphs).toContain(`caret-down ${light['color-foreground-subtle']}`)
  })

  test('draws no chevron under chevron-placement none', async () => {
    await render(drawn({}, undefined, { chevronPlacement: 'none' }))
    expect(chevrons()).toHaveLength(0)
  })

  test('draws no seam between sections, and a frame around each where outlined', async () => {
    const view = await render(drawn({}))
    /* Each section's host, as the accordion draws it. */
    const sections = (): Drawn[] =>
      (nodes(screen.toJSON())[0]?.children ?? []).filter(
        (child): child is Drawn => typeof child !== 'string',
      )
    expect(sections().map((one) => styleOf(one).borderTopWidth ?? 0)).toEqual([0, 0, 0])
    await view.rerender(drawn({ separation: 'outlined' }))
    expect(sections().map((one) => styleOf(one).borderWidth)).toEqual([1, 1, 1])
    expect(styleOf(sections()[0] ?? { props: {} }).borderColor).toBe(light['color-border'])
    expect(styleOf(nodes(screen.toJSON())[0] ?? { props: {} }).gap).toBe(8)
  })

  test('draws a disabled trigger faint, and a press on it opens nothing', async () => {
    await render(drawn({}, undefined, { disabled: true }))
    await press('Returns')
    expect(expanded('Returns')).toBe(false)
    expect(styleOf(trigger('Returns')).opacity).toBe(0.5)
  })

  test('moves focus between the triggers with the arrow keys, Home and End, coming round', async () => {
    await render(drawn({}, undefined, {}))
    expect(heardOn).toHaveLength(3)
    await pressKey(0, 'ArrowDown')
    expect(focusedAt()).toBe(1)
    await pressKey(1, 'ArrowRight')
    expect(focusedAt()).toBe(2)
    await pressKey(2, 'ArrowDown')
    expect(focusedAt()).toBe(0)
    await pressKey(0, 'ArrowUp')
    expect(focusedAt()).toBe(2)
    await pressKey(2, 'Home')
    expect(focusedAt()).toBe(0)
    await pressKey(0, 'End')
    expect(focusedAt()).toBe(2)
    expect(expanded('Sizes')).toBe(false)
  })

  test('says the open trigger is disabled under single, and keeps its stop', async () => {
    await render(drawn({ mode: 'single' }))
    const state = trigger('Shipping').props.accessibilityState as { disabled?: boolean }
    expect(state.disabled).toBe(true)
    expect(trigger('Shipping').props.disabled).toBeUndefined()
    expect((trigger('Returns').props.accessibilityState as { disabled?: boolean }).disabled).toBe(
      false,
    )
  })

  test('names open content as a region by its summary', async () => {
    await render(drawn({}))
    const regions = nodes(screen.toJSON()).filter((node) => node.props.role === 'region')
    expect(regions.map((node) => node.props.accessibilityLabel)).toEqual(['Shipping'])
  })

  test('sends toggle once a section stands the other way, before its peers close', async () => {
    const told: string[] = []
    const log = (words: string) => (event: { detail: Readonly<Record<string, unknown>> }) =>
      told.push(`toggle ${words} ${event.detail.newState} ${event.detail.oldState}`)
    const heard: Heard = (name, words) => told.push(`${name} ${words}`)
    const view = await render(
      themed(
        <HelixAccordion mode="single-collapsible">
          {['Shipping', 'Returns'].map((words) => (
            <HelixAccordionItem
              defaultOpen={words === 'Shipping'}
              key={words}
              onBeforeClose={(event) => heard('before-close', words, event)}
              onBeforeOpen={(event) => heard('before-open', words, event)}
              onToggle={log(words)}
              summary={<Text>{words}</Text>}
            >
              <Text>{`${words} words`}</Text>
            </HelixAccordionItem>
          ))}
        </HelixAccordion>,
      ),
    )
    await press('Returns')
    expect(told).toEqual([
      'before-open Returns',
      'toggle Returns open closed',
      'before-close Shipping',
      'toggle Shipping closed open',
    ])
    told.length = 0
    await view.rerender(drawn({}, undefined, { onToggle: log('any'), open: false }))
    expect(told.filter((one) => one.startsWith('toggle'))).toContain('toggle any closed open')
  })
})
