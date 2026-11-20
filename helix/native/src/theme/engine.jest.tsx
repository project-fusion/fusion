import { describe, expect, jest, test } from '@jest/globals'
import { render } from '@testing-library/react-native'
import { dark } from './dark.generated'
import type { Tokens } from './drawn'
import type { DerivedModes, ThemeModule } from './engine'
import { HelixTheme, useTokens } from './helix-theme'
import { light } from './light.generated'

/**
 * A fake of the native module, deriving a primary from the brand and a page
 * from nothing: the light page a little warm and the dark one a little cool,
 * so a spec tells a derived color from a shipped one. A brand that is not a
 * string is refused as the engine refuses it.
 */
const mockEngine: Required<ThemeModule> = {
  deriveModes: jest.fn((intent: string): DerivedModes => {
    const { brand } = JSON.parse(intent) as { brand?: unknown }
    if (typeof brand !== 'string') {
      throw new Error(
        `brand is not a color this engine can read, or one for each scheme, received ${String(brand)}`,
      )
    }
    return {
      dark: {
        colors: [
          { hex: '#0b0d12', name: 'color-background' },
          { hex: `${brand}cc`, name: 'color-primary' },
        ],
        violations: [],
      },
      light: {
        colors: [
          { hex: '#fffdf8', name: 'color-background' },
          { hex: brand, name: 'color-primary' },
        ],
        violations: [],
      },
    }
  }),
}

jest.mock('expo', () => ({
  requireOptionalNativeModule: (name: string) => (name === 'HelixTheme' ? mockEngine : null),
}))

/** What a probe inside a theme read: the values an app's own styles take. */
interface Read {
  values?: Tokens
}

const Probe = ({ read }: { readonly read: Read }) => {
  read.values = useTokens()
  return null
}

/** The intents the engine was asked for, as the JSON it was given. */
const asked = (): string[] =>
  jest.mocked(mockEngine.deriveModes).mock.calls.map(([intent]) => intent)

describe('HelixTheme with seeds, where the native module has the engine', () => {
  test("derives each mode's colors on the device, and lays them over the shipped ones", async () => {
    const lit: Read = {}
    const dim: Read = {}
    await render(
      <HelixTheme mode="light" seeds={{ brand: '#3b82f6' }}>
        <Probe read={lit} />
        <HelixTheme mode="dark">
          <Probe read={dim} />
        </HelixTheme>
      </HelixTheme>,
    )
    expect(asked()).toContain('{"brand":"#3b82f6"}')
    expect(lit.values?.['color-primary']).toBe('#3b82f6')
    expect(lit.values?.['color-background']).toBe('#fffdf8')
    expect(lit.values?.['color-border']).toBe(light['color-border'])
    expect(dim.values?.['color-primary']).toBe('#3b82f6cc')
    expect(dim.values?.['color-background']).toBe('#0b0d12')
    expect(dim.values?.['color-border']).toBe(dark['color-border'])
  })

  test("lays an app's tokens over the derived colors", async () => {
    const read: Read = {}
    await render(
      <HelixTheme
        mode="light"
        seeds={{ brand: '#c1272d' }}
        tokens={{ light: { 'color-primary': '#7c3aed' } }}
      >
        <Probe read={read} />
      </HelixTheme>,
    )
    expect(read.values?.['color-primary']).toBe('#7c3aed')
    expect(read.values?.['color-background']).toBe('#fffdf8')
  })

  test('derives each intent once, however many times a theme draws with it', async () => {
    const before = asked().length
    const read: Read = {}
    const view = await render(
      <HelixTheme mode="light" seeds={{ brand: '#f59e0b' }}>
        <Probe read={read} />
      </HelixTheme>,
    )
    await view.rerender(
      <HelixTheme mode="dark" seeds={{ brand: '#f59e0b' }}>
        <Probe read={read} />
      </HelixTheme>,
    )
    expect(asked().slice(before)).toEqual(['{"brand":"#f59e0b"}'])
    expect(read.values?.['color-primary']).toBe('#f59e0bcc')
  })

  test("throws the engine's refusal, which names the field", async () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(
        render(<HelixTheme seeds={{ brand: 255 as unknown as string }} />),
      ).rejects.toThrow(
        'brand is not a color this engine can read, or one for each scheme, received 255',
      )
      await expect(
        render(<HelixTheme seeds={{ brand: '#3b82f6', contrastTarget: Number.NaN }} />),
      ).rejects.toThrow('contrastTarget must be a finite number, received NaN')
    } finally {
      quiet.mockRestore()
    }
  })
})
