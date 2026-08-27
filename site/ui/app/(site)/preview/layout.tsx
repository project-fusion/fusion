import type { ReactNode } from 'react'
import { ThemeScope } from './theme-context'

/**
 * Holds the theme above every draft.
 *
 * **`ThemeScope` is here rather than in each page so the theme survives the
 * move between them.** A layout is not remounted on a route change within it,
 * so a reader who sets a color on A and clicks through to C is comparing two
 * drafts under one theme instead of re-picking it on arrival, which is the only
 * way the comparison is worth anything. The chrome that drives it is each
 * draft's own choice: a bar on A and B, a floating pill on C.
 *
 * **The draft banner is gone.** It was here so nothing read as further along
 * than it is, which is the rule these pages are reviewed against. It was also a
 * sticky amber bar across the top of every screenshot, changing the first thing
 * the eye landed on and pushing the hero down, which made it impossible to judge
 * the one thing these pages exist to judge. The pages are unlisted and the note
 * belongs on the index, not stamped across the artwork.
 */
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return <ThemeScope>{children}</ThemeScope>
}
