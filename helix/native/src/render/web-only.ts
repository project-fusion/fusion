import type { ComponentType } from 'react'
import { type Family, readable } from '../style/form'
import type { Props } from './behavior'

/**
 * The component of an element only the web has, such as a skip link: it
 * draws nothing. **A universal app's shared screens can write it** for the
 * web, and a phone leaves it out, so it says nothing when it draws nothing.
 *
 * @throws Where `family` is in a major of the intermediate form this runtime
 * does not read.
 */
export const webOnly = (family: Family): ComponentType<Props> => {
  readable(family)
  return Object.assign((_props: Props) => null, { displayName: family.tag, tag: family.tag })
}
