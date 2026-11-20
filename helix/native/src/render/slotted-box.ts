/*
 * The box a host's `::slotted(*)` rules give a plain view passed into its
 * region, as the shared JSX runtime's words and boxes draw it.
 */
import { useContext } from 'react'
import type { Style } from '../style/resolved'
import { AroundContext } from './around'
import { split } from './styles'

/**
 * The box style a host's `::slotted(*)` rules give what is passed into the
 * region around, such as a drawer title's margin under it, without the text
 * style, which `useInheritedText` gives. **A Helix element takes it as its
 * host's style**, and a plain `View` or `Text` that wants it reads it here.
 * Outside a region it is empty.
 */
export const useSlottedBox = (): Style => {
  const slotted = useContext(AroundContext)?.children['*']
  return slotted === undefined ? {} : split(slotted.style)[0]
}
