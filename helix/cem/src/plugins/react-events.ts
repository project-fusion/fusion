import type { HelixContext, HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'
/**
 * The React prop for an event.
 *
 * `on` and the event name verbatim, which is how React binds a custom event on
 * a custom element: it strips `on` and listens for exactly what is left. So
 * `helix-open` is `onhelix-open`.
 *
 * Measured against React 19.2.8. It stops at one hyphen: `onhelix-open` binds,
 * `onhelix-value-change` binds nothing at all, which is why no event here
 * carries two. `conventionLint` enforces that.
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
