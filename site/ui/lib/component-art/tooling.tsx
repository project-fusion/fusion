import type { ReactNode } from 'react'

/**
 * Gallery art for the families that come from `@helix-io/sandbox`.
 *
 * Their own file because the package is their own: the sandbox is deliberately
 * not the component library, and a reader who notices that `editor` and
 * `sandbox` sit apart here has noticed something true. Nobody reskins a dev
 * tool, so these two are also the only families in the gallery with no headless
 * tier to be abstract about.
 *
 * The system is documented at the top of `core.tsx` and these obey it.
 */
export const toolingArt: Record<string, ReactNode> = {
  /**
   * Source with a gutter and indentation.
   *
   * The gutter rule is what separates this from `textarea`, and the indents
   * going in and back out again are what separate it from `tree`, whose depth
   * only ever increases down the visible rows.
   */
  editor: (
    <>
      <rect className="artFg" fillOpacity="0.09" height="112" width="1" x="64" y="44" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="120" x="80" y="52" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="88" x="100" y="76" />
      <rect className="artFg" fillOpacity="0.28" height="8" rx="4" width="104" x="100" y="100" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="64" x="80" y="124" />
    </>
  ),

  /**
   * Source on one side, what it renders on the other.
   *
   * The divider is the whole idea, so it is the only thing in the frame drawn
   * at full height. The right side holds one control rather than a copy of the
   * left, because a preview is a rendered thing and not more text.
   */
  sandbox: (
    <>
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="80" x="48" y="60" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="64" x="64" y="80" />
      <rect className="artFg" fillOpacity="0.16" height="8" rx="4" width="72" x="48" y="100" />
      <rect className="artFg" fillOpacity="0.16" height="120" width="1" x="160" y="40" />
      <rect className="artFg" fillOpacity="0.09" height="40" rx="4" width="80" x="192" y="80" />
    </>
  ),
}
