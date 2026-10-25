import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PARTS = [
  'area',
  'buildings',
  'contours',
  'landcover',
  'marker',
  'points',
  'position',
  'raster',
  'root',
  'route',
  'terrain',
]

const read = (path: string) => readFileSync(join(import.meta.dir, path), 'utf8')

/* Each styled element extends the headless one from that part's own entry, so
   a styled entry carries no other layer; the styled family entry imports the
   headless family entry, which registers the whole family as it always did. */
describe('the styled map entries', () => {
  test('the family entry brings the whole headless family', () => {
    expect(read('index.ts')).toContain("import '@fusion.dev/helix-headless/map'")
  })

  for (const part of PARTS) {
    test(`${part} and its own entry bring only ${part}`, () => {
      const own = `from '@fusion.dev/helix-headless/map/${part}'`
      const element = read(`${part}/map-${part}.ts`)
      expect(element).toContain(own)
      expect(element).not.toContain("from '@fusion.dev/helix-headless/map'")
      expect(read(`${part}/index.ts`)).not.toContain('@fusion.dev/helix-headless/map')
    })
  }
})
