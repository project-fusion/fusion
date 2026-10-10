import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { initTheme, type ThemeIntent } from './index.js'

/** The tracked module, read as Node reads it: as bytes. */
const module = readFileSync(new URL('../wasm/fusion_helix_theme_bg.wasm', import.meta.url))

/* The engine is loaded once per process, so the failed load runs first. */
test('a load that fails is shared by the callers waiting on it, and a retry loads the engine', async () => {
  const broken = new Uint8Array([0, 1, 2, 3])
  const first = initTheme(broken)
  expect(initTheme(broken)).toBe(first)
  const failure = await first.then(
    () => undefined,
    (error: unknown) => error,
  )
  expect(failure).toBeInstanceOf(WebAssembly.CompileError)

  const engine = await initTheme(module)
  expect(engine.hexToOklch('#ffffff').lightness).toBeCloseTo(1, 6)
  expect(await initTheme(module)).toBe(engine)
})

test('a number JSON cannot carry is refused by its field, where it would otherwise read as unset', async () => {
  const engine = await initTheme(module)
  expect(() => engine.derive({ density: Number.NaN })).toThrow(
    'density must be a finite number, received NaN',
  )
  expect(() => engine.deriveModes({ font: { base: Number.POSITIVE_INFINITY } })).toThrow(
    'font.base must be a finite number, received Infinity',
  )
  expect(() =>
    engine.derive({
      pairings: [
        { background: 'color-surface', foreground: 'color-foreground', target: Number.NaN },
      ],
    }),
  ).toThrow('pairings[0].target must be a finite number, received NaN')
  expect(engine.derive({ density: 0.875 }).seeds['seed-density']).toBe('0.875')
})

/** What a call that throws says. */
const refusal = (call: () => unknown): string => {
  try {
    call()
  } catch (error) {
    return (error as Error).message
  }
  throw new Error('the call did not throw')
}

test('the engine refuses a number outside its range, and a value it cannot read, by its field', async () => {
  const engine = await initTheme(module)
  expect(refusal(() => engine.derive({ font: { base: 0 } }))).toBe('font.base must be positive')
  expect(refusal(() => engine.deriveModes({ material: { opacity: 2 } }))).toBe(
    'material.opacity must be between 0 and 1',
  )
  expect(refusal(() => engine.derive({ brand: 255 } as unknown as ThemeIntent))).toBe(
    'brand is not a color this engine can read, or one for each scheme, received 255',
  )
  expect(refusal(() => engine.derive({ contrastTarget: '4.5' } as unknown as ThemeIntent))).toBe(
    'contrastTarget: invalid type: string "4.5", expected a number',
  )
})

test('the engine refuses a namespace that is not a token prefix, with the value it received', async () => {
  const engine = await initTheme(module)
  expect(refusal(() => engine.derive({ namespace: '--my' }))).toBe(
    'namespace is not a token prefix of ASCII letters, digits, hyphens, and underscores ' +
      'with no hyphen at either end, received "--my"',
  )
  expect(refusal(() => engine.deriveModes({ namespace: '' }))).toEndWith('received ""')
  expect(refusal(() => engine.derive({ namespace: 'a b;}' }))).toEndWith('received "a b;}"')
  expect(engine.derive({ namespace: 'my-brand' }, [':root']).css[':root']).toContain(
    '\n  --my-brand-color-background: #ffffff;',
  )
})

test('the engine refuses a status hue outside its band, and names the band', async () => {
  const engine = await initTheme(module)
  expect(refusal(() => engine.derive({ status: { danger: { hue: 140 } } }))).toBe(
    'status.danger.hue must be between 15 and 40 degrees, the reds from crimson to red-orange, ' +
      'received 140',
  )
  expect(refusal(() => engine.deriveModes({ status: { danger: { hue: 999 } } }))).toEndWith(
    'received 999',
  )
  expect(refusal(() => engine.derive({ status: { info: { hue: 300 } } }))).toBe(
    'status.info.hue must be between 200 and 280 degrees, cyan and blue to indigo, received 300',
  )
  const crimson = engine.derive({ status: { allowance: 0, danger: { hue: 20 } } })
  const danger = crimson.tokens.find((token) => token.name === 'color-danger')
  expect(Math.abs((danger?.value.hue ?? 0) - 20)).toBeLessThan(1)
})
