import type { HelixManifest, Plugin } from '../types.js'
import { eachComponent } from '../types.js'

/**
 * Drops events the analyzer inferred rather than ones we declared.
 *
 * The analyzer records an event for every `dispatchEvent` call it can see. When
 * the call sits inside a generic helper, the name it records is the *parameter
 * identifier*, not an event name: `HelixElement.emit(name, detail)` yields a
 * phantom event called `name` on every element that inherits it.
 *
 * Helix requires every event to be declared with `@event` on the component that
 * exposes it, precisely because a dispatch inside a mixin or a base helper is
 * not something the analyzer can name correctly. Anything without a description
 * therefore came from inference, not from us.
 *
 * Runs before the convention linter so the linter validates declared events
 * only, and an `@event` tag with an empty description still fails.
 */
export const declaredEvents = (): Plugin => ({
  name: 'helix-declared-events',
  packageLinkPhase({ customElementsManifest }) {
    for (const { declaration } of eachComponent(customElementsManifest as HelixManifest)) {
      if (!declaration.events) {
        continue
      }
      declaration.events = declaration.events.filter((event) => Boolean(event.description?.trim()))
    }
  },
})
