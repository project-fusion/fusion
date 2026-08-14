import type { HelixContext, HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'
/**
 * The React prop for an event.
 *
 * `helix-` is stripped and the rest camel-cased, so `helix-open` is `onOpen`
 * and `helix-value-change` is `onValueChange`. A relayed native event keeps its
 * name, so `change` is `onChange`, which is the prop React has already wired to
 * it.
 *
 * The wrapper attaches a real listener for the derived name rather than relying
 * on React to bind it. React reserves every prop matching `on[A-Z]` for its own
 * synthetic system and silently drops the ones it does not recognise, so
 * `onOpen` on a custom element reaches nothing on its own. Measured: only
 * `change`, `input`, `submit`, `reset`, `copy`, `paste`, `scroll`, `drag`,
 * `focus` and `blur` are bound by React itself.
 */
export const toReactProp = (eventName: string): string => {
  const verb = eventName.replace(/^helix-/, '')
  const camel = verb.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase())
  return `on${camel.charAt(0).toUpperCase()}${camel.slice(1)}`
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
