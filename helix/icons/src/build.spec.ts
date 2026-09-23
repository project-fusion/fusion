import { afterEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from './build.js'

/**
 * A set that is not Phosphor, which is the whole claim this generator makes.
 *
 * **Drawn here rather than checked in.** The glyphs are two lines each and the
 * point of them is their shape: a 24 box rather than a 256 one, a title to be
 * dropped, and a name carrying a weight in it. Written into the directory the
 * test is about to read, so nothing about them can drift from what is asserted
 * and the package ships no fixtures.
 */
const PEAK =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Peak</title><path d="M12 2 2 22h20Z" fill="currentColor"/></svg>'
const RING =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/></svg>'

const scratch: string[] = []

/** A directory holding the drawings, and a path to write the module to. */
const planted = (files: Record<string, string> = { 'peak.svg': PEAK, 'ring-heavy.svg': RING }) => {
  const at = mkdtempSync(join(tmpdir(), 'helix-icons-'))
  scratch.push(at)
  const drawings = join(at, 'drawings')
  mkdirSync(drawings)
  for (const [file, svg] of Object.entries(files)) {
    writeFileSync(join(drawings, file), svg)
  }
  return { directory: drawings, out: join(at, 'icons.generated.ts') }
}

afterEach(() => {
  for (const at of scratch.splice(0)) {
    rmSync(at, { force: true, recursive: true })
  }
})

describe('a set of somebody else\u2019s drawings', () => {
  test('every glyph in a directory, with its own box', () => {
    const { directory, out } = planted()
    expect(build({ out, sources: [{ directory }] })).toBe(2)
    const module = readFileSync(out, 'utf8')

    expect(module).toContain('export const peak: HelixIcon')
    expect(module).toContain('export const ringHeavy: HelixIcon')
    expect(module).toContain("viewBox: '0 0 24 24'")
    /* The type comes from the package a consumer installed, rather than from a
       relative path that only resolves inside this repository. Matched rather
       than compared, because a spec holding its own package's specifier as a
       string reads to `fusion spec`'s `hazards` exactly like one importing it. */
    expect(module).toMatch(/import type \{ HelixIcon \} from '[^']*helix-icons'/)
  })

  test('a title is dropped, the component naming the icon instead', () => {
    const { directory, out } = planted()
    build({ out, sources: [{ directory }] })
    expect(readFileSync(out, 'utf8')).not.toContain('<title>')
  })

  test('a list takes the glyphs it names and leaves the rest', () => {
    const { directory, out } = planted()
    expect(build({ names: ['peak'], out, sources: [{ directory }] })).toBe(1)
    expect(readFileSync(out, 'utf8')).not.toContain('ringHeavy')
  })

  test('a weight spelled into the file name is read through the suffix', () => {
    const { directory, out } = planted({ 'peak-heavy.svg': PEAK })
    expect(build({ out, sources: [{ directory, suffix: '-heavy' }] })).toBe(1)
    /* The name is the glyph's, not the file's: a consumer imports `peak` from
       the heavy set rather than `peakHeavy` from anywhere. */
    expect(readFileSync(out, 'utf8')).toContain('export const peak: HelixIcon')
  })

  test('the index is written only when it is asked for', () => {
    const plain = planted()
    build({ out: plain.out, sources: [{ directory: plain.directory }] })
    expect(readFileSync(plain.out, 'utf8')).not.toContain('export const icons')

    const indexed = planted()
    build({ index: true, out: indexed.out, sources: [{ directory: indexed.directory }] })
    expect(readFileSync(indexed.out, 'utf8')).toContain('export const icons')
  })

  test('a name nothing draws is refused, and says where it looked', () => {
    const { directory, out } = planted()
    expect(() => build({ names: ['nothing'], out, sources: [{ directory }] })).toThrow(
      /no SVG for "nothing"/,
    )
  })

  test('a name two sources draw is refused rather than decided', () => {
    /* Two sets that both draw a `peak`, where the order between them is what
       nothing would report. */
    const { directory, out } = planted()
    expect(() => build({ out, sources: [{ directory }, { directory }] })).toThrow(
      /resolves to 2 files/,
    )
  })
})
