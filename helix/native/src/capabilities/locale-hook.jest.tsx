import { locale, setLocale } from '@fusion.dev/helix-core/capabilities/locale'
import { afterEach, describe, expect, test } from '@jest/globals'
import { act, render, screen } from '@testing-library/react-native'
import { Text } from 'react-native'
import { useLocale } from './locale'

/** A locale a spec changes, telling each observer. */
const changing = (start: string) => {
  let now = start
  const heard = new Set<(next: string) => void>()
  return {
    change: (next: string) => {
      now = next
      for (const one of heard) {
        one(next)
      }
    },
    observe: (changed: (next: string) => void) => {
      heard.add(changed)
      return () => {
        heard.delete(changed)
      }
    },
    read: () => now,
  }
}

const Shown = ({ own }: { readonly own?: string }) => <Text testID="locale">{useLocale(own)}</Text>

const before = locale()

afterEach(() => {
  setLocale(before)
})

describe('useLocale', () => {
  test('gives the reader’s locale, and draws again when it changes', async () => {
    const system = changing('en-US')
    setLocale(system)
    await render(<Shown />)
    expect(screen.getByTestId('locale')).toHaveTextContent('en-US')
    await act(async () => system.change('fr-FR'))
    expect(screen.getByTestId('locale')).toHaveTextContent('fr-FR')
  })

  test('gives a component’s own locale where it names one', async () => {
    setLocale(changing('en-US'))
    await render(<Shown own="pl" />)
    expect(screen.getByTestId('locale')).toHaveTextContent('pl')
  })
})
