/**
 * What a page reads and writes on a Select by its ref, and the hook an element
 * that draws a Select as its control puts it back with.
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

/** What a page reads and writes on a Select by its ref, as on the web element. */
export interface SelectHandle {
  /** The value. Writing it seeds or corrects the choice, and sends no event, as on the web. */
  value: string
}

/**
 * A Select an element draws as its control, put back on `value` after a draw
 * where it moved off it. **The Select takes each pick and closes, and the
 * element decides**, as the web's Pagination Size puts its select back where
 * it refused the size. `asked` draws the element again after a pick, so a
 * refused one is put back; `ref` goes on the Select's view.
 */
export const usePutBack = (value: string) => {
  const select = useRef<SelectHandle | null>(null)
  const [, redraw] = useState(0)
  useLayoutEffect(() => {
    if (select.current !== null && select.current.value !== value) {
      select.current.value = value
    }
  })
  const asked = useCallback(() => redraw((at) => at + 1), [])
  const ref = useCallback((node: SelectHandle | null) => {
    select.current = node
  }, [])
  return { asked, ref }
}
