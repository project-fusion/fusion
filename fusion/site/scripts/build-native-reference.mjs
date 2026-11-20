#!/usr/bin/env bun
/**
 * Writes the React Native reference of each family Helix draws natively, which
 * the component pages show under the native platform.
 *
 * **From the modules `helix system components` writes, and from nothing typed
 * here.** `@fusion.dev/helix`'s build writes one module per family into its
 * `native` folder, typed from the intermediate form, the styled manifest, and
 * core's event classes; its `analyze` writes which families are drawn natively,
 * and at what status, into `api.json`. `utils/native-reference` reads both, and
 * the site imports what it returns, so nothing reads the repository at runtime,
 * for the reason `build-catalog.mjs` gives.
 *
 * Generated rather than committed, and held by `--check` like the site's other
 * generated files.
 *
 *   bun scripts/build-native-reference.mjs [--check]
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { emit } from '@fusion.dev/scripts/emit'
import { documented, root } from '@fusion.dev/scripts/workspace'
import { nativeFamilies } from '../utils/native-reference/native-reference.ts'

const OUT = join(root, 'fusion/site/content/native/native.generated.json')
const HINT = 'Run `turbo run native-reference`.'

/* The package the native components ship from. */
const styled = documented().find((one) => one.name === '@fusion.dev/helix')
if (!styled) {
  throw new Error('native reference: no documented package is @fusion.dev/helix')
}
if (!existsSync(join(root, styled.api))) {
  throw new Error(
    `native reference: ${styled.api} is not written yet. ` +
      '`turbo run analyze --filter=@fusion.dev/helix` writes it.',
  )
}

const read = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'))
const api = read(styled.api)
const modules = Object.fromEntries(
  api.families.flatMap((family) => {
    const module = join(root, styled.directory, 'native', family.slug, 'index.native.ts')
    return existsSync(module) ? [[family.slug, readFileSync(module, 'utf8')]] : []
  }),
)
const families = nativeFamilies(api, read(join(styled.directory, 'package.json')), modules)

const check = process.argv.includes('--check')
const { absent, stale } = emit(OUT, `${JSON.stringify(families, null, 2)}\n`, { check, hint: HINT })
if (stale) {
  process.exit(1)
}
const components = families.reduce((total, family) => total + family.components.length, 0)
console.log(
  `native reference: ${families.length} families, ${components} components, ` +
    (absent ? 'absent, so nothing to compare' : check ? 'current' : 'written'),
)
