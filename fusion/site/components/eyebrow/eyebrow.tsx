import type { ReactNode } from 'react'
import styles from './eyebrow.module.css'

/**
 * The small label above a heading.
 *
 * **In sentence case, not caps.** Every band opens with one and the diagram
 * carries more inside it, so set as caps at wide tracking they read as competing
 * signs rather than as quiet labels. What makes an eyebrow is the size, the
 * color and the position above a heading, never the case.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className={styles.eyebrow}>{children}</p>
}
