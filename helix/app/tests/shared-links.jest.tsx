import { setOpenLink } from '@fusion.dev/helix-core/capabilities/open-link'
import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { jsx, jsxs } from 'helix-shared/jsx-runtime'

/* What shared code writes as words and links: a run of words and `code` is one
   paragraph, and an `a` draws by the recipe a stylesheet gives it on the web. */

const drawn = (element: unknown) => render(<HelixRoot mode="light">{element as never}</HelixRoot>)

const styleOf = (words: string): Record<string, unknown> =>
  Object.assign({}, ...[screen.getByText(words).props.style].flat(9))

describe('words in shared code', () => {
  test('a run of words and code in a list item is one paragraph', async () => {
    await drawn(
      jsxs('helix-list-item', {
        children: ['Pause ', jsx('code', { children: 'orders' }), '.'],
      }),
    )
    /* The code's own text stands inside the same host text as the words. */
    expect(JSON.stringify(screen.toJSON())).toMatch(/"children":\["Pause ",\{/)
  })
})

describe('an a in shared code', () => {
  const opened: string[] = []
  const hearing = () => {
    opened.length = 0
    setOpenLink({ open: (to: string) => opened.push(to) })
  }

  test('opens its link as it is pressed', async () => {
    await drawn(jsx('a', { children: 'Docs', href: 'https://fusion.dev/helix' }))
    hearing()
    await fireEvent.press(screen.getByText('Docs'))
    expect(opened).toEqual(['https://fusion.dev/helix'])
  })

  test('under data-button opens its link as it is pressed', async () => {
    await drawn(jsx('a', { children: 'Visit', 'data-button': 'solid', href: 'https://fusion.dev' }))
    hearing()
    await fireEvent.press(screen.getByRole('button', { name: 'Visit' }))
    expect(opened).toEqual(['https://fusion.dev'])
  })

  test('under data-card opens its link as it is pressed', async () => {
    const card = jsx('helix-card', { children: 'Words' })
    await drawn(jsx('a', { children: card, 'data-card': '', href: 'https://example.com/card' }))
    hearing()
    await fireEvent.press(screen.getByRole('link'))
    expect(opened).toEqual(['https://example.com/card'])
  })

  test('that prevents the default stays where it is', async () => {
    const onClick = (event: { preventDefault: () => void }) => event.preventDefault()
    await drawn(jsx('a', { children: 'Stay', href: 'https://fusion.dev', onClick }))
    hearing()
    let prevented = false
    await fireEvent.press(screen.getByText('Stay'), {
      isDefaultPrevented: () => prevented,
      preventDefault: () => {
        prevented = true
      },
    })
    expect(opened).toEqual([])
  })

  test('under data-link="quiet" has no line under it', async () => {
    await drawn(jsx('a', { children: 'Home', 'data-link': 'quiet', href: '#home' }))
    expect(styleOf('Home').textDecorationLine).toBeUndefined()
  })

  test('with no recipe is underlined', async () => {
    await drawn(jsx('a', { children: 'Home', href: '#home' }))
    expect(styleOf('Home').textDecorationLine).toBe('underline')
  })

  test('under data-card with aria-current gives its card the border color', async () => {
    const borders = async (props: Record<string, unknown>): Promise<string[]> => {
      const card = jsx('helix-card', { children: 'Words' })
      await drawn(jsx('a', { ...props, children: card, 'data-card': '', href: '#one' }))
      return JSON.stringify(screen.toJSON()).match(/"border\w*Color":"[^"]+"/g) ?? []
    }
    const plain = await borders({})
    const held = await borders({ 'aria-current': 'page' })
    expect(plain.length).toBeGreaterThan(0)
    expect(held).not.toEqual(plain)
  })

  test('under data-button is a button', async () => {
    await drawn(jsx('a', { children: 'Visit', 'data-button': 'solid', href: '#visit' }))
    expect(screen.getByRole('button', { name: 'Visit' })).toBeTruthy()
  })
})

describe('data-prose in shared code', () => {
  const passage = (outer: string) =>
    jsxs(outer, {
      children: [
        jsx('h3', { children: 'Roll back' }),
        jsx('ol', {
          children: [jsx('li', { children: 'One' }), jsx('li', { children: 'Two' })],
        }),
        jsx('table', {
          children: [
            jsx('thead', { children: jsx('tr', { children: jsx('th', { children: 'Option' }) }) }),
            jsx('tbody', { children: jsx('tr', { children: jsx('td', { children: 'Fix' }) }) }),
          ],
        }),
      ],
      'data-prose': '',
    })

  test('a heading is a heading, in the size of its recipe', async () => {
    await drawn(passage('div'))
    expect(screen.getByRole('header', { name: 'Roll back' })).toBeTruthy()
    expect(Number(styleOf('Roll back').fontSize)).toBeGreaterThan(18)
  })

  test('a heading in a chat message takes the size of a turn', async () => {
    await drawn(passage('helix-chat-message'))
    expect(Number(styleOf('Roll back').fontSize)).toBeLessThan(18)
  })

  test('a numbered list numbers its items', async () => {
    await drawn(passage('div'))
    expect(screen.getByText('1.', { includeHiddenElements: true })).toBeTruthy()
    expect(screen.getByText('2.', { includeHiddenElements: true })).toBeTruthy()
  })

  test('a table lines its rows up, and a heading cell is quieter', async () => {
    await drawn(passage('div'))
    expect(styleOf('Option').color).not.toEqual(styleOf('Fix').color)
  })
})
