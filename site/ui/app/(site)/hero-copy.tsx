import type { ReactNode } from 'react'
import styles from './hero-copy.module.css'

/**
 * A hero's two lines: the claim, and the sentence under it.
 *
 * **Two elements that are always written together, so they are one component.**
 * The landing page and the aura lab both set an `h1` at the hero size and a
 * muted paragraph on the measure directly beneath it, with the same attributes
 * in the same order. Nothing about either page varies except the words.
 *
 * The lede keeps `measure` from the global vocabulary rather than owning a
 * width of its own: a hero's second line is a column of prose like any other,
 * and it should change when the site's measure does.
 */
export function HeroCopy({ lede, title }: { lede: ReactNode; title: ReactNode }) {
  return (
    <>
      <helix-text as="h1" class={styles.heroTitle}>
        {title}
      </helix-text>
      <helix-text as="p" class={`${styles.heroLede} measure`} tone="muted">
        {lede}
      </helix-text>
    </>
  )
}
