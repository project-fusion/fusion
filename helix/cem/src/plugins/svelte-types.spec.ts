import { describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { svelteTypes } from './svelte-types.js'

/**
 * The plugin reads the tag map the JSX generator wrote, so the test writes one.
 *
 * A fixture, since the real `jsx.d.ts` is rebuilt by `analyze`: asserting
 * against it would test whether somebody had run the build.
 */
const GENERATED = `export type CustomElements = {
  "helix-callout": Partial<
    {
      tone?: {
        "danger": string;
        "success": string;
      };
    } & BaseProps<HelixCallout>
  >;
  "helix-input": Partial<HelixInputProps & BaseProps<HelixInput> & BaseEvents<HelixInput>>;
};
`

const scene = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'svelte-types-'))
  writeFileSync(join(dir, 'jsx.d.ts'), GENERATED)
  const was = process.cwd()
  process.chdir(dir)
  try {
    svelteTypes({ packageName: '@fusion.dev/helix' }).packageLinkPhase?.({} as never)
    return readFileSync(join(dir, 'svelte.d.ts'), 'utf8')
  } finally {
    process.chdir(was)
    rmSync(dir, { force: true, recursive: true })
  }
}

describe('the Svelte augmentation', () => {
  test('declares each tag in the map, and no key nested inside a prop', () => {
    const written = scene()
    expect(written).toContain("'helix-callout': Helix<'helix-callout'>")
    expect(written).toContain("'helix-input': Helix<'helix-input'>")
    expect(written).not.toContain("'danger'")
    expect(written).not.toContain("'success'")
  })

  test("takes Svelte's own attributes, and leaves out React's spellings", () => {
    const written = scene()
    expect(written).toContain("import type { HTMLAttributes } from 'svelte/elements'")
    expect(written).toContain('HTMLAttributes<ElementOf<Tag>> & {')
    expect(written).toContain('`on${Uppercase<string>}${string}`')
    expect(written).toContain(
      "'className' | 'htmlFor' | 'key' | 'ref' | 'suppressHydrationWarning'",
    )
  })
})
