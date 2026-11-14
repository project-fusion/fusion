import { HelixRoot } from '@fusion.dev/helix-native'
import { describe, expect, test } from '@jest/globals'
import { render, screen } from '@testing-library/react-native'
import { jsx } from 'helix-shared/jsx-runtime'
import { StyleSheet } from 'react-native'

/* `data-color-mode` in code shared with the web, as an example writes it on
   a header over a dark band, draws the element in that mode on a phone. */

/** The color the words are drawn in. */
const colorOf = (words: string): unknown =>
  (StyleSheet.flatten(screen.getByText(words).props.style) as { color?: unknown }).color

describe('data-color-mode', () => {
  test('draws the element and what it holds in that mode', async () => {
    await render(
      <HelixRoot mode="light">
        {jsx('helix-text', { children: 'Light words' })}
        {jsx('helix-text', { children: 'Dark words', 'data-color-mode': 'dark' })}
      </HelixRoot>,
    )
    expect(colorOf('Dark words')).not.toBe(colorOf('Light words'))
  })

  test('leaves a mode it does not know to the mode around', async () => {
    await render(
      <HelixRoot mode="light">
        {jsx('helix-text', { children: 'Light words' })}
        {jsx('helix-text', { children: 'Other words', 'data-color-mode': 'sepia' })}
      </HelixRoot>,
    )
    expect(colorOf('Other words')).toBe(colorOf('Light words'))
  })
})
