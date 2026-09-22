#!/usr/bin/env bun
/**
 * `helix-cem`, which each tier's `analyze` runs from its own directory.
 *
 * **Reads `cem.config.ts` and nothing else.** The file says which tier the
 * package ships, whether it publishes framework typings, and under what name;
 * everything else, where the source is and which manifests it is built
 * against, is found rather than configured, because the analyzer found it too
 * and a list in each package would be four more places to keep right.
 *
 * Run under bun, which is what imports the TypeScript config as it stands.
 */
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { analyze, type HelixCemOptions } from './index.js'

const config = join(process.cwd(), 'cem.config.ts')
const { default: options } = (await import(pathToFileURL(config).href)) as {
  default: HelixCemOptions
}
const manifest = analyze(options)
console.log(`helix-cem: wrote custom-elements.json, ${manifest.modules?.length ?? 0} modules`)
