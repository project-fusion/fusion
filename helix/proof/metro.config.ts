/* Metro for the proof app, inside the workspace.

   **Metro watches the packages the app reaches and nothing else.** Expo's
   default for a workspace is the whole repository, which is the Rust build
   directory and every site build too. The app reaches the workspace packages
   it depends on, and theirs, through the links in the root `node_modules`.

   **On a phone, the app's JSX goes through `@fusion.dev/helix/jsx-runtime`**,
   which draws each `helix-*` tag as the native component of that name and,
   in a development build, warns about a tag a phone does not draw. The web
   build keeps React's own runtime, so each tag is the web element. */
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
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

/** The app's own files: its routes and its modules. */
const own = [join(here, 'app'), join(here, 'src')].map((directory) => `${directory}${sep}`)

const base = getDefaultConfig(here)

type Resolve = NonNullable<typeof base.resolver.resolveRequest>

const resolveRequest: Resolve = (context, moduleName, platform) => {
  const shared = own.some((directory) => context.originModulePath.startsWith(directory))
  if (
    platform !== 'web' &&
    shared &&
    (moduleName === 'react/jsx-runtime' || moduleName === 'react/jsx-dev-runtime')
  ) {
    return context.resolveRequest(context, '@fusion.dev/helix/jsx-runtime', platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

export default {
  ...base,
  resolver: { ...base.resolver, resolveRequest },
  watchFolders: [modules, ...reached(here, new Set())],
}
