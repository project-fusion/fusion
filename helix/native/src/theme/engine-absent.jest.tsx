import { describe, expect, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import type { Tokens } from './drawn'
import { deriveOnDevice, themeModule } from './engine'
import { HelixTheme, useTokens } from './helix-theme'
import { light } from './light.generated'

/** What a probe inside a theme read: the values an app's own styles take. */
interface Read {
  values?: Tokens
}

const Probe = ({ read }: { readonly read: Read }) => {
  read.values = useTokens()
  return null
}

describe('HelixTheme with seeds, where there is no native module, as in Expo Go and Jest', () => {
  test('finds no module, and derives nothing', () => {
    expect(themeModule()).toBeNull()
    expect(deriveOnDevice({ brand: '#3b82f6' })).toBeNull()
  })

  test('draws the colors derived at build time, and the tokens an app lays over them', async () => {
    const read: Read = {}
    await render(
      <HelixTheme
        mode="light"
        seeds={{ brand: '#3b82f6' }}
        tokens={{ light: { 'color-accent': '#db2777' } }}
      >
        <Probe read={read} />
      </HelixTheme>,
    )
    expect(read.values?.['color-primary']).toBe(light['color-primary'])
    expect(read.values?.['color-background']).toBe(light['color-background'])
    expect(read.values?.['color-accent']).toBe('#db2777')
  })

  test('leaves seeds the engine would refuse unread, since there is no engine to refuse them', async () => {
    const read: Read = {}
    await render(
      <HelixTheme mode="light" seeds={{ brand: 255 as unknown as string }}>
        <Probe read={read} />
      </HelixTheme>,
    )
    expect(read.values?.['color-primary']).toBe(light['color-primary'])
  })
})
