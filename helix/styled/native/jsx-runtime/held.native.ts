/* The set elements whose choice a phone holds as the element holds it under
   React, for the tags that draw them. */
import * as React from 'react'
import { HelixButtonGroup } from '../button-group/index.native'
import { HelixList } from '../list/index.native'
import { HelixSteps } from '../steps/index.native'
import { HelixTabs } from '../tabs/index.native'
import { HelixTagGroup } from '../tag/index.native'
import type { Props } from './words.native'

type Heard = { detail?: { value?: unknown }; target?: { value?: unknown } }

/* **A set's choice is held as the element holds it under React.** The
   attribute starts it, a press moves it, and the example setting a new value
   moves it again. Native, the prop is controlled, and a list written
   `value="report"` would never take a press. */
const held = (Target: unknown, chosen: string, after: string, read: (event: Heard) => unknown) => {
  const Held = (props: Props) => {
    const given = props[chosen]
    const [now, setNow] = React.useState(given)
    const last = React.useRef(given)
    if (given !== last.current) {
      last.current = given
      setNow(given)
    }
    const heard = props[after]
    return React.createElement(Target as React.ElementType, {
      ...props,
      [after]: (event: Heard) => {
        setNow(read(event))
        if (typeof heard === 'function') {
          heard(event)
        }
      },
      [chosen]: given === undefined ? undefined : now,
    })
  }
  return Held
}

/* A list's change carries the list's value under `target`, and a tab set's
   activate carries the tab under `detail`, as on the web. So do a button
   group's change and a tag group's. */
export const ButtonGroup = held(
  HelixButtonGroup,
  'value',
  'onChange',
  (event) => event.target?.value,
)
export const List = held(HelixList, 'value', 'onChange', (event) => event.target?.value)
export const Tabs = held(HelixTabs, 'active', 'onActivate', (event) => event.detail?.value)
export const Steps = held(HelixSteps, 'active', 'onActivate', (event) => event.detail?.value)
export const TagGroup = held(HelixTagGroup, 'value', 'onChange', (event) => event.target?.value)
