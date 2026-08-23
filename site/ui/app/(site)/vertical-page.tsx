import type { ReactNode } from 'react'
import { stageAppearance, type Vertical } from '../verticals'
import styles from './vertical-page.module.css'

/**
 * The shared frame for a vertical's page.
 *
 * One component rather than four near-identical files, so a change to how a
 * vertical presents itself is one edit. What differs between them is content,
 * which is what `children` is for.
 *
 * **`product` is what a page titles itself when a product fills the vertical.**
 * The masthead says Products and names Helix and Cortex, so a reader who
 * clicks Cortex and lands on a page headed `Fusion Mind` has been handed a
 * division when they asked for a product. Given one, the product is the title
 * and the vertical becomes the eyebrow over it, which is the arrangement
 * `/helix` has used since it was written. Energy and Capital pass nothing,
 * because there is no product in either and inventing an eyebrow to match
 * would be shape for its own sake.
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
    <helix-flex class={`shell ${styles.verticalShell}`} direction="column" gap="xl">
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
        <helix-text as="p" class={styles.lede} tone="muted">
          {product ? product.body : vertical.body}
        </helix-text>
      </helix-flex>
      {children}
    </helix-flex>
  )
}
