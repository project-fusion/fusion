// The set first, so a name resolves from the first render.
import './set.js'

export {
  type IconLibraryOptions,
  type IconResolver,
  registerIconLibrary,
  registerIcons,
  resolveIcon,
} from './registry.js'
export * from './root/icon-root.js'
