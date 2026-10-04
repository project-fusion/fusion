/**
 * Types for the Helix custom elements written directly in Solid's JSX.
 *
 * Generated from the same manifest the API pages read, so a wrong attribute or
 * a wrong event detail is a compile error. The Solid flavor of the typings adds
 * `prop:`, `attr:`, and `on:` to every tag, beside the plain props.
 */
import type { CustomElementsSolidJs } from '@fusion.dev/helix/jsx'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements extends CustomElementsSolidJs {}
  }
}
