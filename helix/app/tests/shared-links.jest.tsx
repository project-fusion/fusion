import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
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
  test('under data-link="quiet" has no line under it', async () => {
    await drawn(jsx('a', { children: 'Home', 'data-link': 'quiet', href: '#home' }))
    expect(styleOf('Home').textDecorationLine).toBeUndefined()
  })

  test('with no recipe is underlined', async () => {
    await drawn(jsx('a', { children: 'Home', href: '#home' }))
    expect(styleOf('Home').textDecorationLine).toBe('underline')
  })

  test('under data-button is a button', async () => {
    await drawn(jsx('a', { children: 'Visit', 'data-button': 'solid', href: '#visit' }))
    expect(screen.getByRole('button', { name: 'Visit' })).toBeTruthy()
  })
})
