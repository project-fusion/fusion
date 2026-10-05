/*
 * The element without the set: `@fusion.dev/helix/icon/root`.
 *
 * A name resolves only to glyphs a page registered with `registerIcons`, or
 * through a library it registered with `registerIconLibrary`, so a bundle
 * carries the glyphs it uses. The family's entry registers the whole set.
 */
export {
  type IconResolver,
  registerIconLibrary,
  registerIcons,
  resolveIcon,
} from '@fusion.dev/helix-headless/icon/root'
export * from './icon-root.js'
