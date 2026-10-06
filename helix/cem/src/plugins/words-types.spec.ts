import { describe, expect, test } from 'bun:test'
import type { HelixManifest } from '../types.js'
import { renderWords, wordsOf } from './words-types.js'

/** A headless class on the registry and the styled class that inherits it. */
const MANIFEST: HelixManifest = {
  modules: [
    {
      declarations: [
        {
          members: [
            { default: "'helix-combobox'", kind: 'field', name: 'words', static: true },
            {
              default: "'No matches'",
              description: 'Text shown when nothing matches.\n\nA second paragraph.',
              helix: { words: true },
              kind: 'field',
              name: 'emptyText',
            },
            { default: "'off'", kind: 'field', name: 'autocomplete' },
          ],
          name: 'HelixHeadlessCombobox',
        },
        {
          members: [
            { default: "'helix-combobox'", kind: 'field', name: 'words', static: true },
            { default: "'No matches'", helix: { words: true }, kind: 'field', name: 'emptyText' },
          ],
          name: 'HelixCombobox',
        },
        { members: [{ default: "'Hi'", kind: 'field', name: 'greeting' }], name: 'Plain' },
      ],
      path: 'src/combobox/root/combobox-root.ts',
    },
  ],
}

describe('the words a manifest declares', () => {
  test('are keyed by the class’s `words`, once for both tiers', () => {
    const families = wordsOf(MANIFEST)
    expect([...families.keys()]).toEqual(['helix-combobox'])
    expect([...(families.get('helix-combobox')?.keys() ?? [])]).toEqual(['emptyText'])
  })

  test('are typed with their first paragraph and their English', () => {
    const written = renderWords(wordsOf(MANIFEST))
    expect(written).toContain("declare module '@fusion.dev/helix-core' {")
    expect(written).toContain("    'helix-combobox': {")
    expect(written).toContain('       * Text shown when nothing matches.\n')
    expect(written).not.toContain('A second paragraph')
    expect(written).toContain('       * English: `No matches`')
    expect(written).toContain('      emptyText: Message')
    expect(written).not.toContain('autocomplete')
  })
})
