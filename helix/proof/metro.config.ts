/* Metro for the proof app, inside the workspace.

   **Metro watches the packages the app reaches and nothing else.** Expo's
   default for a workspace is the whole repository, which is the Rust build
   directory and every site build too. The app reaches the workspace packages
   it depends on, and theirs, through the links in the root `node_modules`.

   `babel.config.cjs` gives the app's own files their JSX runtime,
   `@fusion.dev/helix/jsx-runtime`, on the web and on a phone. */
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDefaultConfig } from 'expo/metro-config'

const here = dirname(fileURLToPath(import.meta.url))
const workspace = join(here, '../..')
const modules = join(workspace, 'node_modules')

/** Where a workspace package is, through its link in the root `node_modules`. */
const located = (name: string): string => realpathSync(join(modules, ...name.split('/')))

/** The workspace packages a package depends on, and theirs, by where each one is. */
const reached = (directory: string, found: Set<string>): Set<string> => {
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
  }
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (!range.startsWith('workspace:')) {
      continue
    }
    const at = located(name)
    if (!found.has(at)) {
      found.add(at)
      reached(at, found)
    }
  }
  return found
}

const base = getDefaultConfig(here)

export default {
  ...base,
  watchFolders: [modules, ...reached(here, new Set())],
}
