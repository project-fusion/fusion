import type { NativeFamily } from '@/utils/native-reference/native-reference'
import generated from './native.generated.json'

/**
 * The React Native reference, imported rather than read, as the catalog is.
 *
 * `turbo run native-reference` writes the file imported above from the modules
 * `helix family components` writes, and the site runs it before `next build`
 * and `next dev`.
 */
export type {
  NativeComponent,
  NativeEvent,
  NativeFamily,
  NativeField,
  NativeProp,
  NativeRegion,
} from '@/utils/native-reference/native-reference'

/** Every family Helix draws on React Native. */
export const getNativeFamilies = (): NativeFamily[] => generated as NativeFamily[]

/** The family `slug` on React Native, or `undefined` where Helix draws it on the web only. */
export const findNative = (slug: string): NativeFamily | undefined =>
  getNativeFamilies().find((family) => family.slug === slug)
