import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { VERSION } from './version.js'

test('the version constant is the one package.json carries', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  expect(VERSION).toBe(manifest.version)
})
