import type { HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'

/**
 * Converts a kebab-case event name to its React prop.
 *
 * `open-change` becomes `onOpenChange`, matching what
 * `@wc-toolkit/react-wrappers` generates.
 */
export const toReactProp = (eventName: string): string => {
  const pascal = eventName
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return `on${pascal}`
}

/**
 * Records the React prop name generated for each event.
 *
 * The mapping is a convention (kebab event to `onFooBar` prop) that is
 * currently implicit in the wrapper generator. Writing it into the manifest
 * makes it inspectable: an agent reading the manifest learns the React API
 * without knowing the generator's rules, and a drift between the documented
 * event and the shipped prop becomes visible in a diff.
 */
export const reactEvents = (): Plugin => ({
  name: 'helix-react-events',
  packageLinkPhase({ customElementsManifest }) {
    for (const { declaration } of eachComponent(customElementsManifest as HelixManifest)) {
      for (const event of declaration.events ?? []) {
        event.reactProp = toReactProp(event.name)
      }
    }
  },
})
