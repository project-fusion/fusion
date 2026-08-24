#!/usr/bin/env bun
/**
 * Writes `docs/component-reference.md` from the manifest.
 *
 * **Unnumbered, and that is the point of the name.** It sat at
 * `11-component-reference.md`, taking a slot in the 00 to 99 strategy sequence
 * because that is where prose about this repository already lived, and it
 * arrived there in `2812a45f` beside a List port rather than by decision. A
 * sequence number is a reading order for documents somebody wrote; this one is
 * written by a script and nobody reads it in order. `docs/` is still the right
 * folder: it is repository-internal, which is exactly what this is, and moving
 * it under `helix/` would either publish a whole-library download that
 * `coding-agents.mdx` argues against or leave it somewhere with no reader.
 *
 * The document it replaces was transcribed by hand, and had drifted in both
 * directions at once: missing `Divider`, `Menu`, `Tree`, `Flex`, `Grid` and
 * `TableColumn`, while still describing a `Clock`, a `Combobox`, a `CopyButton`
 * and a `DatePicker` that this repository has never had. Both faults are the
 * same fault. A reference maintained by retyping is a second source of truth
 * for something that already has one, and the copy is always the stale one.
 *
 * **The rendering is not here any more.** It is `reference()` in
 * `@helix-io/docs`, because a manifest-to-markdown renderer is documentation
 * for Helix rather than a build step of this repository: a consumer installing
 * the docs package should get the component reference along with the prose, and
 * this script should be one of its readers rather than its owner. What is left
 * here is reading a file and writing a file, which is the half a pure package
 * must not do.
 *
 * Run under `bun` rather than `node`, so it imports the package's TypeScript
 * directly. `verify` runs `typecheck` rather than `build`, so a `dist` this
 * depended on would be whatever the last build left behind.
 *
 * Run `bun run reference` to write it, and `bun run check:reference` to fail
 * when it is behind. `verify` runs the check rather than the writer, for the
 * same reason it runs `biome ci`: a step that edits your files cannot tell you
 * whether they were right.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { reference, referenceFamilies } from '../../helix/docs/src/reference.ts'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MANIFEST = 'helix/web/custom-elements.json'
const OUTPUT = 'docs/component-reference.md'

const manifest = JSON.parse(readFileSync(join(ROOT, MANIFEST), 'utf8'))

const written = reference(manifest, {
  lede: [
    `*Generated from \`${MANIFEST}\` by \`bun run reference\`. Do`,
    'not edit: `bun run check:reference` fails when this file and the manifest',
    'disagree, and the manifest is regenerated from the source on every build.*',
    '',
    'The styled tier, which is what an application writes. Every styled component',
    'extends a headless one and inherits its API, so anything a base contributes is',
    'here too, with the base named in the "From" column. The prose behind each of',
    'these lives on the component itself and is rendered in full at',
    '`/components/<family>`.',
    '',
  ],
  title: 'Component reference',
})

const families = referenceFamilies(manifest).length
const output = join(ROOT, OUTPUT)

if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== written) {
    console.error(
      `${OUTPUT} is behind the manifest. Run \`bun run reference\` and commit the result.`,
    )
    process.exit(1)
  }
  console.log(`reference: ${families} families, current`)
} else {
  writeFileSync(output, written)
  console.log(`reference: ${families} families written to ${OUTPUT}`)
}
