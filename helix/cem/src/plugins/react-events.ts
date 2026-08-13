import type { HelixContext, HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'
/**
 * The React prop for an event.
 *
 * `on` plus the event name **verbatim**, because that is exactly what React
 * does: it strips `on` from the prop and listens for the remainder, character
 * for character. Transforming the name here would produce a prop that binds an
 * event nobody dispatches, which is indistinguishable from doing nothing.
 *
 * Event names are PascalCase, so `OpenChange` becomes `onOpenChange`.
 */
export const toReactProp = (eventName: string): string => `on${eventName}`

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
  packageLinkPhase({ context, customElementsManifest }) {
    for (const { declaration } of eachComponent(
      customElementsManifest as HelixManifest,
      context as HelixContext,
    )) {
      for (const event of declaration.events ?? []) {
        event.reactProp = toReactProp(event.name)
      }
    }
  },
})
