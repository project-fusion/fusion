/**
 * The React Native reference of each family Helix draws natively, read from
 * the modules `helix system components` writes into `@fusion.dev/helix`.
 *
 * **Read from what the compiler wrote, and never restated.** A module types
 * its components from the intermediate form, the styled manifest, and core's
 * event classes, so its props, their defaults, its regions, and what each
 * event carries are decided there, and `native-module` reads them.
 *
 * `api.json` says which families are drawn natively and at what status, and
 * this holds each module's components to the names it gives them.
 */
import { type NativeComponent, readModule } from '../native-module/native-module'

export type {
  NativeComponent,
  NativeEvent,
  NativeField,
  NativeProp,
  NativeRegion,
} from '../native-module/native-module'

/** A family Helix draws natively, and what an app imports to draw it. */
export interface NativeFamily {
  components: NativeComponent[]
  /** The entry the components are imported from, such as `@fusion.dev/helix/tabs`. */
  entry: string
  /** The runtime the components draw with, which exports `HelixRoot`. */
  runtime: string
  slug: string
  /** The family's status on React Native, which can differ from its web status. */
  status: string
}

/** What this reads of `api.json`. */
export interface ApiRecord {
  families: {
    elements: { platforms?: { 'react-native'?: { component: string } }; tagName: string }[]
    platforms?: { 'react-native'?: { status: string } }
    slug: string
  }[]
}

/** What this reads of the package's own manifest. */
export interface PackageRecord {
  exports?: Record<string, unknown>
  name: string
}

/**
 * Every family `api.json` says is drawn on React Native, read from its module
 * in `modules`, by slug. Each family's entry must name a `react-native`
 * condition in `pkg`'s exports, and its module must declare the components
 * `api.json` names, or this throws.
 */
export const nativeFamilies = (
  api: ApiRecord,
  pkg: PackageRecord,
  modules: Readonly<Record<string, string | undefined>>,
): NativeFamily[] =>
  api.families.flatMap((family) => {
    const status = family.platforms?.['react-native']?.status
    if (status === undefined) {
      return []
    }
    const entry = `${pkg.name}/${family.slug}`
    const text = modules[family.slug]
    if (text === undefined) {
      throw new Error(
        `${entry}: api.json says it is drawn natively, and it has no native module. ` +
          '`turbo run build --filter=@fusion.dev/helix` writes them.',
      )
    }
    const conditions = pkg.exports?.[`./${family.slug}`]
    if (typeof conditions !== 'object' || conditions === null || !('react-native' in conditions)) {
      throw new Error(`${entry}: the package exports it with no \`react-native\` condition`)
    }
    const { components, runtime } = readModule(text, entry)
    const named = family.elements
      .flatMap((element) => element.platforms?.['react-native']?.component ?? [])
      .sort()
    const read = components.map((component) => component.name).sort()
    if (named.join() !== read.join()) {
      throw new Error(
        `${entry}: api.json names ${named.join(', ')} and the module declares ${read.join(', ')}`,
      )
    }
    return [{ components, entry, runtime, slug: family.slug, status }]
  })
