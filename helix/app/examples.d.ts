/* The web examples the gallery runs, each named `helix-example:<family>/<slug>`,
   which `metro.config.ts` resolves to the `.examples` file of that name in
   `@fusion.dev/helix`. Their own types are the web's, which the styled tier
   checks, so the app sees each as a component and no more. */
declare module 'helix-example:*' {
  import type { ComponentType } from 'react'

  export const Example: ComponentType
}
