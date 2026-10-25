/* Metro for the gallery, inside the workspace.

   **Metro watches the packages the app reaches and nothing else.** Expo's
   default for a workspace is the whole repository, which is the Rust build
   directory and every site build too. The app reaches the workspace packages
   it depends on, and theirs, through the links in the root `node_modules`.

   **An example is a web `.examples` file run as it is.** The generated
   catalog imports each one as `helix-example:<family>/<slug>`, which resolves
   to that file in `@fusion.dev/helix`, and an example's JSX goes through
   `@fusion.dev/helix/jsx-runtime`, which draws each `helix-*` tag as the
   native component of that name. */
import { existsSync, readFileSync, realpathSync } from 'node:fs'
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

const EXAMPLE = /^helix-example:([a-z0-9-]+)\/([a-z0-9-]+)$/
const examples = join(located('@fusion.dev/helix'), 'src')
const inExample = `${sep}.examples${sep}`
const proof = `${join(here, 'proof')}${sep}`

const base = getDefaultConfig(here)

type Resolve = NonNullable<typeof base.resolver.resolveRequest>

const resolveRequest: Resolve = (context, moduleName, platform) => {
  const example = EXAMPLE.exec(moduleName)
  if (example !== null) {
    const filePath = join(examples, example[1] ?? '', '.examples', `${example[2] ?? ''}.tsx`)
    if (!existsSync(filePath)) {
      throw new Error(`${moduleName} names ${filePath}, which does not exist.`)
    }
    return { filePath, type: 'sourceFile' }
  }
  if (moduleName === 'helix-proof') {
    return { filePath: join(here, 'proof/index.tsx'), type: 'sourceFile' }
  }
  /* **The proof page and the examples are code the gallery shares with the
     web**, so their JSX goes through `@fusion.dev/helix/jsx-runtime`, which
     draws each tag as the native component and warns about one a phone does
     not draw, as an app's would. */
  const shared =
    context.originModulePath.startsWith(proof) || context.originModulePath.includes(inExample)
  if (shared && (moduleName === 'react/jsx-runtime' || moduleName === 'react/jsx-dev-runtime')) {
    return context.resolveRequest(context, '@fusion.dev/helix/jsx-runtime', platform)
  }
  if (context.originModulePath.includes(inExample)) {
    /* An example's stylesheet is the web's alone. */
    if (moduleName.endsWith('.css')) {
      return { type: 'empty' }
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

export default {
  ...base,
  resolver: { ...base.resolver, resolveRequest },
  watchFolders: [modules, ...reached(here, new Set())],
}
