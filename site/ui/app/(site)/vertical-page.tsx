import type { ReactNode } from 'react'
import { stageAppearance, type Vertical } from '../verticals'

/**
 * The shared frame for a vertical's page.
 *
 * One component rather than four near-identical files, so a change to how a
 * vertical presents itself is one edit. What differs between them is content,
 * which is what `children` is for.
 */
export function VerticalPage({ children, vertical }: { children?: ReactNode; vertical: Vertical }) {
  return (
    <helix-flex class="shell verticalShell" direction="column" gap="xl">
      <helix-flex direction="column" gap="sm">
        <helix-flex align="center" gap="sm" wrap>
          <helix-text as="h1">{vertical.name}</helix-text>
          <helix-tag appearance={stageAppearance(vertical.stage)} size="sm">
            {vertical.stage}
          </helix-tag>
        </helix-flex>
        <helix-text as="p" class="lede" tone="muted">
          {vertical.body}
        </helix-text>
      </helix-flex>
      {children}
    </helix-flex>
  )
}
