import { FusionMark } from '@/components/fusion-mark/fusion-mark'
import styles from './wordmark.module.css'
/**
 * The Fusion lockup: the mark and the name, set together.
 */
export function Wordmark({ size = '1.5rem' }: { size?: string }) {
  return (
    <helix-flex align-items="center" gap="xs" inline>
      <FusionMark size={size} />
      <helix-text class={styles.wordmark}>Fusion</helix-text>
    </helix-flex>
  )
}
