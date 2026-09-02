import type { ReactNode } from 'react'
import styles from './hero-copy.module.css'

/**
 * A hero's two lines: the claim, and the sentence under it.
 */
export function HeroCopy({ lede, title }: { lede: ReactNode; title: ReactNode }) {
  return (
    <>
      <helix-text as="h1" class={styles.heroTitle}>
        {title}
      </helix-text>
      <helix-text as="p" class={styles.heroLede} data-measure tone="muted">
        {lede}
      </helix-text>
    </>
  )
}
