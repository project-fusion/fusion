/* The proof page, which `metro.config.ts` resolves to `proof/index.tsx`.
   Its own types are the web's, which `tsconfig.proof.json` checks, so the
   app sees its component, the component's props, and its tabs, no more. */
declare module 'helix-proof' {
  import type { ComponentType } from 'react'

  /** One of a project's tabs. */
  export type Tab = 'activity' | 'overview' | 'settings'

  /** A project's tabs, by their values. */
  export const TABS: readonly Tab[]

  /** The dashboard, open at a project and a tab where they are given. */
  export const Projects: ComponentType<{
    readonly project?: string | undefined
    readonly tab?: Tab | undefined
  }>
}
