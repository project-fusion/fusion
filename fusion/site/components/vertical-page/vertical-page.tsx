import type { ReactNode } from 'react'
import { stageAppearance, type Vertical } from '@/content/verticals/verticals'
import styles from './vertical-page.module.css'

/**
 * The shared frame for a vertical's page.
 */
export function VerticalPage({
  children,
  product,
  vertical,
}: {
  children?: ReactNode
  product?: { body: string; name: string; role: string }
  vertical: Vertical
}) {
  return (
    <helix-flex class={styles.verticalShell} data-shell direction="column" gap="xl">
      <helix-flex direction="column" gap="sm">
        {product && (
          <helix-flex align="center" data-density="sm" gap="xs">
            <helix-tag>{vertical.name}</helix-tag>
            <helix-tag tone={stageAppearance(vertical.stage)}>{vertical.stage}</helix-tag>
          </helix-flex>
        )}
        <helix-flex align="center" data-density="sm" gap="sm" wrap>
          <helix-text as="h1">{product ? product.name : vertical.name}</helix-text>
          {/* The stage sits beside the name only when there is no eyebrow
              carrying it, so it is said once either way. */}
          {!product && (
            <helix-tag tone={stageAppearance(vertical.stage)}>{vertical.stage}</helix-tag>
          )}
        </helix-flex>
        <helix-text as="p" class={styles.lede} emphasis="muted">
          {product ? product.body : vertical.body}
        </helix-text>
      </helix-flex>
      {children}
    </helix-flex>
  )
}
