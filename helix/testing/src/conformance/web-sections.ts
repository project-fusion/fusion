import type { Setup } from './format.js'
import { SECTION_LAYOUT, SECTION_TAG, sectionsOf } from './setup.js'

/**
 * Lays out a setup that holds sections as a phone's harness measures them:
 * the box they scroll in `frame` tall, and each section `section` tall.
 * Answers what takes the layout away again. A setup with no sections is
 * left as it is.
 */
export const laySections = (setup: Setup): (() => void) => {
  if (sectionsOf(setup).length === 0) {
    return () => undefined
  }
  const sheet = document.createElement('style')
  sheet.textContent =
    `${setup.tag} { block-size: ${SECTION_LAYOUT.frame}px; display: block }` +
    ` ${SECTION_TAG} { block-size: ${SECTION_LAYOUT.section}px; overflow: hidden }`
  document.head.append(sheet)
  return () => sheet.remove()
}
