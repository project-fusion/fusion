/**
 * A disabled fieldset around a control, which a phone has no element for.
 *
 * **The JSX runtime draws a `<fieldset disabled>` as this context**, and the
 * form controls inside read it as their own `disabled`, as the platform gives
 * a form-associated element `:disabled` on the web. An element that is not
 * form-associated on the web, such as a toggle or a tab, is left alone, as a
 * fieldset leaves it alone there. A radio or a checkbox in a group reads its
 * group's `disabled`.
 */
import { createContext, useContext } from 'react'
import type { Family } from '../style/form'
import type { Props } from './behavior'

/** Whether a disabled fieldset stands around what is drawn. */
export const FieldsetDisabled = createContext(false)

/** The tags of the elements a phone draws that are form-associated on the web. */
const FORM_CONTROLS = new Set([
  'helix-button',
  'helix-checkbox',
  'helix-checkbox-group',
  'helix-color-input',
  'helix-color-picker',
  'helix-copy-button',
  'helix-file-input',
  'helix-icon-button',
  'helix-input',
  'helix-listbox',
  'helix-number-input',
  'helix-pin-input',
  'helix-radio-group',
  'helix-rating',
  'helix-select',
  'helix-slider',
  'helix-switch',
  'helix-textarea',
  'helix-toggle-group',
])

/** The props a control is drawn with: `disabled` where a disabled fieldset stands around it. */
export const useFieldset = (family: Family, props: Props): Props => {
  const held = useContext(FieldsetDisabled)
  return held && props.disabled !== true && FORM_CONTROLS.has(family.tag)
    ? { ...props, disabled: true }
    : props
}
