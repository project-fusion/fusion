import styles from './chrome.module.css'
/**
 * The Fusion lockup: the mark and the name, set together.
 *
 * One component because it was two. The site header and the sandbox header each
 * assembled the same three pieces by hand, and they had drifted: a `1.5rem` mark
 * beside a `1.25rem` one, and `xs` between mark and name beside `2xs`. Neither
 * was a decision, and nothing would have caught it, because two headers that
 * look nearly the same look fine until they are seen one after the other. A
 * lockup is a fixed relationship between a mark and a name, so the way to keep
 * it fixed is to have one of it.
 *
 * **The mark is `helix-icon`, and used to be a component of its own.** There
 * were two copies of one drawing: a `FusionLogo` here and `fusion.svg` in the
 * icon set, and they drifted exactly as the two headers had. The icon's stops
 * were the slate greys the mark was first exported with, so it was gray
 * everywhere it appeared while this one was blue, and nothing would have caught
 * that either. One drawing, read from one file.
 *
 * **The name carries no `appearance`.** Its type is set in `site.css`, where
 * the note explains why it is mixed case and why it is the size it is: the
 * display face was twice reported as not being applied, and both times it was,
 * and both times there was nothing of it left to see. This is a brand lockup
 * rather than a step in the type scale, so it does not borrow one.
 *
 * No `label` on the mark: the name beside it is the accessible one, so the mark
 * is decoration rather than a second reading of the same word.
 */
export function Wordmark({ size = '1.5rem' }: { size?: string }) {
  return (
    <helix-flex align="center" gap="xs" inline>
      <helix-icon className={styles.fusionLogo} name="fusion" style={{ '--icon-size': size }} />
      <helix-text class={styles.wordmark}>Fusion</helix-text>
    </helix-flex>
  )
}
