/**
 * A field that joins the stops of the layer around it, as a press does, so a
 * layer that opens moves focus to it where it is the first control, as the web's
 * dialog moves focus to its first field: a palette's filter takes focus as the
 * palette opens, and a phone's keyboard comes up for it.
 */

import { useCallback, useEffect, useRef } from 'react'
import { TextInput, type TextInputProps } from 'react-native'
import { useLayerStops } from './layered'

/** Hands `node` to a ref the field's binding gives, a function or an object. */
const handTo = (ref: unknown, node: unknown): void => {
  if (typeof ref === 'function') {
    ref(node)
  } else if (ref !== null && typeof ref === 'object' && 'current' in ref) {
    ;(ref as { current: unknown }).current = node
  }
}

/** A `TextInput` that is one of the stops of the layer around it. */
export const FieldStop = (props: TextInputProps & { readonly ref?: unknown }) => {
  const scope = useLayerStops()
  const self = useRef({}).current
  const given = props.ref
  const editable = useRef(props.editable)
  editable.current = props.editable
  const seen = useCallback(
    (node: unknown) => {
      scope?.leave(self)
      if (node !== null) {
        scope?.join(self, { disabled: () => editable.current === false, node: () => node })
      }
      handTo(given, node)
    },
    [given, scope, self],
  )
  useEffect(() => () => scope?.leave(self), [scope, self])
  return <TextInput {...props} ref={seen} />
}
