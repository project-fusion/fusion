import styles from '../chrome.module.css'
/**
 * The Fusion lockup: the mark and the name, set together.
 *
 * One component, because a lockup is a fixed relationship between a mark and a
 * name. Two headers assembling the same pieces by hand drift in sizes and gaps
 * that nothing catches, since two headers that look nearly the same look fine
 * until they are seen one after the other.
 *
 * **The mark is `helix-icon`**, so it is one drawing read from one file. A copy
 * drawn in JSX here drifts from the icon set's own stops, and shows as the mark
 * being one color in the header and another everywhere else.
 *
 * **The name carries no `appearance`.** Its type is set in `site.css`, where
 * the note explains why it is mixed case and why it is the size it is: the
 * display face has twice been reported as not applied when it was. This is a
 * brand lockup rather than a step in the type scale, so it does not borrow
 * one.
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
