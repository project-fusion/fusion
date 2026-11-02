/**
 * **The sizes a `style` writes on an element**, as an inline style sizes it on the
 * web: `style={{ blockSize: '12rem' }}` on a splitter stands it 12rem tall. The
 * logical names are the height and the width, as text runs across. Any other
 * property in a `style` is left to the element's own props.
 */
import { length } from '../style/apply'
import type { Style } from '../style/resolved'

/** Each size a `style` may write, by the name React Native takes. */
const SIZES: Readonly<Record<string, string>> = {
  blockSize: 'height',
  height: 'height',
  inlineSize: 'width',
  maxBlockSize: 'maxHeight',
  maxHeight: 'maxHeight',
  maxInlineSize: 'maxWidth',
  maxWidth: 'maxWidth',
  minBlockSize: 'minHeight',
  minHeight: 'minHeight',
  minInlineSize: 'minWidth',
  minWidth: 'minWidth',
  width: 'width',
}

/** The sizes `style` writes, in points, or `undefined` where it writes none. */
export const writtenSize = (style: unknown, rem: number): Style | undefined => {
  if (typeof style !== 'object' || style === null) {
    return undefined
  }
  const sizes: Record<string, unknown> = {}
  for (const [name, value] of Object.entries(style)) {
    const size = SIZES[name]
    if (size !== undefined && (typeof value === 'number' || typeof value === 'string')) {
      sizes[size] = length(value as never, rem, rem)
    }
  }
  return Object.keys(sizes).length === 0 ? undefined : (sizes as Style)
}
