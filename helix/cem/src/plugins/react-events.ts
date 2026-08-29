import type { HelixContext, HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'
/**
 * The React prop for an event.
 *
 * `on` and the event name verbatim, which is how React binds a custom event on
 * a custom element: it strips `on` and listens for exactly what is left. So
 * `helix-open` is `onhelix-open`.
 *
 * Verbatim really is verbatim. `react-dom` slices `on` off the prop and hands
 * the remainder to `addEventListener` without inspecting it, so the hyphens in
 * a name are nothing to it: measured in Chrome against React 19.2.8, `ona-b-c-d`
 * binds exactly as `onhelix-open` does.
 *
 * What no prop survives is hydration. React attaches no custom element listener
 * while hydrating server-rendered markup, whatever it is called, until it
 * commits an update for some other reason. That is React's own bug, filed as
 * facebook/react#35446.
 */
export const toReactProp = (eventName: string): string => `on${eventName}`

/**
 * Records the React prop name generated for each event.
 *
 * The mapping is a convention (the event name prefixed with `on`) that is
 * otherwise implicit. Writing it into the manifest makes it inspectable: an
 * agent reading the manifest learns the React API without deriving it, and a
 * drift between the documented event and the shipped prop becomes visible in a
 * diff.
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
