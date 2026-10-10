import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { initTheme } from './index.js'

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
