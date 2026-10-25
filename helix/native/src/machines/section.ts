/**
 * The section machine an element that declares `section` runs, as an
 * Outline Section registers its view for an outline to draw a link for.
 */
import type { MachineUse } from '../ir.generated'
import type { Behavior, Props } from '../render/behavior'
import { useSection } from '../render/sections'
import type { Family } from '../style/form'
import { boundTo, given } from './props'

/**
 * Hosts the section machine: registers the element's own view under the id
 * its `id` prop holds, with the words and the level its props hold, as
 * `useSection` registers a view, while the id is not empty.
 */
export const useSectionOf = (family: Family, props: Props, use: MachineUse): Behavior => {
  const id = given(family, props, boundTo(use, 'id', 'prop'))
  const label = given(family, props, boundTo(use, 'label', 'prop'))
  const level = Number(given(family, props, boundTo(use, 'level', 'prop')))
  const named = typeof id === 'string' ? id : ''
  const ref = useSection(named, {
    label: typeof label === 'string' && label !== '' ? label : named,
    level: Number.isFinite(level) && level >= 1 ? level : 1,
  })
  return { marks: [], parts: named === '' ? {} : { host: { view: { ref } } } }
}
