// The small set first, so its names resolve from the first render. See `set.ts`.
import './set.js'

export {
  type IconLibraryOptions,
  type IconResolver,
  registerIconLibrary,
  registerIcons,
  resolveIcon,
} from './registry.js'
export * from './root/icon-root.js'
